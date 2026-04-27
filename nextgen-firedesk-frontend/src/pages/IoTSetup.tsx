import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle, RefreshCw, Pencil, X, Save } from 'lucide-react';
import { iotApi, IoTDeviceMapping, CreateMappingRequest, DeviceMappingSummary } from '@/services/api/iotApi';
import { usePermissions } from '@/hooks/usePermissions';
import { Entity, Action } from '@/types/permissions';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import { dashboardApi, pumpRoomApi } from '@/services/api/dashboardApi';

interface Plant {
    id: string;
    plantName: string;
}

interface Category {
    id: string;
    categoryName: string;
}

const IoTSetupPage: React.FC = () => {
    const { availablePlants } = usePlantFilter(); // Get plants from context
    const { hasPermission } = usePermissions();
    const canCreate = hasPermission(Entity.PLANTS, Action.CREATE);
    const canDelete = hasPermission(Entity.PLANTS, Action.DELETE);
    const canUpdate = hasPermission(Entity.PLANTS, Action.UPDATE);

    const [selectedPlant, setSelectedPlant] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [availableAssets, setAvailableAssets] = useState<any[]>([]);

    const [mappings, setMappings] = useState<IoTDeviceMapping[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    // Edit state
    const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<{ device_id: string; asset_code: string; data_key: string }>({
        device_id: '',
        asset_code: '',
        data_key: '',
    });

    const [formData, setFormData] = useState<CreateMappingRequest>({
        device_id: '',
        asset_code: '',
        category_id: '',
        plant_id: '',
        data_key: 'AS1',
    });

    // Device mappings summary for validation
    const [deviceSummaries, setDeviceSummaries] = useState<DeviceMappingSummary[]>([]);
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);

    // Set initial selected plant if available
    useEffect(() => {
        console.log('[IoT Setup] Available plants:', availablePlants);
        if (availablePlants.length > 0 && !selectedPlant) {
            console.log('[IoT Setup] Auto-selecting first plant:', availablePlants[0].id);
            setSelectedPlant(availablePlants[0].id);
        }
    }, [availablePlants, selectedPlant]);

    // Load categories when plant changes
    useEffect(() => {
        if (selectedPlant) {
            loadCategories();
        } else {
            setCategories([]);
            setSelectedCategory('');
        }
    }, [selectedPlant]);

    // Load mappings when both plant and category are selected
    useEffect(() => {
        if (selectedPlant && selectedCategory) {
            loadData();
        } else {
            setMappings([]);
            setIsLoading(false); // Ensure loading state is reset if conditions aren't met
        }
    }, [selectedPlant, selectedCategory]);

    const loadCategories = async () => {
        console.log('[IoT Setup] Loading categories for plant:', selectedPlant);

        try {
            const data = await dashboardApi.getCategoriesByPlant(selectedPlant);

            console.log('[IoT Setup] ✅ Categories loaded:', data);
            setCategories(data || []);

            if (data.length > 0 && !selectedCategory) {
                setSelectedCategory(data[0].id); // Auto-select first category
                console.log('[IoT Setup] Auto-selected category:', data[0].categoryName);
            } else if (data.length === 0) {
                setSelectedCategory('');
                console.warn('[IoT Setup] No categories found for this plant');
            }
        } catch (err) {
            console.error('[IoT Setup] ❌ Error loading categories:', err);
            setCategories([]);
            setSelectedCategory('');
        }
    };

    const loadData = async () => {
        console.log('[IoT Setup] loadData called with:', { selectedPlant, categoryId: selectedCategory });

        if (!selectedPlant || !selectedCategory) {
            console.warn('[IoT Setup] Missing required params:', { selectedPlant, categoryId: selectedCategory });
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            console.log('[IoT Setup] Fetching mappings...');
            const mappingsData = await iotApi.getDevicesByPlantCategory(selectedPlant, selectedCategory);
            setMappings(mappingsData);
            console.log(`[IoT Setup] ✅ Loaded ${mappingsData.length} mappings: `, mappingsData);

            // Fetch available assets for the dropdown
            console.log('[IoT Setup] Fetching available assets...');
            const dashboardData = await pumpRoomApi.getPumpDashboardData({ plantId: selectedPlant, categoryId: selectedCategory });
            // The API returns { data: { assets: [...] } } or just { assets: [...] } depending on wrapper
            // Based on previous logs, dashboardApi.getPumpRoomData calls getPumpDashboardData which returns { assets: [] } directly or wrapped
            // Let's handle both just in case, but usually it sits in .assets
            const assets = dashboardData?.assets || dashboardData?.data?.assets || [];
            console.log('[IoT Setup] ✅ Loaded assets:', assets);
            setAvailableAssets(assets);

            // Also load device summaries for validation
            console.log('[IoT Setup] Fetching device summaries...');
            const summaryData = await iotApi.getDeviceMappingsSummary(selectedPlant, selectedCategory);
            console.log('[IoT Setup] ✅ Device summaries loaded:', summaryData);
            setDeviceSummaries(summaryData.devices || []);
        } catch (err) {
            console.error('[IoT Setup] ❌ Error loading data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load IoT data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateMapping = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.device_id || !formData.asset_code || !formData.data_key) {
            setError('Please fill in all required fields');
            return;
        }
        if (!selectedPlant || !selectedCategory) {
            setError('Please select a plant and category before creating a mapping.');
            return;
        }

        try {
            setError(null);
            await iotApi.createMapping({
                ...formData,
                plant_id: selectedPlant,
                category_id: selectedCategory,
            });

            // Reload mappings and summaries
            await loadData();

            // Reset form
            setFormData({
                device_id: '',
                asset_code: '',
                category_id: selectedCategory, // Keep current category selected
                plant_id: selectedPlant, // Keep current plant selected
                data_key: 'AS1',
            });
            setShowAddForm(false);
            setConflictWarning(null); // Clear warning after successful creation

            console.log('[IoT Setup] Mapping created successfully');
        } catch (err) {
            console.error('[IoT Setup] Error creating mapping:', err);
            setError(err instanceof Error ? err.message : 'Failed to create mapping');
        }
    };

    // Check for conflicts when device or data key changes
    useEffect(() => {
        if (!formData.device_id || !formData.data_key) {
            setConflictWarning(null);
            return;
        }

        const deviceSummary = deviceSummaries.find(d => d.device_id === formData.device_id);
        if (!deviceSummary) {
            setConflictWarning(null); // No summary for this device, no conflict
            return;
        }

        const existingMapping = deviceSummary.mappings.find(m => m.data_key === formData.data_key);
        if (existingMapping) {
            setConflictWarning(
                `⚠️ Port ${formData.data_key} on device ${formData.device_id} is already connected to ${existingMapping.asset_code} (${existingMapping.asset_name}). Saving will reassign this port.`
            );
        } else {
            setConflictWarning(null);
        }
    }, [formData.device_id, formData.data_key, deviceSummaries]);

    const handleDeleteMapping = async (mappingId: string) => {
        if (!window.confirm('Are you sure you want to delete this mapping?')) {
            return;
        }

        try {
            setError(null);
            await iotApi.deleteMapping(mappingId);
            await loadData();
            console.log('[IoT Setup] Mapping deleted successfully');
        } catch (err) {
            console.error('[IoT Setup] Error deleting mapping:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete mapping');
        }
    };

    const handleStartEdit = (mapping: IoTDeviceMapping) => {
        setEditingMappingId(mapping.id);
        setEditFormData({
            device_id: mapping.device_id,
            asset_code: mapping.asset_code,
            data_key: mapping.data_key || 'AS1',
        });
    };

    const handleCancelEdit = () => {
        setEditingMappingId(null);
        setEditFormData({ device_id: '', asset_code: '', data_key: '' });
    };

    const handleSaveEdit = async (mappingId: string) => {
        if (!editFormData.device_id || !editFormData.asset_code || !editFormData.data_key) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setError(null);
            await iotApi.updateMapping(mappingId, {
                device_id: editFormData.device_id,
                asset_code: editFormData.asset_code,
                data_key: editFormData.data_key,
            });
            setEditingMappingId(null);
            setEditFormData({ device_id: '', asset_code: '', data_key: '' });
            await loadData();
            console.log('[IoT Setup] Mapping updated successfully');
        } catch (err) {
            console.error('[IoT Setup] Error updating mapping:', err);
            setError(err instanceof Error ? err.message : 'Failed to update mapping');
        }
    };

    // Group mappings by device
    const deviceGroups = mappings.reduce((acc, mapping) => {
        if (!acc[mapping.device_id]) {
            acc[mapping.device_id] = [];
        }
        acc[mapping.device_id].push(mapping);
        return acc;
    }, {} as Record<string, IoTDeviceMapping[]>);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Loading IoT configuration...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">IoT Device Setup</h1>
                <p className="mt-2 text-gray-600">
                    Configure IoT device-to-asset mappings
                </p>
            </div>

            {/* Plant and Category Selectors */}
            <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Plant <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedPlant}
                            onChange={(e) => setSelectedPlant(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">-- Select a Plant --</option>
                            {availablePlants.map((plant) => (
                                <option key={plant.id} value={plant.id}>
                                    {plant.plantName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            disabled={!selectedPlant}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">-- Select a Category --</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.categoryName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                    <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        <span className="text-red-700">{error}</span>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">{Object.keys(deviceGroups).length}</div>
                    <div className="text-sm text-blue-600">IoT Devices</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{mappings.length}</div>
                    <div className="text-sm text-green-600">Asset Mappings</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">
                        {mappings.filter(m => m.asset?.healthStatus === 'Healthy').length}
                    </div>
                    <div className="text-sm text-purple-600">Healthy Assets</div>
                </div>
            </div>

            <div className="mb-6">
                {canCreate && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Device Mapping
                    </button>
                )}
            </div>

            {/* Add Mapping Form */}
            {showAddForm && (
                <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Create New Mapping</h3>
                    <form onSubmit={handleCreateMapping} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Device ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.device_id}
                                    onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                                    placeholder="e.g., DEVICE_TEST_001"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                                <small className="text-gray-500">Unique identifier for the IoT device</small>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Asset Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.asset_code}
                                    onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                                    placeholder="Type or select Asset Code"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                    list="asset-options"
                                />
                                <datalist id="asset-options">
                                    {availableAssets.map((asset: any) => (
                                        <option key={asset.id} value={asset.asset_code}>
                                            {asset.product?.product_name || asset.product?.productName || 'Asset'} - {asset.location}
                                        </option>
                                    ))}
                                </datalist>
                                <small className="text-gray-500">Search by typing Asset Code</small>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data Key <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.data_key}
                                    onChange={(e) => setFormData({ ...formData, data_key: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="AS1">AS1 - Jockey Pump</option>
                                    <option value="AS2">AS2 - Electric Pump</option>
                                    <option value="AS3">AS3 - Diesel Pump</option>
                                </select>
                                <small className="text-gray-500">Which sensor data to use (AS1/AS2/AS3)</small>
                            </div>
                        </div>

                        {/* Conflict Warning Alert */}
                        {conflictWarning && (
                            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                                <div className="flex items-start">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-yellow-800">Port Already In Use</p>
                                        <p className="text-sm text-yellow-700 mt-1">{conflictWarning}</p>
                                        <p className="text-xs text-yellow-600 mt-2">
                                            Make sure this is the correct device and port for your asset. The existing connection will be removed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                                Create Mapping
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Mappings Table - Grouped by Device */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Device Mappings</h2>
                </div>

                {Object.keys(deviceGroups).length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-lg">No device mappings configured</p>
                        <p className="text-sm mt-1">Click "Add Device Mapping" to get started</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {Object.entries(deviceGroups).map(([deviceId, deviceMappings]) => (
                            <div key={deviceId} className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{deviceId}</h3>
                                        <p className="text-sm text-gray-500">{deviceMappings.length} asset(s) mapped</p>
                                    </div>
                                    <div className="flex items-center">
                                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                                        <span className="text-sm text-green-600">Active</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset Code</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset Type</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data Key</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {deviceMappings.map((mapping) => (
                                                <tr key={mapping.id} className="hover:bg-gray-50">
                                                    {editingMappingId === mapping.id ? (
                                                        <>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="text"
                                                                    value={editFormData.asset_code}
                                                                    onChange={(e) => setEditFormData({ ...editFormData, asset_code: e.target.value })}
                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    list="edit-asset-options"
                                                                />
                                                                <datalist id="edit-asset-options">
                                                                    {availableAssets.map((asset: any) => (
                                                                        <option key={asset.id} value={asset.asset_code}>
                                                                            {asset.product?.product_name || asset.product?.productName || 'Asset'} - {asset.location}
                                                                        </option>
                                                                    ))}
                                                                </datalist>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {mapping.asset?.type || 'N/A'}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {mapping.asset?.building?.building_name || 'N/A'} - {mapping.asset?.location || 'N/A'}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <select
                                                                    value={editFormData.data_key}
                                                                    onChange={(e) => setEditFormData({ ...editFormData, data_key: e.target.value })}
                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                >
                                                                    <option value="AS1">AS1 - Jockey Pump</option>
                                                                    <option value="AS2">AS2 - Electric Pump</option>
                                                                    <option value="AS3">AS3 - Diesel Pump</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span
                                                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${mapping.asset?.health_status === 'HEALTHY'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-yellow-100 text-yellow-800'
                                                                    }`}
                                                                >
                                                                    {mapping.asset?.health_status || 'Unknown'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => handleSaveEdit(mapping.id)}
                                                                        className="text-green-600 hover:text-green-800 transition"
                                                                        title="Save changes"
                                                                    >
                                                                        <Save className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCancelEdit}
                                                                        className="text-gray-600 hover:text-gray-800 transition"
                                                                        title="Cancel editing"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                        {mapping.asset_code}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {mapping.asset?.type || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {mapping.asset?.building?.building_name || 'N/A'} - {mapping.asset?.location || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                            {mapping.data_key}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`px-2 py-1 text-xs font-semibold rounded-full ${mapping.asset?.health_status === 'HEALTHY'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                                } `}
                                                        >
                                                            {mapping.asset?.health_status || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            {canUpdate && (
                                                                <button
                                                                    onClick={() => handleStartEdit(mapping)}
                                                                    className="text-blue-600 hover:text-blue-800 transition"
                                                                    title="Edit mapping"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDeleteMapping(mapping.id)}
                                                                className="text-red-600 hover:text-red-800 transition"
                                                                title="Delete mapping"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        </div>
                                                    </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Help Section */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">💡 How It Works</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li><strong>Device ID:</strong> Unique identifier for your IoT device (e.g., DEVICE_TEST_001)</li>
                    <li><strong>Asset Code:</strong> The asset ID this device data should be mapped to</li>
                    <li><strong>Data Key:</strong> Which pump sensor data to use (AS1 = Jockey, AS2 = Electric, AS3 = Diesel)</li>
                    <li><strong>One device can support up to 3 pumps</strong> (AS1, AS2, AS3) in the same pump room</li>
                    <li><strong>WLS/DLS/PLS are shared</strong> by all pumps mapped to the same device</li>
                </ul>
            </div>
        </div>
    );
};

export default IoTSetupPage;

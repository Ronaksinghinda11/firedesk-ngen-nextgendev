// pages/admin/TechniciansPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Pencil, Trash2, Eye, EyeOff, Building2, Search, RefreshCw, Wrench, Users, Tags } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
}

interface Plant {
  id: string;
  plantName: string;
  plantCode?: string;
}

interface Category {
  id: string;
  categoryName: string;
}

interface Manager {
  id: string;
  manager_code: string;
  user: User;
}

interface Vendor {
  id: string;
  vendorName: string;
}

interface Technician {
  id: string;
  technician_code: string;
  user_id: string;
  user: User;
  technician_type: string;
  experience?: string;
  specialization?: string;
  vendor_id?: string;
  status: string;
  plant_assignments: any[];
  manager_assignments: any[];
  category_assignments: any[];
  created_at: string;
}

interface TechnicianFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  technicianType: 'In House' | 'Third Party';
  vendorId: string;
  plantId: string; // For In House (single plant)
  plantIds: string[]; // For Third Party (multiple plants)
  managerIds: string[];
  categoryIds: string[];
  experience: string;
  specialization: string;
  status: string;
}

const initialFormData: TechnicianFormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  technicianType: 'In House',
  vendorId: '',
  plantId: '',
  plantIds: [],
  managerIds: [],
  categoryIds: [],
  experience: '',
  specialization: '',
  status: 'Active',
};

export const TechniciansPage: React.FC = () => {
  const { selectedPlantId } = usePlantFilter();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [formData, setFormData] = useState<TechnicianFormData>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch technicians
  const fetchTechnicians = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedPlantId && selectedPlantId !== 'all' ? `?plant_id=${selectedPlantId}` : '';
      const response = await api.get<{ success: boolean; technicians: Technician[] }>(`/technicians${params}`);
      setTechnicians(response.technicians || []);
    } catch (error: any) {
      console.error('Failed to fetch technicians:', error);
      toast.error('Failed to load technicians');
    } finally {
      setLoading(false);
    }
  }, [selectedPlantId]);

  // Fetch reference data
  const fetchPlants = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; plants: Plant[] }>('/plants');
      setPlants(response.plants || []);
    } catch (error: any) {
      console.error('Failed to fetch plants:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response: any = await api.get('/category/active');
      setCategories(response.activeCategories || response.categories || []);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  const fetchManagers = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; managers: Manager[] }>('/managers');
      setManagers(response.managers || []);
    } catch (error: any) {
      console.error('Failed to fetch managers:', error);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const response: any = await api.get('/vendor/active');
      setVendors(response.vendors || response.activeVendors || []);
    } catch (error: any) {
      console.error('Failed to fetch vendors:', error);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; roles: any[] }>('/roles');
      setRoles(response.roles || []);
    } catch (error: any) {
      console.error('Failed to fetch roles:', error);
    }
  }, []);

  useEffect(() => {
    fetchTechnicians();
    fetchPlants();
    fetchCategories();
    fetchManagers();
    fetchVendors();
    fetchRoles();
  }, [fetchTechnicians, fetchPlants, fetchCategories, fetchManagers, fetchVendors, fetchRoles]);

  // Get Technician role ID
  const getTechnicianRoleId = () => {
    const techRole = roles.find(r => r.name.toLowerCase() === 'technician');
    return techRole?.id;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof TechnicianFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Toggle multi-select
  const toggleSelection = (field: 'plantIds' | 'managerIds' | 'categoryIds', id: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter(i => i !== id)
        : [...prev[field], id],
    }));
  };

  // Open create dialog
  const openCreateDialog = () => {
    setEditingTechnician(null);
    setFormData(initialFormData);
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (tech: Technician) => {
    setEditingTechnician(tech);

    // Extract plant IDs from assignments
    const plantIds = tech.plant_assignments?.map(pa => pa.plant_id) || [];

    // Extract manager IDs from assignments
    const managerIds = tech.manager_assignments?.map(ma => ma.manager_id) || [];

    // Extract category IDs from assignments
    const categoryIds = tech.category_assignments?.map(ca => ca.category_id) || [];

    setFormData({
      name: tech.user?.name || '',
      email: tech.user?.email || '',
      phone: tech.user?.phone || '',
      password: '',
      technicianType: (tech.technician_type as 'In House' | 'Third Party') || 'In House',
      vendorId: tech.vendor_id || '',
      plantId: tech.technician_type === 'In House' ? (plantIds[0] || '') : '',
      plantIds: tech.technician_type === 'Third Party' ? plantIds : [],
      managerIds: managerIds,
      categoryIds: categoryIds,
      experience: tech.experience || '',
      specialization: tech.specialization || '',
      status: tech.status || 'Active',
    });
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email');
      return false;
    }
    if (!editingTechnician && !formData.password) {
      toast.error('Password is required for new technicians');
      return false;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (!formData.technicianType) {
      toast.error('Technician type is required');
      return false;
    }
    if (formData.technicianType === 'In House' && !formData.plantId) {
      toast.error('Plant is required for In House technicians');
      return false;
    }
    if (formData.technicianType === 'Third Party' && formData.plantIds.length === 0) {
      toast.error('At least one plant is required for Third Party technicians');
      return false;
    }
    return true;
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const techRoleId = getTechnicianRoleId();
    if (!techRoleId) {
      toast.error('Technician role not found. Please ensure roles are set up correctly.');
      return;
    }

    try {
      setSubmitting(true);

      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role_id: techRoleId,
        technician_type: formData.technicianType,
        experience: formData.experience,
        specialization: formData.specialization,
        status: formData.status,
        category_ids: formData.categoryIds,
        manager_ids: formData.managerIds,
      };

      if (formData.technicianType === 'In House') {
        payload.plant_id = formData.plantId;
      } else {
        payload.plant_ids = formData.plantIds;
        payload.vendor_id = formData.vendorId;
      }

      if (editingTechnician) {
        // Update technician
        await api.put(`/technicians/${editingTechnician.id}`, payload);
        toast.success('Technician updated successfully');
      } else {
        // Create new technician
        payload.password = formData.password;
        await api.post('/technicians', payload);
        toast.success('Technician created successfully');
      }

      setIsDialogOpen(false);
      fetchTechnicians();
    } catch (error: any) {
      console.error('Failed to save technician:', error);
      toast.error(error.message || 'Failed to save technician');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (tech: Technician) => {
    if (!confirm(`Are you sure you want to delete ${tech.user?.name}?`)) return;

    try {
      await api.delete(`/technicians/${tech.id}`);
      toast.success('Technician deleted successfully');
      fetchTechnicians();
    } catch (error: any) {
      console.error('Failed to delete technician:', error);
      toast.error(error.message || 'Failed to delete technician');
    }
  };

  // Filter technicians by search term
  const filteredTechnicians = technicians.filter(tech => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tech.user?.name?.toLowerCase().includes(searchLower) ||
      tech.user?.email?.toLowerCase().includes(searchLower) ||
      tech.technician_code?.toLowerCase().includes(searchLower)
    );
  });

  // Get names for display
  const getPlantNames = (tech: Technician): string[] => {
    return tech.plant_assignments
      ?.map(pa => plants.find(p => p.id === pa.plant_id)?.plantName)
      .filter(Boolean) as string[] || [];
  };

  const getCategoryNames = (tech: Technician): string[] => {
    return tech.category_assignments
      ?.map(ca => categories.find(c => c.id === ca.category_id)?.categoryName)
      .filter(Boolean) as string[] || [];
  };

  const getManagerNames = (tech: Technician): string[] => {
    return tech.manager_assignments
      ?.map(ma => managers.find(m => m.id === ma.manager_id)?.user?.name)
      .filter(Boolean) as string[] || [];
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold">Technicians</CardTitle>
            <CardDescription>Manage technicians and their assignments</CardDescription>
          </div>
          <Button onClick={openCreateDialog} className="gap-2 bg-orange-500 hover:bg-orange-600">
            <UserPlus className="h-4 w-4" />
            Add Technician
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search and Refresh */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchTechnicians()}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredTechnicians.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No technicians found matching your search' : 'No technicians found. Create one to get started.'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Plants</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTechnicians.map((tech) => (
                    <TableRow key={tech.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {tech.technician_code || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">{tech.user?.name || 'Unknown'}</TableCell>
                      <TableCell>{tech.user?.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={tech.technician_type === 'In House' ? 'default' : 'secondary'}>
                          {tech.technician_type || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-xs">
                          {getPlantNames(tech).slice(0, 2).map((name, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                          {getPlantNames(tech).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{getPlantNames(tech).length - 2}
                            </Badge>
                          )}
                          {getPlantNames(tech).length === 0 && (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-xs">
                          {getCategoryNames(tech).slice(0, 2).map((name, i) => (
                            <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-800">
                              {name}
                            </Badge>
                          ))}
                          {getCategoryNames(tech).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{getCategoryNames(tech).length - 2}
                            </Badge>
                          )}
                          {getCategoryNames(tech).length === 0 && (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tech.status === 'Active' ? 'default' : 'destructive'}>
                          {tech.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(tech.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(tech)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(tech)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTechnician ? 'Edit Technician' : 'Create Technician'}</DialogTitle>
            <DialogDescription>
              {editingTechnician
                ? 'Update technician details and assignments'
                : 'Add a new technician to the system'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email"
                />
              </div>
            </div>

            {/* Phone and Password Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                    handleInputChange('phone', value);
                  }}
                  placeholder="10-digit phone"
                  maxLength={10}
                />
              </div>
              {!editingTechnician && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Min 6 characters"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Technician Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Technician Type <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.technicianType}
                  onValueChange={(value: 'In House' | 'Third Party') => {
                    handleInputChange('technicianType', value);
                    // Reset plant selections when type changes
                    if (value === 'In House') {
                      handleInputChange('plantIds', []);
                      handleInputChange('vendorId', '');
                    } else {
                      handleInputChange('plantId', '');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In House">In House</SelectItem>
                    <SelectItem value="Third Party">Third Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vendor (Third Party only) */}
            {formData.technicianType === 'Third Party' && (
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select
                  value={formData.vendorId}
                  onValueChange={(value) => handleInputChange('vendorId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.vendorName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Plant Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {formData.technicianType === 'In House' ? 'Assign Plant *' : 'Assign Plants *'}
              </Label>
              {formData.technicianType === 'In House' ? (
                <Select
                  value={formData.plantId}
                  onValueChange={(value) => handleInputChange('plantId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((plant) => (
                      <SelectItem key={plant.id} value={plant.id}>
                        {plant.plantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                  {plants.map((plant) => (
                    <label key={plant.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={formData.plantIds.includes(plant.id)}
                        onChange={() => toggleSelection('plantIds', plant.id)}
                        className="h-4 w-4 text-orange-500 rounded"
                      />
                      <span className="text-sm">{plant.plantName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Managers and Categories Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Managers */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assign Managers
                </Label>
                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                  {managers.length === 0 ? (
                    <p className="text-sm text-gray-500">No managers available</p>
                  ) : (
                    managers.map((manager) => (
                      <label key={manager.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={formData.managerIds.includes(manager.id)}
                          onChange={() => toggleSelection('managerIds', manager.id)}
                          className="h-4 w-4 text-orange-500 rounded"
                        />
                        <span className="text-sm">{manager.user?.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Assign Categories
                </Label>
                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-500">No categories available</p>
                  ) : (
                    categories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={formData.categoryIds.includes(category.id)}
                          onChange={() => toggleSelection('categoryIds', category.id)}
                          className="h-4 w-4 text-orange-500 rounded"
                        />
                        <span className="text-sm">{category.categoryName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Experience and Specialization */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Input
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  placeholder="e.g., 5 years"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  placeholder="e.g., Fire Safety"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
              {submitting ? 'Saving...' : editingTechnician ? 'Update Technician' : 'Create Technician'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
// pages/admin/ManagersPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import { TableCell, Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Pencil, Trash2, Eye, EyeOff, Building2, Search, RefreshCw } from 'lucide-react';
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

interface Manager {
  id: string;
  manager_code: string;
  user_id: string;
  user: User;
  plant_assignments: { id: string; plant_id: string }[];
  status: string;
  created_at: string;
}

interface ManagerFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  plantIds: string[];
  status: string;
}

const initialFormData: ManagerFormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  plantIds: [],
  status: 'Active',
};

export const ManagersPage: React.FC = () => {
  const { selectedPlantId } = usePlantFilter();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [formData, setFormData] = useState<ManagerFormData>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch managers
  const fetchManagers = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedPlantId && selectedPlantId !== 'all' ? `?plant_id=${selectedPlantId}` : '';
      const response = await api.get<{ success: boolean; managers: Manager[] }>(`/managers${params}`);
      setManagers(response.managers || []);
    } catch (error: any) {
      console.error('Failed to fetch managers:', error);
      toast.error('Failed to load managers');
    } finally {
      setLoading(false);
    }
  }, [selectedPlantId]);

  // Fetch plants for assignment
  const fetchPlants = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; plants: Plant[] }>('/plants');
      setPlants(response.plants || []);
    } catch (error: any) {
      console.error('Failed to fetch plants:', error);
    }
  }, []);

  // Fetch roles to get Manager role ID
  const fetchRoles = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; roles: any[] }>('/roles');
      setRoles(response.roles || []);
    } catch (error: any) {
      console.error('Failed to fetch roles:', error);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
    fetchPlants();
    fetchRoles();
  }, [fetchManagers, fetchPlants, fetchRoles]);

  // Get Manager role ID
  const getManagerRoleId = () => {
    const managerRole = roles.find(r => r.name.toLowerCase() === 'manager');
    return managerRole?.id;
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
  const handleInputChange = (field: keyof ManagerFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle plant selection toggle
  const togglePlantSelection = (plantId: string) => {
    setFormData(prev => ({
      ...prev,
      plantIds: prev.plantIds.includes(plantId)
        ? prev.plantIds.filter(id => id !== plantId)
        : [...prev.plantIds, plantId],
    }));
  };

  // Open create dialog
  const openCreateDialog = () => {
    setEditingManager(null);
    setFormData(initialFormData);
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (manager: Manager) => {
    setEditingManager(manager);
    setFormData({
      name: manager.user?.name || '',
      email: manager.user?.email || '',
      phone: manager.user?.phone || '',
      password: '',
      plantIds: manager.plant_assignments?.map(pa => pa.plant_id) || [],
      status: manager.status || 'Active',
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
    if (!editingManager && !formData.password) {
      toast.error('Password is required for new managers');
      return false;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const managerRoleId = getManagerRoleId();
    if (!managerRoleId) {
      toast.error('Manager role not found. Please ensure roles are set up correctly.');
      return;
    }

    try {
      setSubmitting(true);

      if (editingManager) {
        // Update manager - use PUT /managers/:id for plant assignments
        await api.put(`/managers/${editingManager.id}`, {
          plant_ids: formData.plantIds,
        });

        // Update user details if changed
        if (formData.name !== editingManager.user?.name ||
          formData.email !== editingManager.user?.email ||
          formData.phone !== editingManager.user?.phone ||
          formData.status !== editingManager.status) {
          await api.put(`/users/${editingManager.user_id}`, {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            status: formData.status,
          });
        }

        toast.success('Manager updated successfully');
      } else {
        // Create new manager
        await api.post('/managers', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role_id: managerRoleId,
          plant_ids: formData.plantIds,
          status: formData.status,
        });

        toast.success('Manager created successfully');
      }

      setIsDialogOpen(false);
      fetchManagers();
    } catch (error: any) {
      console.error('Failed to save manager:', error);
      toast.error(error.message || 'Failed to save manager');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (manager: Manager) => {
    if (!confirm(`Are you sure you want to delete ${manager.user?.name}?`)) return;

    try {
      await api.delete(`/managers/${manager.id}`);
      toast.success('Manager deleted successfully');
      fetchManagers();
    } catch (error: any) {
      console.error('Failed to delete manager:', error);
      toast.error(error.message || 'Failed to delete manager');
    }
  };

  // Filter managers by search term
  const filteredManagers = managers.filter(manager => {
    const searchLower = searchTerm.toLowerCase();
    return (
      manager.user?.name?.toLowerCase().includes(searchLower) ||
      manager.user?.email?.toLowerCase().includes(searchLower) ||
      manager.manager_code?.toLowerCase().includes(searchLower)
    );
  });

  // Get plant names for display
  const getPlantNames = (manager: Manager): string[] => {
    if (!manager.plant_assignments?.length) return [];
    return manager.plant_assignments
      .map(pa => plants.find(p => p.id === pa.plant_id)?.plantName)
      .filter(Boolean) as string[];
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold">Managers</CardTitle>
            <CardDescription>Manage plant managers and their assignments</CardDescription>
          </div>
          <Button onClick={openCreateDialog} className="gap-2 bg-orange-500 hover:bg-orange-600">
            <UserPlus className="h-4 w-4" />
            Add Manager
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
            <Button variant="outline" size="icon" onClick={() => fetchManagers()}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No managers found matching your search' : 'No managers found. Create one to get started.'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white border-b border-gray-100">
                    <TableHead>Manager Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Plants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredManagers.map((manager) => (
                    <TableRow key={manager.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-mono text-sm">
                        {manager.manager_code || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">{manager.user?.name || 'Unknown'}</TableCell>
                      <TableCell>{manager.user?.email || 'N/A'}</TableCell>
                      <TableCell>{manager.user?.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-xs">
                          {getPlantNames(manager).slice(0, 2).map((name, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                          {getPlantNames(manager).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{getPlantNames(manager).length - 2} more
                            </Badge>
                          )}
                          {getPlantNames(manager).length === 0 && (
                            <span className="text-xs text-gray-400">No plants</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={manager.status === 'Active' ? 'default' : 'destructive'}>
                          {manager.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(manager.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(manager)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(manager)}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingManager ? 'Edit Manager' : 'Create Manager'}</DialogTitle>
            <DialogDescription>
              {editingManager
                ? 'Update manager details and plant assignments'
                : 'Add a new manager to the system'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  handleInputChange('phone', value);
                }}
                placeholder="Enter 10-digit phone number"
                maxLength={10}
              />
            </div>

            {/* Password (only for create) */}
            {!editingManager && (
              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter password (min 6 characters)"
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

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
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

            {/* Plant Assignments */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Assign Plants
              </Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {plants.length === 0 ? (
                  <p className="text-sm text-gray-500">No plants available</p>
                ) : (
                  plants.map((plant) => (
                    <label
                      key={plant.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.plantIds.includes(plant.id)}
                        onChange={() => togglePlantSelection(plant.id)}
                        className="h-4 w-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                      />
                      <span className="text-sm">{plant.plantName}</span>
                      {plant.plantCode && (
                        <span className="text-xs text-gray-400">({plant.plantCode})</span>
                      )}
                    </label>
                  ))
                )}
              </div>
              {formData.plantIds.length > 0 && (
                <p className="text-xs text-gray-500">
                  {formData.plantIds.length} plant{formData.plantIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
              {submitting ? 'Saving...' : editingManager ? 'Update Manager' : 'Create Manager'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
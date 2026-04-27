import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package } from 'lucide-react';
import { assetTypeConfig, statusConfig } from '@/data/mockFloorplanAssets';
import type { Asset } from '@/data/mockFloorplanAssets';

interface AssetCreateModalProps {
  isOpen: boolean;
  coordinates: { x: number; y: number };
  layoutId?: string; // Add layoutId prop
  onSave: (assetData: Partial<Asset>) => void;
  onCancel: () => void;
}

interface FormData {
  id: string;
  type: string;
  name: string;
  description: string;
  status: "green" | "yellow" | "red";
}

export const AssetCreateModal: React.FC<AssetCreateModalProps> = ({
  isOpen,
  coordinates,
  layoutId, // Receive layoutId
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<FormData>({
    id: '',
    type: '',
    name: '',
    description: '',
    status: 'green'
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.id.trim()) {
      newErrors.id = 'Asset ID is required';
    } else if (!/^[A-Z]{2}_\d{3}$/.test(formData.id)) {
      newErrors.id = 'Asset ID must follow format: XX_000 (e.g., SD_001)';
    }

    if (!formData.type) {
      newErrors.type = 'Asset type is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Asset name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const assetData: Partial<Asset> = {
      id: formData.id.toUpperCase(),
      type: formData.type,
      name: formData.name,
      x: coordinates.x,
      y: coordinates.y,
      status: formData.status,
      layoutId, // Include layoutId in asset data
      meta: {
        description: formData.description || undefined,
        lastCheck: new Date().toISOString(),
        createdBy: 'admin', // TODO: Get from auth context
        modifiedAt: new Date().toISOString()
      }
    };

    onSave(assetData);

    // Reset form
    setFormData({
      id: '',
      type: '',
      name: '',
      description: '',
      status: 'green'
    });
    setErrors({});
  };

  const handleCancel = () => {
    onCancel();

    // Reset form
    setFormData({
      id: '',
      type: '',
      name: '',
      description: '',
      status: 'green'
    });
    setErrors({});
  };

  const selectedTypeConfig = formData.type ? assetTypeConfig[formData.type as keyof typeof assetTypeConfig] : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create New Asset
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Coordinates Display */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium">Placement Coordinates: </span>
              <span className="text-muted-foreground">
                x: {Math.round(coordinates.x)}, y: {Math.round(coordinates.y)}
              </span>
            </div>
          </div>

          {/* Asset ID */}
          <div className="space-y-2">
            <Label htmlFor="assetId">Asset ID *</Label>
            <Input
              id="assetId"
              placeholder="e.g., SD_001, FE_002"
              value={formData.id}
              onChange={(e) => handleInputChange('id', e.target.value)}
              className={errors.id ? "border-destructive" : ""}
            />
            {errors.id && (
              <p className="text-sm text-destructive">{errors.id}</p>
            )}
          </div>

          {/* Asset Type */}
          <div className="space-y-2">
            <Label htmlFor="assetType">Asset Type *</Label>
            <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
              <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                <SelectValue placeholder="Select asset type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(assetTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type}</p>
            )}
          </div>

          {/* Asset Name */}
          <div className="space-y-2">
            <Label htmlFor="assetName">Asset Name *</Label>
            <Input
              id="assetName"
              placeholder="e.g., Main Lobby Detector"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Initial Status */}
          <div className="space-y-2">
            <Label htmlFor="assetStatus">Initial Status</Label>
            <Select value={formData.status} onValueChange={(value: "green" | "yellow" | "red") => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="assetDescription">Description</Label>
            <Textarea
              id="assetDescription"
              placeholder="Optional description or notes about this asset..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {selectedTypeConfig && (
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="text-lg">{selectedTypeConfig.icon}</div>
              <div className="flex-1">
                <p className="font-medium">{formData.name || 'New Asset'}</p>
                <p className="text-sm text-muted-foreground">{selectedTypeConfig.label}</p>
              </div>
              <Badge
                variant="outline"
                style={{
                  backgroundColor: `${statusConfig[formData.status].color}20`,
                  borderColor: statusConfig[formData.status].color,
                  color: statusConfig[formData.status].color
                }}
              >
                {statusConfig[formData.status].label}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Create Asset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
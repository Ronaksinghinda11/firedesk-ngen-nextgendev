import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface MonitoringStepProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function MonitoringStep({ formData, setFormData }: MonitoringStepProps) {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>(formData.monitoringDocuments || []);
  const [edgeDevice, setEdgeDevice] = useState({
    deviceName: "",
    deviceCode: ""
  });
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);

  useEffect(() => {
    setUploadedFiles(formData.monitoringDocuments || []);
  }, [formData.monitoringDocuments]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const newFile = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: result // Base64 string
        };
        
        const updatedFiles = [...uploadedFiles, newFile];
        setUploadedFiles(updatedFiles);
        setFormData(prev => ({
          ...prev,
          monitoringDocuments: updatedFiles
        }));
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    e.target.value = '';
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter(file => file.id !== fileId);
    setUploadedFiles(updatedFiles);
    setFormData(prev => ({
      ...prev,
      monitoringDocuments: updatedFiles
    }));
  };

  const handleAddEdgeDevice = () => {
    if (!edgeDevice.deviceName.trim() || !edgeDevice.deviceCode.trim()) return;

    if (editingDeviceId) {
      // Update existing device
      setFormData((prev: any) => ({
        ...prev,
        monitoringEdgeDevices: (prev.monitoringEdgeDevices || []).map((d: any) =>
          d.id === editingDeviceId
            ? { ...edgeDevice, id: editingDeviceId }
            : d
        ),
      }));
      setEditingDeviceId(null);
    } else {
      // Add new device
      setFormData((prev: any) => ({
        ...prev,
        monitoringEdgeDevices: [
          ...(prev.monitoringEdgeDevices || []),
          {
            deviceName: edgeDevice.deviceName.trim(),
            deviceCode: edgeDevice.deviceCode.trim(),
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
        ],
      }));
    }

    // Reset form
    setEdgeDevice({ deviceName: "", deviceCode: "" });
  };

  const handleEditDevice = (device: any) => {
    setEdgeDevice({
      deviceName: device.deviceName,
      deviceCode: device.deviceCode,
    });
    setEditingDeviceId(device.id);
  };

  const handleCancelEdit = () => {
    setEdgeDevice({ deviceName: "", deviceCode: "" });
    setEditingDeviceId(null);
  };

  const handleRemoveDevice = (deviceId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      monitoringEdgeDevices: (prev.monitoringEdgeDevices || []).filter(
        (d: any) => d.id !== deviceId
      ),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Multiple Edge Devices Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">FireDesk Edge Devices</h3>
          <p className="text-sm text-muted-foreground">
            Add multiple edge devices for this plant (optional)
          </p>
        </div>

        {/* Add/Edit Device Form */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                placeholder="e.g., Edge Device 1"
                value={edgeDevice.deviceName}
                onChange={(e) => setEdgeDevice(prev => ({
                  ...prev,
                  deviceName: e.target.value
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviceCode">Device Code</Label>
              <Input
                id="deviceCode"
                placeholder="e.g., EDG-001"
                value={edgeDevice.deviceCode}
                onChange={(e) => setEdgeDevice(prev => ({
                  ...prev,
                  deviceCode: e.target.value
                }))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleAddEdgeDevice}
              disabled={!edgeDevice.deviceName.trim() || !edgeDevice.deviceCode.trim()}
            >
              {editingDeviceId ? "Update Device" : "Add Device"}
            </Button>
            {editingDeviceId && (
              <Button
                type="button"
                onClick={handleCancelEdit}
                variant="outline"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Device List */}
        {formData.monitoringEdgeDevices && formData.monitoringEdgeDevices.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Added Devices ({formData.monitoringEdgeDevices.length}):</h4>
            <div className="space-y-2">
              {formData.monitoringEdgeDevices.map((device: any) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{device.deviceName}</p>
                    <p className="text-xs text-muted-foreground">Code: {device.deviceCode}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditDevice(device)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDevice(device.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Location Info */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Location Info</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="monitoringBuilding">Building</Label>
              <Input 
                id="monitoringBuilding" 
                placeholder="e.g., Building 1"
                value={formData.monitoringBuilding || ''}
                onChange={(e) => handleChange('monitoringBuilding', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specificLocation">Specific Location / Area</Label>
              <Input 
                id="specificLocation" 
                placeholder="e.g., Main Pump Room"
                value={formData.specificLocation || ''}
                onChange={(e) => handleChange('specificLocation', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="installationDate">Installation Date</Label>
            <Input 
              id="installationDate" 
              type="date" 
              placeholder="dd/mm/yyyy"
              value={formData.installationDate || ''}
              onChange={(e) => handleChange('installationDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Upload Documents */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Upload Monitoring Documents</h3>
        
        {/* File Upload Area */}
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <input
            type="file"
            id="monitoring-file-upload"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.svg"
            multiple
            onChange={handleFileUpload}
          />
          <label htmlFor="monitoring-file-upload" className="cursor-pointer block">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              <span className="text-primary font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, PNG, JPG, SVG (max. 10mb)
            </p>
          </label>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Uploaded Documents:</h4>
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                    {file.type.includes('pdf') ? (
                      <span className="text-xs font-bold text-primary">PDF</span>
                    ) : file.type.includes('image') ? (
                      <span className="text-xs font-bold text-primary">IMG</span>
                    ) : (
                      <span className="text-xs font-bold text-primary">FILE</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
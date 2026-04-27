import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

interface LayoutUploadStepProps {
  formData: any;
  setFormData: (data: any) => void;
  buildings: any[];
}

export function LayoutUploadStep({
  formData,
  setFormData,
  buildings,
}: LayoutUploadStepProps) {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>(formData.layouts || []);
  const [buildingName, setBuildingName] = useState("");
  const [floorName, setFloorName] = useState("");
  const [wingName, setWingName] = useState("");
  const [svgCoordinates, setSvgCoordinates] = useState({ x: 0, y: 0 });
  const [assetId, setAssetId] = useState("");
  const [health, setHealth] = useState("");
  const [layoutName, setLayoutName] = useState("");

  useEffect(() => {
    // Sync with formData when it changes
    setUploadedFiles(formData.layouts || []);
  }, [formData.layouts]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      // Read file for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const newLayout = {
          id: `layout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: result, // Base64 string for preview
          file: file, // Keep the actual File object
          buildingName: buildingName,
          floorName: floorName,
          wingName: wingName,
          svgCoordinates: svgCoordinates,
          assetId: assetId,
          health: health,
          layoutName: layoutName || file.name,
          layoutType: getLayoutType(file.type),
          layoutUrl: null
        };
    setUploadedFiles(prev => {
      const updatedFiles = [...prev, newLayout];

      setFormData(prevForm => ({
        ...prevForm,
        layouts: updatedFiles,
      }));

      return updatedFiles;
    });



        // Reset form fields after upload
        setBuildingName("");
        setFloorName("");
        setWingName("");
        setSvgCoordinates({ x: 0, y: 0 });
        setAssetId("");
        setHealth("");
        setLayoutName("");
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    e.target.value = '';
  };

  const getLayoutType = (fileType: string) => {
    if (fileType.includes('pdf')) return 'pdf';
    if (fileType.includes('image')) return 'image';
    if (fileType.includes('svg')) return 'svg';
    return 'document';
  };

  const removeLayout = (layoutId: string) => {
    const updatedFiles = uploadedFiles.filter(layout => layout.id !== layoutId);
    setUploadedFiles(updatedFiles);
    setFormData(prev => ({
      ...prev,
      layouts: updatedFiles
    }));
  };

  const updateLayoutField = (layoutId: string, field: string, value: any) => {
    const updatedFiles = uploadedFiles.map(layout => 
      layout.id === layoutId ? { ...layout, [field]: value } : layout
    );
    setUploadedFiles(updatedFiles);
    setFormData(prev => ({
      ...prev,
      layouts: updatedFiles
    }));
  };

  return (
    <div className="space-y-6">
      {/* Layout Name */}
      <div className="space-y-2">
        <Label htmlFor="layoutName">Layout Name</Label>
        <Input
          id="layoutName"
          placeholder="e.g., Floor Plan - Ground Level"
          value={layoutName}
          onChange={(e) => setLayoutName(e.target.value)}
        />
      </div>

      {/* Asset ID */}
      <div className="space-y-2">
        <Label htmlFor="assetId">Asset ID</Label>
        <Input
          id="assetId"
          placeholder="e.g., ASSET-001"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
        />
      </div>

      {/* Location Input Fields */}
      <div className="space-y-2">
        <Label htmlFor="locationSelector">Location Details</Label>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="buildingName">Building</Label>
            <Input
              id="buildingName"
              placeholder="e.g., Main Building"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="floorName">Floor</Label>
            <Input
              id="floorName"
              placeholder="e.g., Ground Floor"
              value={floorName}
              onChange={(e) => setFloorName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wingName">Wing</Label>
            <Input
              id="wingName"
              placeholder="e.g., East Wing"
              value={wingName}
              onChange={(e) => setWingName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SVG Coordinates */}
      <div className="space-y-2">
        <Label>SVG Coordinates</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="xCoordinate">X Coordinate</Label>
            <Input
              id="xCoordinate"
              type="number"
              placeholder="e.g., 100"
              value={svgCoordinates.x}
              onChange={(e) => setSvgCoordinates(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yCoordinate">Y Coordinate</Label>
            <Input
              id="yCoordinate"
              type="number"
              placeholder="e.g., 200"
              value={svgCoordinates.y}
              onChange={(e) => setSvgCoordinates(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className="space-y-2">
        <Label htmlFor="health">Health Status</Label>
        <Select
          value={health}
          onValueChange={setHealth}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Health Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Upload Layout */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Upload Layout</h3>
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <input
            type="file"
            id="layout-file-upload"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.svg,.dwg,.dxf"
            multiple
            onChange={handleFileUpload}
          />
          <label htmlFor="layout-file-upload" className="cursor-pointer block">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              <span className="text-primary font-medium">Click to upload</span> or
              drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, PNG, JPG, SVG, DWG, DXF (max. 10mb)
            </p>
          </label>
        </div>
      </div>

      {/* Uploaded Layouts */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-medium">Uploaded Layouts:</h4>
          {uploadedFiles.map((layout) => (
            <div key={layout.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                    {layout.type && layout.type.includes('pdf') ? (
                      <span className="text-xs font-bold text-primary">PDF</span>
                    ) : layout.type && (layout.type.includes('image') || layout.type.includes('svg')) ? (
                      <span className="text-xs font-bold text-primary">IMG</span>
                    ) : (
                      <span className="text-xs font-bold text-primary">FILE</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{layout.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(layout.size / 1024).toFixed(2)} KB • {layout.layoutType || 'document'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLayout(layout.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Editable fields for each layout */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label htmlFor={`layout-name-${layout.id}`} className="text-xs">Layout Name</Label>
                  <Input
                    id={`layout-name-${layout.id}`}
                    value={layout.layoutName || ''}
                    onChange={(e) => updateLayoutField(layout.id, 'layoutName', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor={`health-${layout.id}`} className="text-xs">Health</Label>
                  <Select
                    value={layout.health || ''}
                    onValueChange={(value) => updateLayoutField(layout.id, 'health', value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select health" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {layout.buildingName || layout.floorName || layout.wingName ? (
                <p className="text-xs text-muted-foreground">
                  {layout.buildingName && `Building: ${layout.buildingName}`}
                  {layout.floorName && ` • Floor: ${layout.floorName}`}
                  {layout.wingName && ` • Wing: ${layout.wingName}`}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LayoutUploadStep;
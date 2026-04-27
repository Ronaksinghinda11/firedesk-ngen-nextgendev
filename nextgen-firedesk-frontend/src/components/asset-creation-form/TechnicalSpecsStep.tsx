import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TechnicalSpecsStepProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function TechnicalSpecsStep({ formData, setFormData }: TechnicalSpecsStepProps) {
  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity *</Label>
          <Input
            id="capacity"
            type="number"
            step="0.01"
            placeholder="e.g., 100"
            value={formData.capacity ?? ""}
            onChange={(e) => handleChange("capacity", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacityUnit">Capacity Unit</Label>
          <Input
            id="capacityUnit"
            placeholder="e.g., Liters, KG"
            value={formData.capacityUnit || ""}
            onChange={(e) => handleChange("capacityUnit", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pressureRating">Pressure Rating</Label>
          <Input
            id="pressureRating"
            placeholder="e.g., 10"
            value={formData.pressureRating || ""}
            onChange={(e) => handleChange("pressureRating", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pressureUnit">Pressure Unit</Label>
          <Select
            value={formData.pressureUnit || ""}
            onValueChange={(value) => handleChange("pressureUnit", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Pressure Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Kg/Cm2">Kg/Cm2</SelectItem>
              <SelectItem value="PSI">PSI</SelectItem>
              <SelectItem value="MWC">MWC</SelectItem>
              <SelectItem value="Bar">Bar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="moc">Material of Construction</Label>
          <Input
            id="moc"
            placeholder="e.g., Stainless Steel"
            value={formData.moc || ""}
            onChange={(e) => handleChange("moc", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="approval">Approval / Standards</Label>
          <Input
            id="approval"
            placeholder="e.g., IS 15683"
            value={formData.approval || ""}
            onChange={(e) => handleChange("approval", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="suctionSize">Suction Size</Label>
          <Input
            id="suctionSize"
            placeholder="e.g., 6 inch"
            value={formData.suctionSize || ""}
            onChange={(e) => handleChange("suctionSize", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="head">Head</Label>
          <Input
            id="head"
            placeholder="e.g., 50m"
            value={formData.head || ""}
            onChange={(e) => handleChange("head", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rpm">RPM</Label>
          <Input
            id="rpm"
            placeholder="e.g., 2900"
            value={formData.rpm || ""}
            onChange={(e) => handleChange("rpm", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mocOfImpeller">MOC of Impeller</Label>
          <Input
            id="mocOfImpeller"
            placeholder="e.g., Bronze"
            value={formData.mocOfImpeller || ""}
            onChange={(e) => handleChange("mocOfImpeller", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuelCapacity">Fuel Capacity</Label>
          <Input
            id="fuelCapacity"
            placeholder="e.g., 100 Liters"
            value={formData.fuelCapacity || ""}
            onChange={(e) => handleChange("fuelCapacity", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="flowInLpm">Flow in LPM</Label>
          <Input
            id="flowInLpm"
            placeholder="e.g., 500"
            value={formData.flowInLpm || ""}
            onChange={(e) => handleChange("flowInLpm", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="housePower">House Power</Label>
          <Input
            id="housePower"
            placeholder="e.g., 5 HP"
            value={formData.housePower || ""}
            onChange={(e) => handleChange("housePower", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fireClass">Fire Class</Label>
          <Input
            id="fireClass"
            placeholder="e.g., ABC"
            value={formData.fireClass || ""}
            onChange={(e) => handleChange("fireClass", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

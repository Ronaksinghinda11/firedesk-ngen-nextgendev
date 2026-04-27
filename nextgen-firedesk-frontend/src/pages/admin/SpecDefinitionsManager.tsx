import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface SpecDefinition {
  id: string;
  categoryId: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  options?: string[];
  order: number;
}

export default function SpecDefinitionsManager() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [specDefinitions, setSpecDefinitions] = useState<SpecDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<SpecDefinition | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    fieldType: "text",
    isRequired: false,
    options: "",
    order: 1,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchSpecDefinitions(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const fetchCategories = async () => {
    try {
      const response: any = await api.get("/master-data/categories");
      if (response.allCategory) {
        setCategories(response.allCategory);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  };

  const fetchSpecDefinitions = async (categoryId: string) => {
    setIsLoading(true);
    try {
      const response: any = await api.get(`/spec-definitions/category/${categoryId}`);
      if (response.success && response.specDefinitions) {
        setSpecDefinitions(response.specDefinitions.sort((a: any, b: any) => a.order - b.order));
      } else {
        setSpecDefinitions([]);
      }
    } catch (error) {
      setSpecDefinitions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (spec?: SpecDefinition) => {
    if (spec) {
      setEditingSpec(spec);
      setFormData({
        label: spec.label,
        fieldType: spec.fieldType,
        isRequired: spec.isRequired,
        options: spec.options?.join(", ") || "",
        order: spec.order,
      });
    } else {
      setEditingSpec(null);
      setFormData({
        label: "",
        fieldType: "text",
        isRequired: false,
        options: "",
        order: specDefinitions.length + 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSpec(null);
    setFormData({
      label: "",
      fieldType: "text",
      isRequired: false,
      options: "",
      order: 1,
    });
  };

  const handleSaveSpec = async () => {
    if (!formData.label || !selectedCategoryId) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      categoryId: selectedCategoryId,
      label: formData.label,
      fieldType: formData.fieldType,
      isRequired: formData.isRequired,
      order: formData.order,
      options: formData.options
        ? formData.options.split(",").map((opt) => opt.trim()).filter((opt) => opt)
        : [],
    };

    try {
      if (editingSpec) {
        await api.put(`/spec-definitions/${editingSpec.id}`, payload);
        toast({ title: "Success", description: "Spec definition updated successfully!" });
      } else {
        await api.post("/spec-definitions", payload);
        toast({ title: "Success", description: "Spec definition created successfully!" });
      }
      fetchSpecDefinitions(selectedCategoryId);
      handleCloseDialog();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingSpec ? "update" : "create"} spec definition`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSpec = async (specId: string) => {
    if (!confirm("Are you sure you want to delete this spec definition?")) {
      return;
    }

    try {
      await api.delete(`/spec-definitions/${specId}`);
      toast({ title: "Success", description: "Spec definition deleted successfully!" });
      fetchSpecDefinitions(selectedCategoryId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete spec definition",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manage Spec Definitions</h1>
        <p className="text-muted-foreground mt-2">
          Define technical specifications for each asset category
        </p>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="category">Select Category</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!selectedCategoryId}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Spec Definition
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : selectedCategoryId ? (
          specDefinitions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Field Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specDefinitions.map((spec) => (
                  <TableRow key={spec.id}>
                    <TableCell>{spec.order}</TableCell>
                    <TableCell className="font-medium">{spec.label}</TableCell>
                    <TableCell className="capitalize">{spec.fieldType}</TableCell>
                    <TableCell>{spec.isRequired ? "Yes" : "No"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {spec.options?.join(", ") || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(spec)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSpec(spec.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No spec definitions found for this category. Click "Add Spec Definition" to create
              one.
            </div>
          )
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Please select a category to view and manage spec definitions.
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {editingSpec ? "Edit Spec Definition" : "Add Spec Definition"}
            </DialogTitle>
            <DialogDescription>
              Define the technical specification field for assets in this category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                placeholder="e.g., Capacity, Fire Class"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldType">Field Type *</Label>
              <Select
                value={formData.fieldType}
                onValueChange={(value) => setFormData({ ...formData, fieldType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Display Order *</Label>
              <Input
                id="order"
                type="number"
                min="1"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
              />
            </div>
            {formData.fieldType === "dropdown" && (
              <div className="space-y-2">
                <Label htmlFor="options">Options (comma-separated)</Label>
                <Input
                  id="options"
                  placeholder="e.g., ABC, BC, CO2"
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isRequired: checked as boolean })
                }
              />
              <Label htmlFor="isRequired" className="text-sm font-medium">
                Required field
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSpec}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {editingSpec ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

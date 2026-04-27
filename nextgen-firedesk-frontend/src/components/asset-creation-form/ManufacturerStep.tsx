import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Eye, Download, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface ManufacturerStepProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ManufacturerStep({ formData, setFormData }: ManufacturerStepProps) {
  const { toast } = useToast();
  const [uploadingDoc1, setUploadingDoc1] = useState(false);
  const [uploadingDoc2, setUploadingDoc2] = useState(false);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loadingManufacturers, setLoadingManufacturers] = useState(false);
  // manufacturerMode removed - now using autocomplete combobox

  // Fetch existing manufacturers
  useEffect(() => {
    const fetchManufacturers = async () => {
      setLoadingManufacturers(true);
      try {
        const response: any = await api.get('/assets/manufacturers');
        setManufacturers(response.data || response.manufacturers || []);
      } catch (error) {
        console.error('Failed to fetch manufacturers:', error);
        // Continue without manufacturers - will allow creating new ones
      } finally {
        setLoadingManufacturers(false);
      }
    };
    fetchManufacturers();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    documentNumber: 1 | 2
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      event.target.value = ""; // Reset input
      return;
    }

    // Validate file type
    const allowedTypes = [".svg", ".png", ".pdf", "image/svg+xml", "image/png", "application/pdf"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension) && !allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only SVG, PNG, and PDF files are allowed",
        variant: "destructive",
      });
      event.target.value = ""; // Reset input
      return;
    }

    // Set uploading state
    if (documentNumber === 1) setUploadingDoc1(true);
    else setUploadingDoc2(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;

        // Store in formData as documents array
        const documents = formData.documents || [];
        const newDocument = {
          documentUrl: base64String,
          description: file.name,
        };

        // Update or add document
        if (documentNumber === 1) {
          documents[0] = newDocument;
        } else {
          documents[1] = newDocument;
        }

        setFormData({ ...formData, documents });

        toast({
          title: "Success",
          description: `Document ${documentNumber} uploaded successfully`,
        });

        if (documentNumber === 1) setUploadingDoc1(false);
        else setUploadingDoc2(false);
      };

      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to read file",
          variant: "destructive",
        });
        if (documentNumber === 1) setUploadingDoc1(false);
        else setUploadingDoc2(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading the file",
        variant: "destructive",
      });
      if (documentNumber === 1) setUploadingDoc1(false);
      else setUploadingDoc2(false);
    }
  };

  const handleViewDocument = (documentIndex: number) => {
    const doc = formData.documents?.[documentIndex];
    if (doc?.documentUrl) {
      // For PDFs, convert to blob to avoid browser security restrictions
      if (doc.documentUrl.startsWith('data:application/pdf')) {
        const base64Data = doc.documentUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        // Clean up the blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        // For images, open directly
        window.open(doc.documentUrl, '_blank');
      }
    }
  };

  const handleDownloadDocument = (documentIndex: number) => {
    const doc = formData.documents?.[documentIndex];
    if (doc?.documentUrl) {
      const link = document.createElement('a');
      link.href = doc.documentUrl;

      // Determine file extension from base64 data
      let extension = 'file';
      if (doc.documentUrl.startsWith('data:image/png')) extension = 'png';
      else if (doc.documentUrl.startsWith('data:image/svg')) extension = 'svg';
      else if (doc.documentUrl.startsWith('data:application/pdf')) extension = 'pdf';

      link.download = `${doc.description || `Document-${documentIndex + 1}`}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: "Your document is being downloaded",
      });
    }
  };

  const handleRemoveDocument = (documentIndex: number) => {
    const documents = [...(formData.documents || [])];
    // Keep array structure intact by setting to undefined instead of splicing
    delete documents[documentIndex];
    setFormData({ ...formData, documents });

    toast({
      title: "Document removed",
      description: "The document has been removed",
    });
  };

  const getFileTypeFromBase64 = (base64: string | undefined) => {
    if (!base64) return 'Document';
    if (base64.startsWith('data:image/png')) return 'PNG Image';
    if (base64.startsWith('data:image/svg')) return 'SVG Image';
    if (base64.startsWith('data:application/pdf')) return 'PDF Document';
    return 'Document';
  };

  // Filtered manufacturers based on input
  const [filteredManufacturers, setFilteredManufacturers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(formData.manufacturerName || '');

  // Update filtered list when typing
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = manufacturers.filter(m =>
        m.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredManufacturers(filtered);
    } else {
      setFilteredManufacturers(manufacturers);
    }
  }, [inputValue, manufacturers]);

  // Sync input value with formData
  useEffect(() => {
    if (formData.manufacturerName !== inputValue) {
      setInputValue(formData.manufacturerName || '');
    }
  }, [formData.manufacturerName]);

  const handleManufacturerSelect = (manufacturer: any) => {
    setInputValue(manufacturer.name);
    setFormData((prev: any) => ({
      ...prev,
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.name,
      createManufacturer: false
    }));
    setShowSuggestions(false);
  };

  const handleManufacturerInputChange = (value: string) => {
    setInputValue(value);
    const match = manufacturers.find(m => m.name.toLowerCase() === value.toLowerCase());
    if (match) {
      setFormData((prev: any) => ({
        ...prev,
        manufacturerId: match.id,
        manufacturerName: match.name,
        createManufacturer: false
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        manufacturerId: null,
        manufacturerName: value,
        createManufacturer: value.trim().length > 0
      }));
    }
  };

  return (
    <div className="grid grid-cols-12 gap-3">
      {/* Manufacturer Autocomplete */}
      <div className="col-span-4 space-y-1">
        <Label>Manufacturer</Label>
        <div className="relative">
          <Input
            placeholder="Type to search or add new..."
            value={inputValue}
            onChange={(e) => handleManufacturerInputChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="h-9 text-sm bg-gray-50"
            autoComplete="off"
          />
          {showSuggestions && filteredManufacturers.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
              {filteredManufacturers.map((manufacturer) => (
                <div
                  key={manufacturer.id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                  onMouseDown={() => handleManufacturerSelect(manufacturer)}
                >
                  {manufacturer.name}
                </div>
              ))}
            </div>
          )}
        </div>
        {inputValue.trim() && !manufacturers.find(m => m.name.toLowerCase() === inputValue.toLowerCase()) && (
          <p className="text-[10px] text-blue-600">
            New manufacturer "{inputValue}" will be created on save
          </p>
        )}
      </div>

      {/* Model */}
      <div className="col-span-4 space-y-1">
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          placeholder="e.g., XYZ-1000"
          value={formData.model || ""}
          onChange={(e) => handleChange("model", e.target.value)}
          className="h-9 text-sm bg-gray-50"
        />
      </div>

      {/* Serial Number */}
      <div className="col-span-4 space-y-1">
        <Label htmlFor="slNo">SL No / Part No</Label>
        <Input
          id="slNo"
          placeholder="e.g., SN12345"
          value={formData.slNo || ""}
          onChange={(e) => handleChange("slNo", e.target.value)}
          className="h-9 text-sm bg-gray-50"
        />
      </div>

      {/* Document 1 */}
      <div className="col-span-6 space-y-1 mt-2">
        <Label htmlFor="document1">Document 1</Label>
        <Input
          id="document1"
          type="file"
          accept=".svg,.png,.pdf"
          onChange={(e) => handleDocumentUpload(e, 1)}
          disabled={uploadingDoc1}
          className="h-9 text-sm bg-gray-50 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
        <p className="text-[10px] text-gray-500">
          {uploadingDoc1 ? "Uploading..." : "svg, png, pdf (max. 10mb)"}
        </p>
        {formData.documents?.[0] && formData.documents[0].documentUrl && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">
                  {formData.documents[0].description}
                </p>
                <p className="text-[10px] text-green-600">
                  {getFileTypeFromBase64(formData.documents[0].documentUrl)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleViewDocument(0)}
                className="h-6 text-xs px-2"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleDownloadDocument(0)}
                className="h-6 text-xs px-2"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => handleRemoveDocument(0)}
                className="h-6 text-xs px-2"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Document 2 */}
      <div className="col-span-6 space-y-1 mt-2">
        <Label htmlFor="document2">Document 2</Label>
        <Input
          id="document2"
          type="file"
          accept=".svg,.png,.pdf"
          onChange={(e) => handleDocumentUpload(e, 2)}
          disabled={uploadingDoc2}
          className="h-9 text-sm bg-gray-50 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
        <p className="text-[10px] text-gray-500">
          {uploadingDoc2 ? "Uploading..." : "svg, png, pdf (max. 10mb)"}
        </p>
        {formData.documents?.[1] && formData.documents[1].documentUrl && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">
                  {formData.documents[1].description}
                </p>
                <p className="text-[10px] text-green-600">
                  {getFileTypeFromBase64(formData.documents[1].documentUrl)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleViewDocument(1)}
                className="h-6 text-xs px-2"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleDownloadDocument(1)}
                className="h-6 text-xs px-2"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => handleRemoveDocument(1)}
                className="h-6 text-xs px-2"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

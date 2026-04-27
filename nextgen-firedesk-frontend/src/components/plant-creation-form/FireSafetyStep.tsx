// FireSafetyStep.tsx - Fixed alignment
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Info, Eye, CalendarIcon } from "lucide-react";
import React, { useState, useEffect, FormEvent } from "react";
import { vendorService, Vendor } from "@/services/vendor.service";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FireSafetyStepProps { formData: any; setFormData: (data: any) => void; }

const SubSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="border border-gray-200 rounded-md p-2 shadow-sm bg-white h-full">
    <h4 className="text-sm font-semibold text-gray-900 mb-2 pb-1 border-b border-gray-100">{title}</h4>
    <div className="">{children}</div>
  </div>
);

export function FireSafetyStep({ formData, setFormData }: FireSafetyStepProps) {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  useEffect(() => {
    const docs = formData.fireSafetyDocuments || [];
    console.log("FireSafetyStep: Loaded docs", docs);
    if (docs.length > 0 && uploadedFiles.length === 0) setUploadedFiles(docs);
  }, [formData.fireSafetyDocuments]);

  useEffect(() => {
    vendorService.getActiveVendors()
      .then((r) => { if (r.success && r.vendors) setVendors(r.vendors); })
      .catch(() => { })
      .finally(() => setLoadingVendors(false));
  }, []);

  const handleChange = (field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value }));

  // Prevent negative numeric input
  const clampNonNegative = (e: FormEvent<HTMLInputElement>) => {
    const val = Number(e.currentTarget.value);
    if (val < 0) e.currentTarget.value = '0';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    setFileSizeError(null);
    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        setFileSizeError(`"${file.name}" is too large. Maximum allowed size is 2MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const newFile = { id: Date.now().toString(), name: file.name, type: file.type, size: file.size, data: evt.target?.result };
        setUploadedFiles((prev) => [...prev, newFile]);
        setFormData((prev: any) => ({ ...prev, fireSafetyDocuments: [...(prev.fireSafetyDocuments || []), newFile] }));
      };
      reader.readAsDataURL(file);
    });
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleViewDocument = (file: any) => {
    const dataUrl = file.data || file.url || (file.storagePath ? `${window.location.origin}/${file.storagePath}` : null);
    if (dataUrl) {
      window.open(dataUrl, '_blank');
    } else {
      console.error("No valid data URL for document", file);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    setFormData((prev: any) => ({ ...prev, fireSafetyDocuments: prev.fireSafetyDocuments?.filter((f: any) => f.id !== fileId) || [] }));
  };

  return (
    <div className="space-y-4">
      {/* 1. Water Storage & Pressure */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
          <SubSection title="Storage & Pressure">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6 space-y-1"><Label className="text-sm font-medium">Main Reservoir (L)</Label><Input type="number" min="0" placeholder="15000" value={formData.primeOverTankCapacity || ""} onChange={(e) => handleChange("primeOverTankCapacity", e.target.value)} onInput={clampNonNegative} className="h-9 text-sm" /></div>
              <div className="col-span-6 space-y-1"><Label className="text-sm font-medium">Terrace Tank (L)</Label><Input type="number" min="0" placeholder="10000" value={formData.terraceTankCapacity || ""} onChange={(e) => handleChange("terraceTankCapacity", e.target.value)} onInput={clampNonNegative} className="h-9 text-sm" /></div>
              <div className="col-span-4 space-y-1"><Label className="text-sm font-medium">Diesel Tank 1 (L)</Label><Input type="number" min="0" placeholder="8000" value={formData.diesel1TankCapacity || ""} onChange={(e) => handleChange("diesel1TankCapacity", e.target.value)} onInput={clampNonNegative} className="h-9 text-sm" /></div>
              <div className="col-span-4 space-y-1"><Label className="text-sm font-medium">Diesel Tank 2 (L)</Label><Input type="number" min="0" placeholder="6000" value={formData.diesel2TankCapacity || ""} onChange={(e) => handleChange("diesel2TankCapacity", e.target.value)} onInput={clampNonNegative} className="h-9 text-sm" /></div>
              <div className="col-span-4 space-y-1"><Label className="text-sm font-medium">Header Pressure</Label><Input type="number" min="0" placeholder="7" value={formData.headerPressureBar || ""} onChange={(e) => handleChange("headerPressureBar", e.target.value)} onInput={clampNonNegative} className="h-9 text-sm" /></div>
            </div>
          </SubSection>
        </div>

        <div className="col-span-6">
          <SubSection title="Safety, Power & Commissioning">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6 space-y-1"><Label className="text-sm font-medium">Diesel Engine</Label><Input placeholder="1000" value={formData.dieselEngine || ""} onChange={(e) => handleChange("dieselEngine", e.target.value)} className="h-9 text-sm" /></div>
              <div className="col-span-6 space-y-1"><Label className="text-sm font-medium">Electrical Pump</Label><Input placeholder="1000" value={formData.electricalPump || ""} onChange={(e) => handleChange("electricalPump", e.target.value)} className="h-9 text-sm" /></div>
              <div className="col-span-6 space-y-1"><Label className="text-sm font-medium">Jockey Pump</Label><Input placeholder="1000" value={formData.jockeyPump || ""} onChange={(e) => handleChange("jockeyPump", e.target.value)} className="h-9 text-sm" /></div>
              <div className="col-span-6 space-y-1">
                <Label className="text-sm font-medium">Commission Date</Label>
                <Popover open={datePickerOpen} onOpenChange={(open) => {
                  setDatePickerOpen(open);
                  if (open) setTempDate(formData.systemCommissionDate ? new Date(formData.systemCommissionDate) : undefined);
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-9 justify-start text-left font-normal text-sm",
                        !formData.systemCommissionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.systemCommissionDate ? (
                        format(new Date(formData.systemCommissionDate), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tempDate}
                      onSelect={setTempDate}
                      initialFocus
                    />
                    <div className="flex items-center justify-end gap-2 p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTempDate(formData.systemCommissionDate ? new Date(formData.systemCommissionDate) : undefined);
                          setDatePickerOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          handleChange("systemCommissionDate", tempDate ? format(tempDate, "yyyy-MM-dd") : "");
                          setDatePickerOpen(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </SubSection>
        </div>
      </div>

      {/* 6. Documents */}
      <SubSection title="Safety Documents">
        <p className="text-xs text-gray-500 mb-1">* Please upload documents up to 2 MB. Supported formats: PDF, PNG, JPG, JPEG.</p>
        <p className="text-xs text-gray-400 mb-2">Maximum file size allowed: 2MB</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <input type="file" id="fire-safety-upload" className="hidden" accept=".pdf,.png,.jpg,.jpeg" multiple onChange={handleFileUpload} />
            <label htmlFor="fire-safety-upload" className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-md cursor-pointer hover:border-gray-500 hover:bg-gray-50 text-sm text-gray-600 transition-colors"><Upload className="h-4 w-4" />Click to Upload</label>
          </div>
          {fileSizeError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              ⚠ File size is too large. {fileSizeError}
            </div>
          )}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {uploadedFiles.map((file) => (
                <span key={file.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <div className="flex items-center gap-1 border-l border-blue-200 pl-2 ml-1">
                    {(file.data || file.url || file.storagePath) && (
                      <button type="button" onClick={() => handleViewDocument(file)} className="text-blue-600 hover:text-blue-900 p-0.5 rounded hover:bg-blue-100" title="View Document">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50" title="Remove Document">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </span>
              ))}
            </div>
          )}
        </div>
      </SubSection>
    </div>
  );
}
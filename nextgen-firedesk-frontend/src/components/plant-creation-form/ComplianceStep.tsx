// ComplianceStep.tsx - Fixed alignment (6 equal cols)
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Eye, CalendarIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ComplianceStepProps { formData: any; setFormData: (data: any) => void; }

const SubSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="border border-gray-200 rounded-md p-2 shadow-sm bg-white h-full">
    <h4 className="text-sm font-semibold text-gray-900 mb-2 pb-1 border-b border-gray-100">{title}</h4>
    <div className="">{children}</div>
  </div>
);

export function ComplianceStep({ formData, setFormData }: ComplianceStepProps) {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [insDatePickerOpen, setInsDatePickerOpen] = useState(false);
  const [insTempDate, setInsTempDate] = useState<Date | undefined>(undefined);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  // Sync uploadedFiles with formData.complianceDocuments
  useEffect(() => {
    const docs = formData.complianceDocuments || [];
    if (docs.length > 0 && uploadedFiles.length === 0) {
      setUploadedFiles(docs);
    }
  }, [formData.complianceDocuments]);

  const handleChange = (field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value }));

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
        setFormData((prev: any) => ({ ...prev, complianceDocuments: [...(prev.complianceDocuments || []), newFile] }));
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
    setFormData((prev: any) => ({ ...prev, complianceDocuments: prev.complianceDocuments?.filter((f: any) => f.id !== fileId) || [] }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
          {/* 1. Fire Compliance */}
          <SubSection title="Fire Compliance">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6 space-y-1"><Label className="text-sm font-medium">Fire NOC Number</Label><Input placeholder="NOC-DEL-2024" value={formData.fireNocNumber || ""} onChange={(e) => handleChange("fireNocNumber", e.target.value)} className="h-9 text-sm" /></div>
              <div className="col-span-6 space-y-1">
                <Label className="text-sm font-medium">NOC Validity Date</Label>
                <Popover open={datePickerOpen} onOpenChange={(open) => {
                  setDatePickerOpen(open);
                  if (open) setTempDate(formData.fireNocValidityDate ? new Date(formData.fireNocValidityDate) : undefined);
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-9 justify-start text-left font-normal text-sm",
                        !formData.fireNocValidityDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.fireNocValidityDate ? (
                        format(new Date(formData.fireNocValidityDate), "PPP")
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
                          setTempDate(formData.fireNocValidityDate ? new Date(formData.fireNocValidityDate) : undefined);
                          setDatePickerOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          handleChange("fireNocValidityDate", tempDate ? format(tempDate, "yyyy-MM-dd") : "");
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

        <div className="col-span-6">
          {/* 2. Insurance Details */}
          <SubSection title="Insurance Details">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4 space-y-1"><Label className="text-sm font-medium">Insurance Policy No</Label><Input placeholder="INS-XYZ-2024" value={formData.insurancePolicyNumber || ""} onChange={(e) => handleChange("insurancePolicyNumber", e.target.value)} className="h-9 text-sm" /></div>
              <div className="col-span-4 space-y-1"><Label className="text-sm font-medium">Insurer Name</Label><Input placeholder="ICICI Lombard" value={formData.insurerName || ""} onChange={(e) => handleChange("insurerName", e.target.value)} className="h-9 text-sm" /></div>
              <div className="col-span-4 space-y-1">
                <Label className="text-sm font-medium">Validity Date</Label>
                <Popover open={insDatePickerOpen} onOpenChange={(open) => {
                  setInsDatePickerOpen(open);
                  if (open) setInsTempDate(formData.insuranceValidityDate ? new Date(formData.insuranceValidityDate) : undefined);
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-9 justify-start text-left font-normal text-sm",
                        !formData.insuranceValidityDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.insuranceValidityDate ? (
                        format(new Date(formData.insuranceValidityDate), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={insTempDate}
                      onSelect={setInsTempDate}
                      initialFocus
                    />
                    <div className="flex items-center justify-end gap-2 p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setInsTempDate(formData.insuranceValidityDate ? new Date(formData.insuranceValidityDate) : undefined);
                          setInsDatePickerOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          handleChange("insuranceValidityDate", insTempDate ? format(insTempDate, "yyyy-MM-dd") : "");
                          setInsDatePickerOpen(false);
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

      {/* 3. Installed Safety Equipment (Compliance) */}
      <SubSection title="Installed Safety Equipment (Compliance)">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-3 space-y-1"><Label className="text-sm font-medium">Fire Extinguishers</Label><Input type="number" placeholder="15" value={formData.complianceNumExtinguishers ?? ""} onChange={(e) => handleChange("complianceNumExtinguishers", e.target.value)} className="h-9 text-sm" /></div>
          <div className="col-span-3 space-y-1"><Label className="text-sm font-medium">Hydrant Points</Label><Input type="number" placeholder="2" value={formData.complianceNumHydrants ?? ""} onChange={(e) => handleChange("complianceNumHydrants", e.target.value)} className="h-9 text-sm" /></div>
          <div className="col-span-3 space-y-1"><Label className="text-sm font-medium">Sprinklers</Label><Input type="number" placeholder="15" value={formData.complianceNumSprinklers ?? ""} onChange={(e) => handleChange("complianceNumSprinklers", e.target.value)} className="h-9 text-sm" /></div>
          <div className="col-span-3 space-y-1"><Label className="text-sm font-medium">Safe Assembly Areas</Label><Input type="number" placeholder="2" value={formData.complianceNumSafeAreas ?? ""} onChange={(e) => handleChange("complianceNumSafeAreas", e.target.value)} className="h-9 text-sm" /></div>
        </div>
      </SubSection>

      {/* 4. Documents */}
      <SubSection title="Compliance Documents">
        <p className="text-xs text-gray-500 mb-1">* Please upload documents up to 2 MB. Supported formats: PDF, PNG, JPG, JPEG.</p>
        <p className="text-xs text-gray-400 mb-2">Maximum file size allowed: 2MB</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <input type="file" id="compliance-upload" className="hidden" accept=".pdf,.png,.jpg,.jpeg" multiple onChange={handleFileUpload} />
            <label htmlFor="compliance-upload" className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-md cursor-pointer hover:border-gray-500 hover:bg-gray-50 text-sm text-gray-600 transition-colors"><Upload className="h-4 w-4" />Click to Upload</label>
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
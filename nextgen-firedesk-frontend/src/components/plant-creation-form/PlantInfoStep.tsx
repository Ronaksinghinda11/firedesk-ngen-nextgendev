// PlantInfoStep.tsx - Fixed chip display and alignment
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Organization } from "@/types/organization.types";
import React, { useState } from "react";
import { Country, State, City } from "country-state-city";
import { X } from "lucide-react";

interface PlantInfoStepProps {
  formData: any;
  setFormData: (cb: any) => void;
  masterData?: any;
  organization?: Organization | null;
}

const SubSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="border border-orange-200 rounded-lg p-2 shadow-sm bg-white h-full hover:shadow-md transition-shadow">
    <h4 className="text-sm font-semibold text-gray-900 mb-2 px-2 py-1 bg-gray-50 rounded-t-lg -mx-2 -mt-2 border-b border-orange-200">{title}</h4>
    <div className="px-1">{children}</div>
  </div>
);

export function PlantInfoStep({ formData, setFormData, masterData, organization }: PlantInfoStepProps) {
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("IN");
  const [selectedStateCode, setSelectedStateCode] = useState<string>("");

  const countries = Country.getAllCountries();
  const states = selectedCountryCode ? State.getStatesOfCountry(selectedCountryCode) : [];
  const cities = selectedStateCode ? City.getCitiesOfState(selectedCountryCode, selectedStateCode) : [];

  // Initialize country to India if not set
  React.useEffect(() => {
    if (!formData.country && selectedCountryCode === "IN") {
      const indiaName = Country.getCountryByCode("IN")?.name || "India";
      setFormData((prev: any) => ({ ...prev, country: indiaName }));
    }
  }, []);

  React.useEffect(() => {
    if (formData.country) {
      const countryObj = countries.find(c => c.name.toLowerCase() === formData.country.toLowerCase());
      if (countryObj && selectedCountryCode !== countryObj.isoCode) setSelectedCountryCode(countryObj.isoCode);
    }
  }, [formData.country, countries]);

  React.useEffect(() => {
    if (formData.state && selectedCountryCode) {
      const stateObj = states.find(s => s.name.toLowerCase() === formData.state.toLowerCase());
      if (stateObj && selectedStateCode !== stateObj.isoCode) setSelectedStateCode(stateObj.isoCode);
    }
  }, [formData.state, selectedCountryCode, states]);

  React.useEffect(() => {
    if (formData.city && cities.length > 0) {
      const cityObj = cities.find((c: any) => c.name.toLowerCase() === formData.city.toLowerCase());
      if (cityObj && cityObj.name !== formData.city) setFormData((prev: any) => ({ ...prev, city: cityObj.name }));
    }
  }, [formData.city, cities]);

  const handleChange = (field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value }));

  const handleCountryChange = (value: string) => {
    setSelectedCountryCode(value);
    handleChange("country", Country.getCountryByCode(value)?.name || "");
    setSelectedStateCode("");
    handleChange("state", "");
    handleChange("city", "");
  };

  const handleStateChange = (value: string) => {
    setSelectedStateCode(value);
    handleChange("state", State.getStateByCodeAndCountry(value, selectedCountryCode)?.name || "");
    handleChange("city", "");
  };

  const handleManagerToggle = (managerId: string) => {
    setFormData((prev: any) => {
      const curr = prev.managerIds || [];
      return { ...prev, managerIds: curr.includes(managerId) ? curr.filter((id: string) => id !== managerId) : [...curr, managerId] };
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData((prev: any) => {
      const curr = prev.categoryIds || [];
      return { ...prev, categoryIds: curr.includes(categoryId) ? curr.filter((id: string) => id !== categoryId) : [...curr, categoryId] };
    });
  };

  // Get manager/category names
  const getManagerName = (id: string) => {
    const m = masterData?.managers?.find((mgr: any) => String(mgr.id) === String(id));
    if (!m) return null;
    return m.user?.name || m.name || (m.firstName ? `${m.firstName} ${m.lastName}` : null);
  };

  const getCategoryName = (id: string) => {
    const c = masterData?.categories?.find((cat: any) => String(cat.id) === String(id));
    return c?.categoryName || c?.category_name || c?.name || null;
  };

  const managers = masterData?.managers || [];

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* 1. Organization Details */}
      <div className="col-span-12">
        <SubSection title="Organization Details">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-sm text-gray-600">Organization Name</Label>
              <Input value={organization?.organizationName || ""} disabled className="h-9 text-sm bg-gray-50 text-gray-600" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-sm text-gray-600">Organization Code</Label>
              <Input value={organization?.organizationCode || ""} disabled className="h-9 text-sm bg-gray-50 text-gray-600" />
            </div>
            <div className="col-span-4 space-y-1">
              <Label className="text-sm text-gray-600">Organization Address</Label>
              <Input value={organization?.address || ""} disabled className="h-9 text-sm bg-gray-50 text-gray-600" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-sm text-gray-600">Organization State</Label>
              <Input value={organization?.state || ""} disabled className="h-9 text-sm bg-gray-50 text-gray-600" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-sm text-gray-600">Organization City</Label>
              <Input value={organization?.city || ""} disabled className="h-9 text-sm bg-gray-50 text-gray-600" />
            </div>
          </div>
        </SubSection>
      </div>

      {/* 2. Plant Basic Details */}
      <div className="col-span-8">
        <SubSection title="Plant Basic Details">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3 space-y-1">
              <Label className="text-sm font-medium">Plant Name <span className="text-red-500">*</span></Label>
              <Input id="field-plantName" placeholder="Factory A" value={formData.plantName || ""} onChange={(e) => handleChange("plantName", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-sm font-medium">Industry</Label>
              <Select value={formData.industryId ? String(formData.industryId) : ""} onValueChange={(v) => handleChange("industryId", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(masterData?.industries || []).map((ind: any) => <SelectItem key={ind.id} value={String(ind.id)}>{ind.industryName || ind.industry_name || ind.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-sm font-medium">GST Number</Label>
              <Input placeholder="22AAAAA0000A1Z5" value={formData.gstNo || ""} onChange={(e) => handleChange("gstNo", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-sm font-medium">Country <span className="text-red-500">*</span></Label>
              <Select value={selectedCountryCode} onValueChange={handleCountryChange}>
                <SelectTrigger id="field-country" className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{countries.map((c) => <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Row 2 */}
            <div className="col-span-4 space-y-1">
              <Label className="text-sm font-medium">Address <span className="text-red-500">*</span></Label>
              <Input id="field-address" placeholder="Street address" value={formData.address || ""} onChange={(e) => handleChange("address", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-sm font-medium">State <span className="text-red-500">*</span></Label>
              <Select value={selectedStateCode} onValueChange={handleStateChange} disabled={!selectedCountryCode}>
                <SelectTrigger id="field-state" className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{states.map((s) => <SelectItem key={s.isoCode} value={String(s.isoCode)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-sm font-medium">City <span className="text-red-500">*</span></Label>
              <Select value={formData.city || ""} onValueChange={(v) => handleChange("city", v)} disabled={!selectedStateCode}>
                <SelectTrigger id="field-city" className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{cities.map((c: any) => <SelectItem key={c.name} value={String(c.name)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-sm font-medium">Zip Code</Label>
              <Input 
                placeholder="123456" 
                value={formData.zipCode || ""} 
                onChange={(e) => {
                  const numericOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                  handleChange("zipCode", numericOnly);
                }} 
                maxLength={6}
                inputMode="numeric"
                className="h-9 text-sm" 
              />
            </div>
          </div>
        </SubSection>
      </div>

      {/* 4. Responsibility & Classification */}
      <div className="col-span-4">
        <SubSection title="Responsibility & Classification">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 space-y-1">
              <Label className="text-sm font-medium">Plant Manager(s)</Label>
              <Select value="" onValueChange={(v) => v && !formData.managerIds?.includes(v) && handleManagerToggle(v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select Manager(s)" /></SelectTrigger>
                <SelectContent>{managers.filter((m: any) => !formData.managerIds?.includes(String(m.id))).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.user?.name || m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim()}</SelectItem>)}</SelectContent>
              </Select>
              {formData.managerIds?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.managerIds.map((id: string) => {
                    const name = getManagerName(id);
                    if (!name) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs">
                        {name}
                        <button type="button" onClick={() => handleManagerToggle(id)} className="text-orange-500 hover:text-orange-700"><X className="h-3 w-3" /></button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="col-span-12 space-y-1">
              <Label className="text-sm font-medium">Categories</Label>
              <Select value="" onValueChange={(v) => v && !formData.categoryIds?.includes(v) && handleCategoryToggle(v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select Categories" /></SelectTrigger>
                <SelectContent>{(masterData?.categories || []).filter((c: any) => !formData.categoryIds?.includes(String(c.id))).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.categoryName || c.category_name || c.name}</SelectItem>)}</SelectContent>
              </Select>
              {formData.categoryIds?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.categoryIds.map((id: string) => {
                    const name = getCategoryName(id);
                    if (!name) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs">
                        {name}
                        <button type="button" onClick={() => handleCategoryToggle(id)} className="text-gray-500 hover:text-gray-700"><X className="h-3 w-3" /></button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SubSection>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Organization, OrganizationFormData } from "@/types/organization.types";
import { organizationService } from "@/services/organization.service";
import { toast } from "sonner";
import { State, City, Country } from "country-state-city";

interface OrganizationFormProps {
  existingOrganization?: Organization | null;
  onSuccess?: (organization: Organization) => void;
  onCancel?: () => void;
}

export function OrganizationForm({
  existingOrganization,
  onSuccess,
  onCancel,
}: OrganizationFormProps) {
  const [formData, setFormData] = useState<OrganizationFormData>({
    organizationName: "",
    address: "",
    gstNumber: "",
    country: "India",
    state: "",
    city: "",
  });

  // State for ISO Codes to drive logic
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("IN");
  const [selectedStateCode, setSelectedStateCode] = useState<string>("");

  const [loading, setLoading] = useState(false);

  // Derived data based on selections
  const countries = Country.getAllCountries();
  const states = selectedCountryCode ? State.getStatesOfCountry(selectedCountryCode) : [];

  // Calculate cities with fallback for missing library data
  const cities = React.useMemo(() => {
    let cityList = selectedCountryCode && selectedStateCode
      ? City.getCitiesOfState(selectedCountryCode, selectedStateCode)
      : [];

    // Ensure the existing city is in the list (fallback for missing library data)
    if (formData.city && !cityList.some(c => c.name === formData.city)) {
      cityList = [...cityList, {
        name: formData.city,
        countryCode: selectedCountryCode,
        stateCode: selectedStateCode,
        latitude: "",
        longitude: ""
      }];
    }

    console.log('[Cities Debug] stateCode:', selectedStateCode, 'formData.city:', formData.city, 'cities count:', cityList.length, 'cities:', cityList.map(c => c.name));
    return cityList;
  }, [selectedCountryCode, selectedStateCode, formData.city]);

  const isEditMode = !!existingOrganization;

  // Pre-fill form if editing
  useEffect(() => {
    if (existingOrganization) {
      console.log('Pre-filling Organization Form:', existingOrganization);

      const orgCountry = (existingOrganization.country || "India").trim();
      const orgState = (existingOrganization.state || "").trim();
      const orgCity = (existingOrganization.city || "").trim();

      // 1. Find Country Code
      const countryObj = countries.find(c => c.name.toLowerCase() === orgCountry.toLowerCase())
        || countries.find(c => c.isoCode === "IN");
      const countryCode = countryObj?.isoCode || "IN";

      // 2. Find State Code (dependent on Country)
      let stateCode = "";
      if (countryCode && orgState) {
        const possibleStates = State.getStatesOfCountry(countryCode);
        const stateObj = possibleStates.find(s => s.name.toLowerCase() === orgState.toLowerCase());
        stateCode = stateObj?.isoCode || "";
      }

      // Set codes first
      setSelectedCountryCode(countryCode);
      setSelectedStateCode(stateCode);

      // Now set form data (city will be properly populated because stateCode is set)
      setFormData({
        organizationName: existingOrganization.organizationName || "",
        address: existingOrganization.address || "",
        gstNumber: existingOrganization.gstNumber || "",
        country: orgCountry,
        state: orgState,
        city: orgCity,
        organizationCode: existingOrganization.organizationCode
      });

      console.log('Set countryCode:', countryCode, 'stateCode:', stateCode, 'city:', orgCity);
    }
  }, [existingOrganization]);

  const handleChange = (field: keyof OrganizationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (value: string) => {
    // value is isoCode
    setSelectedCountryCode(value);
    const countryObj = Country.getCountryByCode(value);
    handleChange("country", countryObj?.name || "");

    // Reset State and City
    setSelectedStateCode("");
    handleChange("state", "");
    handleChange("city", "");
  };

  const handleStateChange = (value: string) => {
    // value is isoCode
    setSelectedStateCode(value);
    const stateObj = State.getStateByCodeAndCountry(value, selectedCountryCode);
    handleChange("state", stateObj?.name || "");

    // Reset City
    handleChange("city", "");
  };

  const handleCityChange = (value: string) => {
    // value is city name (from our SelectItem)
    handleChange("city", value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.organizationName?.trim()) {
      toast.error("Organization name is required");
      return;
    }

    if (!formData.address?.trim()) {
      toast.error("Address is required");
      return;
    }

    if (!formData.country) {
      toast.error("Country is required");
      return;
    }

    if (!formData.state) {
      toast.error("State is required");
      return;
    }

    if (!formData.city) {
      toast.error("City is required");
      return;
    }

    setLoading(true);

    try {
      let response;
      if (isEditMode && existingOrganization) {
        response = await organizationService.updateOrganization(
          existingOrganization.id,
          formData
        );
        toast.success("Organization updated successfully");
      } else {
        response = await organizationService.createOrganization(formData);
        toast.success("Organization created successfully");
      }

      if (response.success && response.data && onSuccess) {
        onSuccess(response.data);
      }
    } catch (error: any) {
      console.error("Error saving Organization:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save Organization";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="organizationName">
            Organization <span className="text-red-500">*</span>
          </Label>
          <Input
            id="organizationName"
            placeholder="Enter Organization name"
            value={formData.organizationName}
            onChange={(e) => handleChange("organizationName", e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">
            Address <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="address"
            placeholder="Enter Organization address"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            required
            disabled={loading}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="countryId">
              Country <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedCountryCode}
              onValueChange={handleCountryChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.isoCode} value={country.isoCode}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label htmlFor="stateId">
              State <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedStateCode}
              onValueChange={handleStateChange}
              disabled={loading || !selectedCountryCode}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedCountryCode ? "Select State" : "Select Country first"} />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state.isoCode} value={state.isoCode}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* City - Full Width */}
        <div className="space-y-2">
          <Label htmlFor="cityId">
            City <span className="text-red-500">*</span>
          </Label>
          <Select
            key={`city-${selectedStateCode}-${cities.length}`}
            value={formData.city}
            onValueChange={handleCityChange}
            disabled={loading || !selectedStateCode}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedStateCode ? "Select City" : "Select State first"} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.name} value={city.name}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* GST No (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="gstNumber">GST Number (Optional)</Label>
          <Input
            id="gstNumber"
            placeholder="Enter GST number"
            value={formData.gstNumber || ""}
            onChange={(e) => handleChange("gstNumber", e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
          {loading
            ? "Saving..."
            : isEditMode
              ? "Update Organization"
              : "Create Organization"}
        </Button>
      </div>
    </form>
  );
}

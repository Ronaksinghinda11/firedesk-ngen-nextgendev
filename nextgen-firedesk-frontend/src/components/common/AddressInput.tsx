import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Country, State, City } from "country-state-city";

interface AddressInputProps {
    country?: string;
    state?: string;
    city?: string;
    zipcode?: string;
    addressLines?: string;
    onChange: (field: string, value: string) => void;
    errors?: Record<string, string>;
    readOnly?: boolean;
}

export function AddressInput({
    country,
    state,
    city,
    zipcode,
    addressLines,
    onChange,
    errors = {},
    readOnly = false,
}: AddressInputProps) {
    const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");
    const [selectedStateCode, setSelectedStateCode] = useState<string>("");

    const countries = Country.getAllCountries();
    const states = selectedCountryCode
        ? State.getStatesOfCountry(selectedCountryCode)
        : [];
    const cities = selectedStateCode
        ? City.getCitiesOfState(selectedCountryCode, selectedStateCode)
        : [];

    useEffect(() => {
        if (country) {
            const countryObj = countries.find(
                (c) => c.name.toLowerCase() === country.toLowerCase()
            );
            if (countryObj && selectedCountryCode !== countryObj.isoCode) {
                setSelectedCountryCode(countryObj.isoCode);
            }
        }
    }, [country, countries]);

    useEffect(() => {
        if (state && selectedCountryCode) {
            const stateObj = states.find(
                (s) => s.name.toLowerCase() === state.toLowerCase()
            );
            if (stateObj && selectedStateCode !== stateObj.isoCode) {
                setSelectedStateCode(stateObj.isoCode);
            }
        }
    }, [state, selectedCountryCode, states]);

    const handleCountryChange = (value: string) => {
        if (readOnly) return;
        const countryName = Country.getCountryByCode(value)?.name || "";
        setSelectedCountryCode(value);
        onChange("country", countryName);
        setSelectedStateCode("");
        onChange("state", "");
        onChange("city", "");
    };

    const handleStateChange = (value: string) => {
        if (readOnly) return;
        const stateName =
            State.getStateByCodeAndCountry(value, selectedCountryCode)?.name || "";
        setSelectedStateCode(value);
        onChange("state", stateName);
        onChange("city", "");
    };

    const handleCityChange = (value: string) => {
        if (readOnly) return;
        console.log('🏙️ AddressInput - City selected:', value);
        onChange("city", value);
        console.log('✅ AddressInput - Called onChange("city", "' + value + '")');
    };

    return (
        <div className="space-y-4">
            {/* Address Lines */}
            <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Address</Label>
                <Input
                    value={addressLines || ""}
                    onChange={(e) => onChange("address", e.target.value)}
                    placeholder="Street address, P.O. box, etc."
                    className={`h-9 text-sm ${errors.address ? "border-red-500" : ""}`}
                    readOnly={readOnly}
                />
                {errors.address && (
                    <p className="text-[10px] text-red-500">{errors.address}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Country */}
                <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                        Country <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={selectedCountryCode}
                        onValueChange={handleCountryChange}
                        disabled={readOnly}
                    >
                        <SelectTrigger className={`h-9 text-sm ${errors.country ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent>
                            {countries.map((c) => (
                                <SelectItem key={c.isoCode} value={c.isoCode}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.country && (
                        <p className="text-[10px] text-red-500">{errors.country}</p>
                    )}
                </div>

                {/* State */}
                <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                        State <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={selectedStateCode}
                        onValueChange={handleStateChange}
                        disabled={!selectedCountryCode || readOnly}
                    >
                        <SelectTrigger className={`h-9 text-sm ${errors.state ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                            {states.map((s) => (
                                <SelectItem key={s.isoCode} value={s.isoCode}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.state && (
                        <p className="text-[10px] text-red-500">{errors.state}</p>
                    )}
                </div>

                {/* City */}
                <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">City</Label>
                    <Select
                        value={city || ""}
                        onValueChange={handleCityChange}
                        disabled={!selectedStateCode || readOnly}
                    >
                        <SelectTrigger className={`h-9 text-sm ${errors.city ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent>
                            {cities.map((c) => (
                                <SelectItem key={c.name} value={c.name}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Zipcode */}
                <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                        Zip Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={zipcode || ""}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            onChange("zipcode", val);
                        }}
                        placeholder="Zip Code"
                        className={`h-9 text-sm ${errors.zipcode ? "border-red-500" : ""}`}
                        readOnly={readOnly}
                    />
                    {errors.zipcode && (
                        <p className="text-[10px] text-red-500">{errors.zipcode}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

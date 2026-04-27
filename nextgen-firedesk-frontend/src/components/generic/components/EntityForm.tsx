// src/components/generic/components/EntityForm.tsx
// Extracted from GenericEntityPage.tsx - renderFormField logic

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { EntityField } from "../types/entity.types";

interface EntityFormProps {
    fields: EntityField[];
    formData: Record<string, any>;
    onFormDataChange: (data: Record<string, any>) => void;
    isLocked?: boolean;
    additionalFields?: React.ReactNode;
}

/**
 * Form fields renderer component.
 * Extracted from GenericEntityPage.tsx renderFormField logic
 */
export function EntityForm({
    fields,
    formData,
    onFormDataChange,
    isLocked = false,
    additionalFields,
}: EntityFormProps) {
    const renderFormField = (field: EntityField) => {
        const value = formData[field.name] ?? "";

        switch (field.type) {
            case "text":
                return (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Input
                            id={field.name}
                            value={value}
                            onChange={(e) =>
                                onFormDataChange({ ...formData, [field.name]: e.target.value })
                            }
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            required={field.required}
                            disabled={isLocked}
                        />
                    </div>
                );

            case "textarea":
                return (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Textarea
                            id={field.name}
                            value={value}
                            onChange={(e) =>
                                onFormDataChange({ ...formData, [field.name]: e.target.value })
                            }
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            required={field.required}
                            disabled={isLocked}
                            rows={3}
                        />
                    </div>
                );

            case "select":
                // Handle reference data with id/name pairs
                const options = field.referenceData || field.options || [];
                const isReferenceData =
                    options.length > 0 &&
                    typeof options[0] === "object" &&
                    options[0] !== null;

                return (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Select
                            value={String(value || "")}
                            onValueChange={(val) =>
                                onFormDataChange({ ...formData, [field.name]: val })
                            }
                            disabled={isLocked}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {isReferenceData
                                    ? (options as Array<{ id: string; name?: string }>).map(
                                        (opt) => (
                                            <SelectItem key={opt.id} value={opt.id}>
                                                {opt.name ||
                                                    (opt as any).stateName ||
                                                    (opt as any).categoryName ||
                                                    (opt as any).cityName ||
                                                    (opt as any).serviceName ||
                                                    (opt as any).formName ||
                                                    opt.id}
                                            </SelectItem>
                                        )
                                    )
                                    : (options as string[]).map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                            {opt}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            {fields.map(renderFormField)}
            {additionalFields}
        </div>
    );
}

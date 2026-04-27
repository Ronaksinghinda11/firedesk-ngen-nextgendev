// src/components/generic/components/EntityWizard.tsx
// Extracted from GenericEntityPage.tsx - Lines 4600-4722

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardStep, EntityConfig } from "../types/entity.types";
import { cn } from "@/lib/utils";

interface EntityWizardProps {
    config: EntityConfig;
    wizardSteps: WizardStep[];
    currentStep: string;
    formData: Record<string, any>;
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<string>>;
    onNext: () => Promise<void>;
    onPrev: () => void;
    onSubmit: () => void;
    isLastStep: boolean;
    isFirstStep: boolean;
}

/**
 * Wizard step navigation and form component.
 * Extracted from GenericEntityPage.tsx lines 4600-4722
 */
export function EntityWizard({
    config,
    wizardSteps,
    currentStep,
    formData,
    setFormData,
    setCurrentStep,
    onNext,
    onPrev,
    onSubmit,
    isLastStep,
    isFirstStep,
}: EntityWizardProps) {
    const currentStepIndex = wizardSteps.findIndex(
        (step) => step.id === currentStep
    );

    return (
        <div className="space-y-6">
            {/* Wizard Step Indicators */}
            <div className="flex items-center justify-center mb-8">
                {wizardSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                        {/* Step Circle */}
                        <div
                            className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors cursor-pointer",
                                currentStep === step.id
                                    ? "bg-orange-500 border-orange-500 text-white"
                                    : index < currentStepIndex
                                        ? "bg-green-500 border-green-500 text-white"
                                        : "bg-white border-gray-300 text-gray-500"
                            )}
                            onClick={() => {
                                // Only allow clicking on completed steps
                                if (index < currentStepIndex) {
                                    setCurrentStep(step.id);
                                }
                            }}
                        >
                            {index < currentStepIndex ? (
                                <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            ) : (
                                index + 1
                            )}
                        </div>

                        {/* Step Label */}
                        <div className="ml-2 mr-4">
                            <p
                                className={cn(
                                    "text-sm font-medium",
                                    currentStep === step.id ? "text-orange-600" : "text-gray-500"
                                )}
                            >
                                {step.name}
                            </p>
                            {step.description && (
                                <p className="text-xs text-gray-400">{step.description}</p>
                            )}
                        </div>

                        {/* Connector Line */}
                        {index < wizardSteps.length - 1 && (
                            <ChevronRight className="w-5 h-5 text-gray-300 mr-4" />
                        )}
                    </div>
                ))}
            </div>

            {/* Wizard Step Content */}
            <div className="min-h-[300px]">
                {config.renderWizardStep &&
                    config.renderWizardStep(
                        currentStep,
                        formData,
                        setFormData,
                        currentStep,
                        setCurrentStep
                    )}
            </div>

            {/* Wizard Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
                <Button
                    variant="outline"
                    onClick={onPrev}
                    disabled={isFirstStep}
                >
                    Previous
                </Button>

                {isLastStep ? (
                    <Button
                        onClick={onSubmit}
                        className="bg-green-500 hover:bg-green-600"
                    >
                        Submit
                    </Button>
                ) : (
                    <Button
                        onClick={onNext}
                        className="bg-orange-500 hover:bg-orange-600"
                    >
                        Save & Continue
                    </Button>
                )}
            </div>
        </div>
    );
}

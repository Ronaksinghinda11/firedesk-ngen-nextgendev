// src/components/generic/hooks/useEntityWizard.ts
// Extracted from GenericEntityPage.tsx - Lines 239-240, 269, 409-420, 739-800

import { useState, useEffect, useRef, useCallback } from "react";
import { WizardStep, EntityConfig } from "../types/entity.types";

interface UseEntityWizardProps {
    config: EntityConfig;
    formData: Record<string, any>;
}

interface UseEntityWizardReturn {
    currentStep: string;
    setCurrentStep: React.Dispatch<React.SetStateAction<string>>;
    wizardSteps: WizardStep[];
    justChangedStepRef: React.MutableRefObject<boolean>;
    nextStep: () => Promise<void>;
    prevStep: () => void;
    isLastStep: boolean;
    isFirstStep: boolean;
    resetWizard: () => void;
}

/**
 * Hook for managing wizard step navigation.
 * Extracted from GenericEntityPage.tsx lines 239-240, 269, 409-420, 739-800
 */
export function useEntityWizard({
    config,
    formData,
}: UseEntityWizardProps): UseEntityWizardReturn {
    const [currentStep, setCurrentStep] = useState<string>("");
    const [wizardSteps, setWizardSteps] = useState<WizardStep[]>([]);
    const justChangedStepRef = useRef(false);

    // Initialize wizard - only run once when component mounts or when wizard steps are first defined
    useEffect(() => {
        if (
            config.wizardSteps &&
            config.wizardSteps.length > 0 &&
            wizardSteps.length === 0
        ) {
            console.log("🎬 Initializing wizard steps:", config.wizardSteps);
            setWizardSteps(config.wizardSteps);
            setCurrentStep(config.wizardSteps[0].id);
        }
    }, [config.wizardSteps, wizardSteps.length]);

    const nextStep = useCallback(async () => {
        console.log("🔄 nextStep called");
        console.log("🔄 Current step:", currentStep);
        console.log("🔄 Wizard steps:", wizardSteps);
        console.log("🔄 Form data:", formData);

        try {
            if (config.onWizardNext) {
                const canProceed = await config.onWizardNext(currentStep, formData);
                console.log("🔄 onWizardNext returned:", canProceed);
                if (!canProceed) {
                    console.log("⛔ Cannot proceed - validation failed");
                    return;
                }
            }

            const currentIndex = wizardSteps.findIndex(
                (step) => step.id === currentStep
            );
            console.log(
                "🔄 Current index:",
                currentIndex,
                "Total steps:",
                wizardSteps.length
            );

            if (currentIndex < wizardSteps.length - 1) {
                const nextStepId = wizardSteps[currentIndex + 1].id;
                console.log("✅ Moving to next step:", nextStepId);

                // Set flag to prevent immediate submission
                justChangedStepRef.current = true;
                console.log("🚫 Set justChangedStepRef to TRUE");

                setCurrentStep(nextStepId);
                console.log("✅ setCurrentStep called with:", nextStepId);

                // Clear flag after a short delay
                setTimeout(() => {
                    justChangedStepRef.current = false;
                    console.log("✅ Cleared justChangedStepRef to FALSE");
                }, 500);
            } else {
                console.log("⚠️ Already on last step, cannot proceed");
            }
        } catch (error) {
            console.error("❌ Error in nextStep:", error);
        }
    }, [currentStep, wizardSteps, formData, config]);

    const prevStep = useCallback(() => {
        if (config.onWizardBack) {
            config.onWizardBack(currentStep);
        }

        const currentIndex = wizardSteps.findIndex(
            (step) => step.id === currentStep
        );
        if (currentIndex > 0) {
            setCurrentStep(wizardSteps[currentIndex - 1].id);
        }
    }, [currentStep, wizardSteps, config]);

    const resetWizard = useCallback(() => {
        if (wizardSteps.length > 0) {
            setCurrentStep(wizardSteps[0].id);
        }
    }, [wizardSteps]);

    const isLastStep = currentStep === wizardSteps[wizardSteps.length - 1]?.id;
    const isFirstStep = currentStep === wizardSteps[0]?.id;

    return {
        currentStep,
        setCurrentStep,
        wizardSteps,
        justChangedStepRef,
        nextStep,
        prevStep,
        isLastStep,
        isFirstStep,
        resetWizard,
    };
}

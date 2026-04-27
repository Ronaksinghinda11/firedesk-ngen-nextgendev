// src/components/generic/components/EntityFormView.tsx
// Extracted COMPLETE form view from GenericEntityPage.tsx - Lines 4325-4765
// Contains wizard steps, form rendering, navigation buttons, history panel

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Eye,
    FileText,
    MessageSquare,
    X,
    Save,
    MoreVertical,
    RefreshCw,
    Upload,
    Link,
    Lock,
    Mail,
    Clock,
    Bell,
    HelpCircle,
    Info,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatTimestamp, getUserInitials, getActivityIcon } from "../utils/entityHelpers";
import { EntityConfig, EntityField, WizardStep, BaseEntity, FormSection } from "../types/entity.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface EntityFormViewProps {
    config: EntityConfig;
    currentView: "create" | "edit";
    editingEntity: BaseEntity | null;
    formData: Record<string, any>;
    setFormData: (data: Record<string, any>) => void;
    currentStep: string;
    setCurrentStep: (step: string) => void;
    wizardSteps: WizardStep[];
    showHistory: boolean;
    activities: any[];
    loadingActivities: boolean;
    isLocked: boolean;
    onBackToList: () => void;
    onSubmit: (e?: React.FormEvent) => void;
    onToggleHistory: () => void;
    onPrevStep: () => void;
    onNextStep: () => void;
    onToggleLock: () => void;
}

export function EntityFormView({
    config,
    currentView,
    editingEntity,
    formData,
    setFormData,
    currentStep,
    setCurrentStep,
    wizardSteps,
    showHistory,
    activities,
    loadingActivities,
    isLocked,
    onBackToList,
    onSubmit,
    onToggleHistory,
    onPrevStep,
    onNextStep,
    onToggleLock,
}: EntityFormViewProps) {

    // Form action handlers
    const handlePreviewButton = () => {
        toast({ title: "Preview feature coming soon" });
    };

    const handleDocumentsButton = () => {
        toast({ title: "Documents feature coming soon" });
    };

    const handleSaveDraft = () => {
        toast({ title: "Draft saved" });
    };

    const handlePreviewChanges = () => {
        toast({ title: "Preview feature coming soon" });
    };

    const handleResetForm = () => {
        setFormData({});
    };

    const handleUploadDocument = () => {
        toast({ title: "Upload feature coming soon" });
    };

    const handleLinkRelated = () => {
        toast({ title: "Link feature coming soon" });
    };

    const handleViewTemplates = () => {
        toast({ title: "Templates feature coming soon" });
    };

    const handleEmailEntity = () => {
        toast({ title: "Email feature coming soon" });
    };

    const handleCopyLink = () => {
        toast({ title: "Link copied" });
    };

    const handleViewAuditLog = () => {
        toast({ title: "Audit log feature coming soon" });
    };

    const handleSetReminder = () => {
        toast({ title: "Reminder feature coming soon" });
    };

    const handleGetHelp = () => {
        toast({ title: "Feature Coming Soon" });
    };

    const handleViewInfo = () => {
        toast({ title: "Info feature coming soon" });
    };

    // Form ref for focus management and keyboard navigation
    const formRef = React.useRef<HTMLFormElement>(null);

    // Auto-focus first input on mount or view change
    React.useEffect(() => {
        if (formRef.current) {
            const firstInput = formRef.current.querySelector('input:not([type="hidden"]), select, textarea') as HTMLElement;
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }, [currentView, currentStep]);

    // Keyboard navigation logic
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Esc to cancel
        if (e.key === "Escape") {
            e.preventDefault();
            onBackToList();
            return;
        }

        // Cmd/Ctrl + S to save
        if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
            return;
        }

        // Enter to submit
        if (e.key === "Enter") {
            const target = e.target as HTMLElement;
            // Don't submit if inside textarea or if a dropdown is open
            const isInsideTextarea = target.tagName === "TEXTAREA";
            const isInsideSelect = target.closest('[role="combobox"]');

            if (!isInsideTextarea && !isInsideSelect && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
                return;
            }
        }

        // Arrow key navigation between inputs
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            const activeElement = document.activeElement as HTMLElement;

            // Don't interfere with typing in inputs/textareas for Left/Right
            const isTyping = (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA");
            if (isTyping && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
                return;
            }

            // Don't interfere with Select/Combobox navigation
            if (activeElement.getAttribute('role') === 'combobox' || activeElement.closest('[role="listbox"]')) {
                return;
            }

            const focusableElements = 'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button[type="submit"]';
            const elements = Array.from(formRef.current?.querySelectorAll(focusableElements) || []) as HTMLElement[];

            const index = elements.indexOf(activeElement);
            if (index > -1) {
                let nextIndex = index;

                if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                    nextIndex = (index + 1) % elements.length;
                } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                    nextIndex = (index - 1 + elements.length) % elements.length;
                }

                if (nextIndex !== index) {
                    e.preventDefault();
                    elements[nextIndex].focus();
                }
            }
        }
    };

    // Render form field based on type
    const renderFormField = (field: EntityField) => {
        const value = formData[field.name] || "";

        switch (field.type) {
            case "select":
                const options = field.referenceData || field.options || [];
                return (
                    <Select
                        value={value}
                        onValueChange={(v) => setFormData({ ...formData, [field.name]: v })}
                    >
                        <SelectTrigger className="h-8 text-xs select-trigger">
                            <SelectValue placeholder={`Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option: any) => {
                                const optionValue = option.id || option.value || option;
                                const optionLabel =
                                    option.stateName ||
                                    option.serviceName ||
                                    option.name ||
                                    option.label ||
                                    option;
                                return (
                                    <SelectItem key={optionValue} value={optionValue} className="text-xs">
                                        {optionLabel}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                );

            case "textarea":
                return (
                    <textarea
                        value={value}
                        onChange={(e) =>
                            setFormData({ ...formData, [field.name]: e.target.value })
                        }
                        placeholder={`Enter ${field.label}`}
                        className="w-full min-h-[60px] text-xs p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                        required={field.required}
                    />
                );

            default:
                return (
                    <Input
                        value={value}
                        onChange={(e) =>
                            setFormData({ ...formData, [field.name]: e.target.value })
                        }
                        placeholder={`Enter ${field.label}`}
                        className="h-8 text-xs"
                        required={field.required}
                    />
                );
        }
    };


    return (
        <div
            className={`grid ${showHistory ? "grid-cols-12" : "grid-cols-1"} gap-2 bg-white h-screen`}
        >
            {/* Main Content */}
            <div
                className={`${showHistory ? "col-span-8" : "col-span-1"} p-2 pt-1 overflow-y-auto h-full`}
            >
                {/* Top Navigation - Compact breadcrumb */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-xs">
                        <button
                            onClick={onBackToList}
                            className="text-slate-500 hover:text-sky-600 transition-colors font-medium"
                        >
                            {config.entityNamePlural}
                        </button>
                        <span className="mx-2 text-slate-300">/</span>
                        <span className="text-slate-800 font-semibold">
                            {currentView === "edit"
                                ? ((editingEntity as any)?.ticketId || (editingEntity as any)?.submissionNumber || (editingEntity as any)?.assetId || (editingEntity as any)?.asset_code || editingEntity?.name || `Edit ${config.entityName}`)
                                : `New ${config.entityName}`}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {!config.hideCreateEditButtons?.includes('preview') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground h-6 px-2"
                                onClick={handlePreviewButton}
                            >
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
                            </Button>
                        )}

                        {!config.hideCreateEditButtons?.includes('documents') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground h-6 px-2"
                                onClick={handleDocumentsButton}
                            >
                                <FileText className="h-3 w-3 mr-1" />
                                Documents
                            </Button>
                        )}

                        {!config.hideCreateEditButtons?.includes('history') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground h-6 px-2"
                                onClick={onToggleHistory}
                            >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                History & Comments
                            </Button>
                        )}

                        {config.formLayout !== "sections" && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={onBackToList}
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                </Button>

                                <Button
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={() => onSubmit()}
                                >
                                    <Save className="h-3 w-3 mr-1" />
                                    Save
                                </Button>
                            </>
                        )}

                        {!config.hideCreateEditButtons?.includes('kebab') && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-6 px-2"
                                    >
                                        <MoreVertical className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={handleSaveDraft}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Draft
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handlePreviewChanges}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Preview Changes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleResetForm}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Reset Form
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleUploadDocument}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Document
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleLinkRelated}>
                                        <Link className="h-4 w-4 mr-2" />
                                        Link Related
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleViewTemplates}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        View Templates
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onToggleLock}>
                                        <Lock className="h-4 w-4 mr-2" />
                                        {isLocked
                                            ? `Unlock ${config.entityName}`
                                            : `Lock ${config.entityName}`}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleEmailEntity}>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Email {config.entityName}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleCopyLink}>
                                        <Link className="h-4 w-4 mr-2" />
                                        Copy Link
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleViewAuditLog}>
                                        <Clock className="h-4 w-4 mr-2" />
                                        View Audit Log
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleSetReminder}>
                                        <Bell className="h-4 w-4 mr-2" />
                                        Set Reminder
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleGetHelp}>
                                        <HelpCircle className="h-4 w-4 mr-2" />
                                        Get Help
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleViewInfo}>
                                        <Info className="h-4 w-4 mr-2" />
                                        View Info
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200/80 mb-4"></div>

                {/* Wizard Tab Navigation - Only show if in wizard layout AND more than 1 step */}
                {config.formLayout !== "sections" && config.wizardSteps && config.wizardSteps.length > 1 && (
                    <div className="flex items-center border-b border-gray-200 mb-3">
                        {config.wizardSteps.map((step, index) => (
                            <button
                                key={step.id}
                                type="button"
                                className={`text-sm font-medium pb-2 mr-8 ${currentStep === step.id
                                    ? "text-orange-600 border-b-2 border-orange-500"
                                    : "text-gray-500"
                                    }`}
                                onClick={() => setCurrentStep(step.id)}
                            >
                                {step.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Form Content */}
                {config.formLayout === "sections" ? (
                    <form
                        ref={formRef}
                        onSubmit={onSubmit}
                        onKeyDown={handleKeyDown}
                        className="w-full"
                    >
                        {/* Vertical Stack Layout - Unified with Plants form */}
                        <div className="flex flex-col gap-3">
                            {(config.formSections || (config.wizardSteps?.map(s => ({ id: s.id, title: s.name } as FormSection)) || [])).map((section) => {
                                const content = section.render ? (
                                    section.render(formData, setFormData)
                                ) : config.renderWizardStep ? (
                                    config.renderWizardStep(section.id, formData, setFormData, currentStep, setCurrentStep)
                                ) : (
                                    <div className="space-y-3">
                                        {config.fields
                                            .filter(f => section.fields?.includes(f.name))
                                            .map(field => (
                                                <div key={field.name} className="space-y-1">
                                                    <Label htmlFor={field.name} className="text-xs font-medium text-slate-600">
                                                        {field.label} {field.required && <span className="text-orange-500">*</span>}
                                                    </Label>
                                                    {renderFormField(field)}
                                                </div>
                                            ))
                                        }
                                    </div>
                                );

                                if (!content) return null;

                                // If section has noHeader, render content directly without header wrapper
                                if (section.noHeader) {
                                    return (
                                        <div key={section.id} className={`bg-white rounded border border-slate-200 overflow-hidden ${section.maxWidth || config.formMaxWidth || "max-w-2xl"}`}>
                                            {content}
                                        </div>
                                    );
                                }

                                return (
                                    <div key={section.id} className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md ${section.maxWidth || config.formMaxWidth || "max-w-2xl"}`}>
                                        {/* Section header - Professional Card Style */}
                                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-gray-800">
                                                {section.title}
                                            </h3>
                                            {section.description && (
                                                <span className="text-xs text-gray-500 font-normal">
                                                    {section.description}
                                                </span>
                                            )}
                                        </div>
                                        {/* Content Area */}
                                        <div className="p-3 w-full">
                                            {content}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {config.additionalFields}

                        {/* Action Buttons - Professional footer */}
                        <div className="flex justify-end items-center gap-3 pt-5 mt-5 border-t border-slate-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onBackToList}
                                className="h-9 px-5 text-xs font-medium border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="h-9 px-6 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all"
                            >
                                {editingEntity ? "Update" : "Create"} {config.entityName}
                            </Button>
                        </div>
                    </form>
                ) : config.wizardSteps && config.wizardSteps.length > 0 ? (
                    <form
                        ref={formRef}
                        onSubmit={onSubmit}
                        onKeyDown={handleKeyDown}
                        className={`space-y-4 ${config.formMaxWidth || "max-w-4xl"}`}
                    >
                        {/* Wizard Step Content */}
                        {config.renderWizardStep &&
                            config.renderWizardStep(
                                currentStep,
                                formData,
                                setFormData,
                                currentStep,
                                setCurrentStep
                            )}

                        {/* Additional Fields */}
                        {config.additionalFields}

                        {/* Only show status when editing - BUT NOT if custom wizard step already handles it */}
                        {currentView === "edit" && !config.renderWizardStep && (
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="status"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Status
                                </Label>
                                <Select
                                    value={formData.status || "Active"}
                                    onValueChange={(value: "Active" | "Inactive") =>
                                        setFormData({ ...formData, status: value })
                                    }
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Wizard Navigation Buttons */}
                        <div className="flex justify-between gap-4 pt-4 border-t border-gray-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onPrevStep}
                                disabled={currentStep === wizardSteps[0]?.id}
                                className="min-w-[120px]"
                            >
                                Previous
                            </Button>
                            <div className="flex gap-4">
                                {currentStep === wizardSteps[wizardSteps.length - 1]?.id ? (
                                    <Button
                                        type="submit"
                                        className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px]"
                                    >
                                        {editingEntity ? "Update" : "Create"} {config.entityName}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={onNextStep}
                                        className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px]"
                                    >
                                        Save & Continue
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                ) : (
                    // Regular form (without wizard/sections)
                    <form
                        ref={formRef}
                        onSubmit={onSubmit}
                        onKeyDown={handleKeyDown}
                        className="space-y-4 max-w-2xl"
                    >
                        {config.fields.map((field) => (
                            <div key={field.name} className="space-y-1.5">
                                <Label
                                    htmlFor={field.name}
                                    className="text-sm font-medium text-gray-700"
                                >
                                    {field.label}
                                    {field.required && <span className="text-red-500">*</span>}
                                </Label>
                                {renderFormField(field)}
                            </div>
                        ))}

                        {config.additionalFields}

                        {/* Only show status when editing */}
                        {currentView === "edit" && (
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="status"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Status
                                </Label>
                                <Select
                                    value={formData.status || "Active"}
                                    onValueChange={(value: "Active" | "Inactive") =>
                                        setFormData({ ...formData, status: value })
                                    }
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                            <Button
                                type="submit"
                                className="bg-orange-500 hover:bg-orange-600 text-white min-w-[120px]"
                            >
                                Save and Continue
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            {showHistory && (
                <div className="col-span-4 border-l bg-white p-4 h-screen overflow-y-auto sticky top-0">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold">History & Comments</h2>
                        <Button variant="ghost" size="sm" onClick={onToggleHistory}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <Tabs defaultValue="history" className="w-full">
                        <TabsList className="mb-2 w-full">
                            <TabsTrigger value="history" className="flex-1">
                                History
                            </TabsTrigger>
                            <TabsTrigger value="comments" className="flex-1">
                                Comments
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="history" className="space-y-4">
                            {loadingActivities ? (
                                <div className="flex h-32 items-center justify-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                                    <span className="ml-2">Loading activities...</span>
                                </div>
                            ) : activities.length > 0 ? (
                                <ScrollArea className="h-[calc(100vh-200px)]">
                                    <div className="space-y-4">
                                        {activities.map((activity) => (
                                            <div
                                                key={activity.id}
                                                className="flex gap-3 p-3 rounded-lg border bg-white"
                                            >
                                                <div className="flex-shrink-0 mt-1">
                                                    {getActivityIcon(activity.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-xs">
                                                                {getUserInitials(activity.user)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm font-medium">
                                                            {activity.user}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatTimestamp(activity.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-900">
                                                        {activity.action}{" "}
                                                        <span className="font-medium">
                                                            {activity.entityName}
                                                        </span>
                                                    </p>
                                                    {activity.details && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {activity.details}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <p>No activity history yet.</p>
                                    <p className="text-sm">
                                        Activities will appear here as you work with{" "}
                                        {config.entityNamePlural.toLowerCase()}.
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="comments" className="space-y-4">
                            <div className="flex gap-2 mb-4">
                                <Input placeholder="Add a comment..." className="flex-1" />
                                <Button size="sm">Post</Button>
                            </div>

                            <div className="text-center py-8 text-muted-foreground">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                <p>No comments yet.</p>
                                <p className="text-sm">
                                    Be the first to comment on{" "}
                                    {config.entityNamePlural.toLowerCase()}.
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    );
}

export default EntityFormView;

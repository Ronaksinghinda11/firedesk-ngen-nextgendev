import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info, CalendarIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Helper Date Picker Component
const SchedulerDatePicker = ({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Pick a date",
  disabled = false
}: {
  value: string;
  onChange: (date: string) => void;
  minDate?: Date;
  maxDate?: Date | null;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) setTempDate(value ? new Date(value) : undefined);
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(new Date(value), "PPP")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={tempDate}
          onSelect={setTempDate}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          initialFocus
        />
        <div className="flex items-center justify-end gap-2 p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTempDate(value ? new Date(value) : undefined);
              setIsOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onChange(tempDate ? format(tempDate, "yyyy-MM-dd") : "");
              setIsOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface SchedulerSetup {
  category: string;
  startDate: string;
  endDate: string;
  inspectionFrequency: string;
  testingFrequency: string;
  maintenanceFrequency: string;
}

interface SchedulerSetupStepProps {
  formData: any;
  setFormData: (data: any) => void;
  categories?: any[];
  isEditing?: boolean;
  originalSchedulerSetups?: SchedulerSetup[];
}

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half-yearly", label: "Half-Yearly" },
  { value: "yearly", label: "Yearly" },
];

// Helper function to get tomorrow's date in YYYY-MM-DD format
const getTomorrowDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Helper function to determine the minimum end date
// If scheduler has already started (startDate <= today), min end date is today
// Otherwise, min end date is the start date
const getMinEndDate = (startDate: string): string => {
  if (!startDate) return getTomorrowDate();

  const today = getTodayDate();
  const start = startDate;

  // If start date is in the past or today, min end date is today
  if (start <= today) {
    return today;
  }

  // Otherwise, min end date is the start date
  return start;
};

// Check if a scheduler has already started (start date is today or in the past)
const hasSchedulerStarted = (startDate: string): boolean => {
  if (!startDate) return false;
  return startDate <= getTodayDate();
};

export function SchedulerSetupStep({
  formData,
  setFormData,
  categories = [],
  isEditing = false,
  originalSchedulerSetups = []
}: SchedulerSetupStepProps) {
  // Initialize schedulerSetups array if it doesn't exist
  const schedulerSetups: SchedulerSetup[] = formData.schedulerSetups || [];

  const handleAddScheduler = () => {
    const newScheduler: SchedulerSetup = {
      category: '',
      startDate: '',
      endDate: '',
      inspectionFrequency: '',
      testingFrequency: '',
      maintenanceFrequency: '',
    };

    setFormData((prev: any) => ({
      ...prev,
      schedulerSetups: [...schedulerSetups, newScheduler]
    }));
  };

  const handleRemoveScheduler = (index: number) => {
    const updatedSchedulers = schedulerSetups.filter((_, i) => i !== index);
    setFormData((prev: any) => ({
      ...prev,
      schedulerSetups: updatedSchedulers
    }));
  };

  const handleSchedulerChange = (index: number, field: keyof SchedulerSetup, value: string) => {
    const updatedSchedulers = [...schedulerSetups];
    updatedSchedulers[index] = {
      ...updatedSchedulers[index],
      [field]: value
    };

    setFormData((prev: any) => ({
      ...prev,
      schedulerSetups: updatedSchedulers
    }));
  };

  // Get list of already selected category IDs to prevent duplicates
  const selectedCategoryIds = schedulerSetups.map(s => s.category).filter(Boolean);

  // Get available categories for a specific scheduler entry (excluding already selected ones, except the current one)
  const getAvailableCategories = (currentIndex: number) => {
    const currentCategory = schedulerSetups[currentIndex]?.category;
    return categories.filter(cat =>
      !selectedCategoryIds.includes(cat.id) || cat.id === currentCategory
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Scheduler Setup</h3>
        <Button
          type="button"
          onClick={handleAddScheduler}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* Scheduler Entries */}
      {schedulerSetups.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No scheduler configurations added yet.</p>
          <p className="text-sm mt-2">Click "Add Category" to create a scheduler configuration.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {schedulerSetups.map((scheduler, index) => (
            <div key={index} className="border rounded-lg p-6 space-y-6 relative bg-gray-50">
              {/* Remove Button */}
              <div className="absolute top-4 right-4">
                <Button
                  type="button"
                  onClick={() => handleRemoveScheduler(index)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <h4 className="text-md font-medium text-gray-700">Configuration {index + 1}</h4>

              {/* Category and Dates */}
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor={`category-${index}`}>Category *</Label>
                  <Select
                    value={scheduler.category || ''}
                    onValueChange={(value) => handleSchedulerChange(index, 'category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCategories(index).map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`startDate-${index}`}>Start Date</Label>
                    {isEditing && originalSchedulerSetups[index]?.startDate && hasSchedulerStarted(originalSchedulerSetups[index].startDate) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Start date cannot be changed as the scheduler has already started.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  {isEditing && originalSchedulerSetups[index]?.startDate && hasSchedulerStarted(originalSchedulerSetups[index].startDate) ? (
                    // When editing an existing scheduler that has already started, start date is read-only
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            "bg-gray-100 cursor-not-allowed opacity-70"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduler.startDate ? (
                            format(new Date(scheduler.startDate), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                    </Popover>
                  ) : (
                    // When creating new scheduler OR editing one that hasn't started yet
                    <SchedulerDatePicker
                      value={scheduler.startDate}
                      onChange={(date) => handleSchedulerChange(index, 'startDate', date)}
                      minDate={
                        isEditing && originalSchedulerSetups[index]?.startDate
                          ? new Date(originalSchedulerSetups[index].startDate)
                          : new Date(getTomorrowDate())
                      }
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`endDate-${index}`}>End Date</Label>
                    {isEditing && originalSchedulerSetups[index]?.endDate && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>End date can only be preponed (moved earlier), not postponed.</p>
                            {hasSchedulerStarted(scheduler.startDate) && (
                              <p className="mt-1">Cannot select dates before today as the scheduler has already started.</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <SchedulerDatePicker
                    value={scheduler.endDate}
                    onChange={(date) => handleSchedulerChange(index, 'endDate', date)}
                    minDate={new Date(getMinEndDate(scheduler.startDate))}
                    maxDate={
                      isEditing && originalSchedulerSetups[index]?.endDate
                        ? new Date(originalSchedulerSetups[index].endDate)
                        : null
                    }
                  />
                </div>
              </div>

              {/* Frequencies - Multi-select with Checkboxes */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-gray-700">Service Frequencies</h5>
                <p className="text-xs text-gray-500 mb-3">Select one or more frequencies for each service type</p>

                <div className="grid grid-cols-3 gap-6">
                  {/* Inspection Frequency */}
                  <div className="space-y-2 border rounded-lg p-4">
                    <Label className="font-medium">Inspection</Label>
                    <div className="space-y-2 mt-2">
                      {frequencyOptions.map((option) => {
                        const selected = scheduler.inspectionFrequency?.split(',').map(f => f.trim().toLowerCase()).includes(option.value) || false;
                        return (
                          <div key={option.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`inspection-${index}-${option.value}`}
                              checked={selected}
                              onChange={(e) => {
                                const currentValues = scheduler.inspectionFrequency
                                  ? scheduler.inspectionFrequency.split(',').map(f => f.trim())
                                  : [];

                                let newValues;
                                if (e.target.checked) {
                                  newValues = [...currentValues, option.label];
                                } else {
                                  newValues = currentValues.filter(v => v.toLowerCase() !== option.value);
                                }

                                handleSchedulerChange(index, 'inspectionFrequency', newValues.join(', '));
                              }}
                              className="rounded border-gray-300"
                            />
                            <label
                              htmlFor={`inspection-${index}-${option.value}`}
                              className="text-sm cursor-pointer"
                            >
                              {option.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Testing Frequency */}
                  <div className="space-y-2 border rounded-lg p-4">
                    <Label className="font-medium">Testing</Label>
                    <div className="space-y-2 mt-2">
                      {frequencyOptions.map((option) => {
                        const selected = scheduler.testingFrequency?.split(',').map(f => f.trim().toLowerCase()).includes(option.value) || false;
                        return (
                          <div key={option.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`testing-${index}-${option.value}`}
                              checked={selected}
                              onChange={(e) => {
                                const currentValues = scheduler.testingFrequency
                                  ? scheduler.testingFrequency.split(',').map(f => f.trim())
                                  : [];

                                let newValues;
                                if (e.target.checked) {
                                  newValues = [...currentValues, option.label];
                                } else {
                                  newValues = currentValues.filter(v => v.toLowerCase() !== option.value);
                                }

                                handleSchedulerChange(index, 'testingFrequency', newValues.join(', '));
                              }}
                              className="rounded border-gray-300"
                            />
                            <label
                              htmlFor={`testing-${index}-${option.value}`}
                              className="text-sm cursor-pointer"
                            >
                              {option.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Maintenance Frequency */}
                  <div className="space-y-2 border rounded-lg p-4">
                    <Label className="font-medium">Maintenance</Label>
                    <div className="space-y-2 mt-2">
                      {frequencyOptions.map((option) => {
                        const selected = scheduler.maintenanceFrequency?.split(',').map(f => f.trim().toLowerCase()).includes(option.value) || false;
                        return (
                          <div key={option.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`maintenance-${index}-${option.value}`}
                              checked={selected}
                              onChange={(e) => {
                                const currentValues = scheduler.maintenanceFrequency
                                  ? scheduler.maintenanceFrequency.split(',').map(f => f.trim())
                                  : [];

                                let newValues;
                                if (e.target.checked) {
                                  newValues = [...currentValues, option.label];
                                } else {
                                  newValues = currentValues.filter(v => v.toLowerCase() !== option.value);
                                }

                                handleSchedulerChange(index, 'maintenanceFrequency', newValues.join(', '));
                              }}
                              className="rounded border-gray-300"
                            />
                            <label
                              htmlFor={`maintenance-${index}-${option.value}`}
                              className="text-sm cursor-pointer"
                            >
                              {option.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

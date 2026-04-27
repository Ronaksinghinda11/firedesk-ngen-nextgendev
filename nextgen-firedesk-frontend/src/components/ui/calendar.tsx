import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onClear?: () => void;
  showClearButton?: boolean;
  showTodayButton?: boolean;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  onClear,
  showClearButton = true,
  showTodayButton = true,
  ...props
}: CalendarProps) {
  // Handle both single date and range modes
  const getInitialMonth = () => {
    if (props.defaultMonth) return props.defaultMonth;
    if (props.selected) {
      // If it's a DateRange (mode="range"), use the 'from' date
      if (typeof props.selected === 'object' && 'from' in props.selected) {
        return props.selected.from || new Date();
      }
      // If it's a single Date
      return props.selected as Date;
    }
    return new Date();
  };

  const [month, setMonth] = React.useState<Date>(getInitialMonth());

  // Get current year and month
  const currentYear = month.getFullYear();
  const currentMonth = month.getMonth();

  // Generate year options (current year ± 50 years)
  const yearOptions = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleMonthChange = (newMonth: string) => {
    const newDate = new Date(month);
    newDate.setMonth(parseInt(newMonth));
    setMonth(newDate);
  };

  const handleYearChange = (newYear: string) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(newYear));
    setMonth(newDate);
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(month);
    newDate.setMonth(month.getMonth() - 1);
    setMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(month);
    newDate.setMonth(month.getMonth() + 1);
    setMonth(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setMonth(today);
    // Call onSelect if it exists on props
    if ('onSelect' in props && props.onSelect) {
      // @ts-ignore - Complex react-day-picker types
      props.onSelect(today);
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    // Call onSelect if it exists on props  
    if ('onSelect' in props && props.onSelect) {
      // @ts-ignore - Complex react-day-picker types
      props.onSelect(undefined);
    }
  };

  return (
    <div className="p-3">
      {/* Custom Header with Dropdowns */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePreviousMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          {/* Month Dropdown */}
          <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[110px] h-8 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Dropdown */}
          <Select value={currentYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[90px] h-8 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-col">
            <button
              type="button"
              onClick={handlePreviousMonth}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar Grid */}
      <DayPicker
        month={month}
        onMonthChange={setMonth}
        showOutsideDays={showOutsideDays}
        className={className}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "hidden", // Hide default caption since we have custom header
          caption_label: "text-sm font-medium",
          nav: "hidden", // Hide default nav since we have custom navigation
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        {...props}
      />

      {/* Action Buttons */}
      {(showClearButton || showTodayButton) && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          {showClearButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Clear
            </Button>
          )}
          {showTodayButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 ml-auto"
            >
              Today
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

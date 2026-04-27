
import * as React from "react"
import { addDays, format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
    className?: string
    date?: DateRange
    onDateChange: (date: DateRange | undefined) => void
}

export function DateRangePicker({
    className,
    date,
    onDateChange,
}: DateRangePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)

    // Sync tempDate with date prop when popover opens
    React.useEffect(() => {
        if (open) {
            setTempDate(date)
        }
    }, [open, date])

    const handleApply = () => {
        onDateChange(tempDate)
        setOpen(false)
    }

    const handleCancel = () => {
        setTempDate(date)
        setOpen(false)
    }

    const handleSelect = (range: DateRange | undefined) => {
        if (!range) {
            // Calendar's built-in "Clear" was clicked — apply immediately
            onDateChange(undefined)
            setOpen(false)
            return
        }
        setTempDate(range)
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={tempDate?.from || date?.from}
                        selected={tempDate}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                    />
                    <div className="flex items-center justify-end gap-2 p-3 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleApply}
                            disabled={!tempDate?.from || !tempDate?.to}
                        >
                            Apply
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

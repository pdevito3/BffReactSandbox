import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfToday,
  startOfTomorrow,
  startOfWeek,
  startOfYear,
  startOfYesterday,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import type { DateValue, Filter } from "../types";
import { Operators } from "../utils/operators";

interface DateFilterProps {
  propertyKey: string;
  propertyLabel: string;
  onSubmit: (filter: Omit<Filter, "id">) => void;
  initialFilter?: Filter;
}

type DateMode = "before" | "after" | "between" | "on";

export function DateFilter({
  propertyKey,
  propertyLabel,
  onSubmit,
  initialFilter,
}: DateFilterProps) {
  const initialDateValue = initialFilter?.value as DateValue | undefined;

  const [mode, setMode] = useState<DateMode>(
    initialDateValue?.mode === "excluding"
      ? "on"
      : initialDateValue?.mode || "on"
  );
  const [date, setDate] = useState<Date | undefined>(
    initialDateValue?.startDate
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialDateValue?.mode === "between" && initialDateValue.endDate
      ? { from: initialDateValue.startDate, to: initialDateValue.endDate }
      : undefined
  );
  const [exclude, setExclude] = useState(
    initialDateValue?.mode === "excluding"
      ? true
      : initialDateValue?.exclude || false
  );

  const handlePreset = (preset: () => Date | DateRange) => {
    const result = preset();
    if (result instanceof Date) {
      setDate(result);
    } else if ("from" in result) {
      setDateRange(result);
      if (mode !== "between") {
        setMode("between");
      }
    }
  };

  const handleSubmit = () => {
    if (mode === "between" && !dateRange?.from) return;
    if (mode !== "between" && !date) return;

    const dateValue: DateValue =
      mode === "between"
        ? {
            mode: "between",
            startDate: dateRange!.from!,
            endDate: dateRange!.to,
            exclude: exclude || undefined,
          }
        : {
            mode: (exclude ? "excluding" : mode) as
              | "before"
              | "after"
              | "on"
              | "excluding",
            startDate: date!,
          };

    onSubmit({
      propertyKey,
      propertyLabel,
      controlType: "date",
      operator: Operators.EQUALS,
      value: dateValue,
    } as Omit<Filter, "id">);
  };

  const modes: { value: DateMode; label: string }[] = [
    { value: "on", label: "On" },
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
    { value: "between", label: "Between" },
  ];

  // Presets for single dates (on, before, after)
  const singleDatePresets = [
    { label: "Today", action: () => startOfToday() },
    { label: "Tomorrow", action: () => startOfTomorrow() },
    { label: "Yesterday", action: () => startOfYesterday() },
  ];

  // Presets for date ranges (between)
  const dateRangePresets = [
    {
      label: "This Week",
      action: () => ({
        from: startOfWeek(new Date()),
        to: endOfWeek(new Date()),
      }),
    },
    {
      label: "Last Week",
      action: () => ({
        from: startOfWeek(subWeeks(new Date(), 1)),
        to: endOfWeek(subWeeks(new Date(), 1)),
      }),
    },
    {
      label: "Next Week",
      action: () => ({
        from: startOfWeek(addWeeks(new Date(), 1)),
        to: endOfWeek(addWeeks(new Date(), 1)),
      }),
    },
    {
      label: "This Month",
      action: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: "Last Month",
      action: () => ({
        from: startOfMonth(subMonths(new Date(), 1)),
        to: endOfMonth(subMonths(new Date(), 1)),
      }),
    },
    {
      label: "Next Month",
      action: () => ({
        from: startOfMonth(addMonths(new Date(), 1)),
        to: endOfMonth(addMonths(new Date(), 1)),
      }),
    },
    {
      label: "This Year",
      action: () => ({
        from: startOfYear(new Date()),
        to: endOfYear(new Date()),
      }),
    },
    {
      label: "Last Year",
      action: () => ({
        from: startOfYear(subYears(new Date(), 1)),
        to: endOfYear(subYears(new Date(), 1)),
      }),
    },
  ];

  const currentPresets =
    mode === "between" ? dateRangePresets : singleDatePresets;

  const isValid = mode === "between" ? dateRange?.from : date;

  return (
    <div className="w-80 p-3 space-y-3">
      {/* Mode selector */}
      <div className="flex gap-1 flex-wrap">
        {modes.map((m) => (
          <Button
            key={m.value}
            variant={mode === m.value ? "default" : "outline"}
            size="sm"
            onClick={() => setMode(m.value)}
            className="flex-1 min-w-0"
          >
            {m.label}
          </Button>
        ))}
      </div>

      {/* Exclude checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="exclude-dates"
          checked={exclude}
          onCheckedChange={(checked) => setExclude(checked === true)}
        />
        <Label
          htmlFor="exclude-dates"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Exclude {mode === "between" ? "date range" : "dates"}
        </Label>
      </div>

      {/* Quick presets */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          Quick Select
        </div>
        <div className="grid grid-cols-3 gap-1">
          {currentPresets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handlePreset(preset.action)}
              className="text-xs h-7"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div>
        {mode === "between" ? (
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={1}
          />
        ) : (
          <Calendar mode="single" selected={date} onSelect={setDate} />
        )}
      </div>

      {/* Submit button */}
      <Button onClick={handleSubmit} disabled={!isValid} className="w-full">
        {initialFilter ? "Update" : "Add"} Filter
      </Button>
    </div>
  );
}

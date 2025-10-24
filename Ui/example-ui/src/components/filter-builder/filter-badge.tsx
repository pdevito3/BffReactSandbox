import { format } from "date-fns";
import { CaseSensitive, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { DateValue, Filter } from "./types";
import { getOperatorLabel } from "./utils/operators";

interface FilterBadgeProps {
  filter: Filter;
  onRemove: () => void;
  onEdit?: () => void;
}

export function FilterBadge({ filter, onRemove, onEdit }: FilterBadgeProps) {
  const formattedValue = formatFilterValue(filter.value, filter.controlType);
  // A filter is case-sensitive if:
  // 1. The caseSensitive flag is explicitly true, OR
  // 2. The operator doesn't end with * (which indicates case-insensitive)
  const isCaseSensitive =
    filter.caseSensitive === true ||
    (filter.controlType === "text" && !filter.operator.endsWith("*"));

  return (
    <Badge
      variant="button"
      className="gap-1.5 pr-1 py-0 cursor-pointer"
      onClick={onEdit}
    >
      <span className="font-medium">{filter.propertyLabel}</span>
      <span className="text-foreground/60 font-semibold px-1.5 text-base">
        |
      </span>
      <span>{getOperatorLabel(filter.operator)}</span>
      <span className="text-foreground/60 font-semibold px-1.5 text-base">
        |
      </span>
      <span className="max-w-[200px] truncate">{formattedValue}</span>

      {filter.controlType === "text" && isCaseSensitive && (
        <CaseSensitive
          className="h-3 w-3 text-muted-foreground ml-1"
          title="Case Sensitive"
        />
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 ml-1 hover:bg-destructive/20 hover:text-destructive rounded-sm"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}

/**
 * Format filter value for display in badge
 */
function formatFilterValue(
  value: string | string[] | number | boolean | DateValue,
  controlType: string
): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    if (value.length === 1) return value[0];
    // Show actual values if less than 4
    if (value.length < 4) return value.join(", ");
    return `${value.length} selected`;
  }

  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "string") {
    return value;
  }

  // DateValue
  if (typeof value === "object" && "mode" in value) {
    const dateValue = value as DateValue;
    const formatDate = (date: Date) => format(date, "MMM d, yyyy");

    switch (dateValue.mode) {
      case "before":
        return `Before ${formatDate(dateValue.startDate)}`;
      case "after":
        return `After ${formatDate(dateValue.startDate)}`;
      case "on":
        return formatDate(dateValue.startDate);
      case "excluding":
        return `Excluding ${formatDate(dateValue.startDate)}`;
      case "between":
        if (dateValue.endDate) {
          const range = `${formatDate(dateValue.startDate)} - ${formatDate(dateValue.endDate)}`;
          return dateValue.exclude ? `Excluding ${range}` : range;
        }
        return `From ${formatDate(dateValue.startDate)}`;
      default:
        return "Unknown date";
    }
  }

  return "Unknown";
}

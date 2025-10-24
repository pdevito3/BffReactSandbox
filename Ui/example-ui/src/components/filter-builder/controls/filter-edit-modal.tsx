import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { Filter, FilterConfig } from "../types";
import { BooleanFilter } from "./boolean-filter";
import { DateFilter } from "./date-filter";
import { MultiSelectFilter } from "./multiselect-filter";
import { NumberFilter } from "./number-filter";
import { TextFilterModal } from "./text-filter-modal";

interface FilterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (filter: Omit<Filter, "id">) => void;
  filter: Filter;
  filterOptions: FilterConfig[];
}

export function FilterEditModal({
  isOpen,
  onClose,
  onSubmit,
  filter,
  filterOptions,
}: FilterEditModalProps) {
  const handleSubmit = (updatedFilter: Omit<Filter, "id">) => {
    onSubmit(updatedFilter);
    onClose();
  };

  // For text filters, use the existing TextFilterModal which has its own Dialog wrapper
  if (filter.controlType === "text") {
    return (
      <TextFilterModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleSubmit}
        propertyKey={filter.propertyKey}
        propertyLabel={filter.propertyLabel}
        initialFilter={filter}
      />
    );
  }

  // For other types, wrap them in a Dialog
  // Find the filter config to get options for multiselect
  const filterConfig = filterOptions.find(
    (opt) => opt.propertyKey === filter.propertyKey
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-auto max-w-fit">
        <DialogHeader>
          <DialogTitle>Edit {filter.propertyLabel} Filter</DialogTitle>
        </DialogHeader>

        {filter.controlType === "boolean" && (
          <BooleanFilter
            propertyKey={filter.propertyKey}
            propertyLabel={filter.propertyLabel}
            onSubmit={handleSubmit}
            initialFilter={filter}
          />
        )}

        {filter.controlType === "date" && (
          <DateFilter
            propertyKey={filter.propertyKey}
            propertyLabel={filter.propertyLabel}
            onSubmit={handleSubmit}
            initialFilter={filter}
          />
        )}

        {filter.controlType === "number" && (
          <NumberFilter
            propertyKey={filter.propertyKey}
            propertyLabel={filter.propertyLabel}
            onSubmit={handleSubmit}
            initialFilter={filter}
            allowedOperators={filterConfig?.operators}
          />
        )}

        {filter.controlType === "multiselect" && filterConfig?.options && (
          <MultiSelectFilter
            propertyKey={filter.propertyKey}
            propertyLabel={filter.propertyLabel}
            options={filterConfig.options}
            onSubmit={handleSubmit}
            initialFilter={filter}
            allowedOperators={filterConfig.operators}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

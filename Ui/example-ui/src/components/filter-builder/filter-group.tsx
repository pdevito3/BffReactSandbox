import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FoldVertical, GripVertical, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { FilterBadge } from "./filter-badge";
import type {
  Filter,
  FilterConfig,
  FilterGroup as FilterGroupType,
} from "./types";
import { isFilter } from "./types";

interface FilterGroupProps {
  group: FilterGroupType;
  depth: number;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleOperator: (groupId: string) => void;
  onRemove: (groupId: string) => void;
  onUngroup: (groupId: string) => void;
  onRemoveFilter: (filterId: string) => void;
  onEditFilter: (filter: Filter) => void;
  filterOptions: FilterConfig[];
  isDragging?: boolean;
  showCheckbox?: boolean;
}

export function FilterGroup({
  group,
  depth,
  selectedIds,
  onToggleSelection,
  onToggleOperator,
  onRemove,
  onUngroup,
  onRemoveFilter,
  onEditFilter,
  filterOptions,
  isDragging = false,
  showCheckbox = true,
}: FilterGroupProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: group.id,
    data: {
      type: "group",
      group,
      depth,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const isSelected = selectedIds.has(group.id);
  const hasSelectedChildren = group.filters.some((item) =>
    selectedIds.has(item.id)
  );

  // Color scheme based on depth for visual hierarchy
  const depthColors = [
    "border-l-blue-500",
    "border-l-purple-500",
    "border-l-pink-500",
  ];
  const depthBg = [
    "bg-blue-50/50 dark:bg-blue-950/20",
    "bg-purple-50/50 dark:bg-purple-950/20",
    "bg-pink-50/50 dark:bg-pink-950/20",
  ];

  const borderColor =
    depthColors[depth % depthColors.length] || "border-l-gray-500";
  const bgColor =
    depthBg[depth % depthBg.length] || "bg-gray-50/50 dark:bg-gray-950/20";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-l-4 transition-all",
        borderColor,
        bgColor,
        isSelected && "ring-2 ring-primary",
        isDragging && "opacity-50"
      )}
    >
      <div className="p-2">
        {/* Group Header */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing hover:bg-accent rounded p-1 shrink-0"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Selection Checkbox */}
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(group.id)}
              className="shrink-0"
            />
          )}

          {/* Group Label */}
          <Badge variant="outline" className="text-xs font-medium shrink-0">
            Group (Depth {depth})
          </Badge>

          {/* Logical Operator Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleOperator(group.id)}
            className="h-6 px-2 text-xs font-medium shrink-0"
          >
            {group.logicalOperator}
          </Button>

          {/* Filter Count */}
          <span className="text-xs text-muted-foreground shrink-0">
            {group.filters.length}{" "}
            {group.filters.length === 1 ? "filter" : "filters"}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Ungroup Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUngroup(group.id)}
            className="h-6 px-2 text-xs shrink-0"
            title="Ungroup (move filters to parent)"
          >
            <FoldVertical className="h-3 w-3 mr-1" />
            Ungroup
          </Button>

          {/* Remove Group Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(group.id)}
            className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive shrink-0"
            title="Delete group and all its filters"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Group Contents - Horizontal Layout */}
        <div className="flex flex-wrap items-start gap-2 pl-6">
          {group.filters.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              {isFilter(item) ? (
                <>
                  {showCheckbox && (
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => onToggleSelection(item.id)}
                      className="shrink-0"
                    />
                  )}
                  <FilterBadge
                    filter={item}
                    onRemove={() => onRemoveFilter(item.id)}
                    onEdit={() => onEditFilter(item)}
                  />
                </>
              ) : (
                <div className="w-full">
                  <FilterGroup
                    group={item}
                    depth={depth + 1}
                    selectedIds={selectedIds}
                    onToggleSelection={onToggleSelection}
                    onToggleOperator={onToggleOperator}
                    onRemove={onRemove}
                    onUngroup={onUngroup}
                    onRemoveFilter={onRemoveFilter}
                    onEditFilter={onEditFilter}
                    filterOptions={filterOptions}
                    showCheckbox={showCheckbox}
                  />
                </div>
              )}

              {/* Show logical operator between items */}
              {index < group.filters.length - 1 && (
                <span className="text-xs text-muted-foreground font-medium px-1">
                  {group.logicalOperator}
                </span>
              )}
            </div>
          ))}

          {group.filters.length === 0 && (
            <div className="text-xs text-muted-foreground italic">
              Empty group (will be removed on save)
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

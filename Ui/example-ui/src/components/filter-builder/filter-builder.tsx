import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FolderPlus, GripVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { FilterEditModal } from "./controls/filter-edit-modal";
import { FilterBadge } from "./filter-badge";
import { FilterGroup } from "./filter-group";
import { FilterPropertyMenu } from "./filter-property-menu";
import type {
  Filter,
  FilterBuilderProps,
  FilterGroup as FilterGroupType,
  FilterState,
} from "./types";
import { isFilter, isFilterGroup } from "./types";
import { canCreateGroup } from "./utils/depth";
import {
  addFilter,
  createGroupFromSelected,
  removeFilter,
  reorderFilters,
  toggleGroupLogicalOperator,
  toggleRootLogicalOperator,
  ungroupFilters,
  updateFilter,
} from "./utils/filter-state";
import { toQueryKitString } from "./utils/querykit-converter";
import { LogicalOperators } from "./utils/operators";

// Sortable filter item component
interface SortableFilterItemProps {
  filter: Filter;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (filter: Filter) => void;
  isOver?: boolean;
  showCheckbox?: boolean;
}

function SortableFilterItem({
  filter,
  selectedIds,
  onToggleSelection,
  onRemove,
  onEdit,
  isOver = false,
  showCheckbox = true,
}: SortableFilterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: filter.id,
    data: {
      type: "filter",
      filter,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = selectedIds.has(filter.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1.5 relative",
        isSelected && "ring-2 ring-primary rounded-md p-0.5",
        isOver && "ring-2 ring-blue-500 ring-offset-2 rounded-md"
      )}
    >
      {isOver && (
        <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-blue-500 rounded-full" />
      )}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing hover:bg-accent rounded p-1"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {showCheckbox && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(filter.id)}
          className="shrink-0"
        />
      )}
      <FilterBadge
        filter={filter}
        onRemove={() => onRemove(filter.id)}
        onEdit={() => onEdit(filter)}
      />
    </div>
  );
}

export function FilterBuilder({
  filterOptions,
  presets = [],
  onChange,
  initialState,
  className,
}: FilterBuilderProps) {
  const [state, setState] = useState<FilterState>(
    initialState || {
      filters: [],
      rootLogicalOperator: LogicalOperators.AND,
    }
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isGroupingMode, setIsGroupingMode] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Notify parent of state changes
  useEffect(() => {
    onChange?.(state);
  }, [state, onChange]);

  // Get all item IDs for SortableContext
  const itemIds = useMemo(
    () => state.filters.map((item) => item.id),
    [state.filters]
  );

  const handleAddFilter = (filter: Omit<Filter, "id">) => {
    const newFilter: Filter = {
      ...filter,
      id: crypto.randomUUID(),
    };
    setState((prev) => addFilter(prev, newFilter));
  };

  const handleRemoveFilter = (filterId: string) => {
    setState((prev) => removeFilter(prev, filterId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(filterId);
      return next;
    });
  };

  const handleToggleLogicalOperator = () => {
    setState((prev) => toggleRootLogicalOperator(prev));
  };

  const handleToggleGroupOperator = (groupId: string) => {
    setState((prev) => toggleGroupLogicalOperator(prev, groupId));
  };

  const handleUngroup = (groupId: string) => {
    setState((prev) => ungroupFilters(prev, groupId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  };

  const handleEditFilter = (filter: Filter) => {
    setEditingFilter(filter);
    setEditModalOpen(true);
  };

  const handleUpdateFilter = (updatedFilter: Omit<Filter, "id">) => {
    if (!editingFilter) return;

    setState((prev) => updateFilter(prev, editingFilter.id, updatedFilter));
    setEditModalOpen(false);
    setEditingFilter(null);
  };

  const handleToggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set<string>();
    const collectIds = (items: (Filter | FilterGroupType)[]) => {
      items.forEach((item) => {
        allIds.add(item.id);
        if (isFilterGroup(item)) {
          collectIds(item.filters);
        }
      });
    };
    collectIds(state.filters);
    setSelectedIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleEnterGroupingMode = () => {
    setIsGroupingMode(true);
  };

  const handleCancelGrouping = () => {
    setIsGroupingMode(false);
    setSelectedIds(new Set());
  };

  const handleClearAll = () => {
    setState({
      filters: [],
      rootLogicalOperator: LogicalOperators.AND,
    });
    setSelectedIds(new Set());
  };

  const handleCreateGroup = () => {
    const ids = Array.from(selectedIds);
    const { canCreate, reason } = canCreateGroup(state, ids);

    if (!canCreate) {
      alert(reason || "Cannot create group");
      return;
    }

    setState((prev) => createGroupFromSelected(prev, ids, LogicalOperators.AND));
    setSelectedIds(new Set());
    setIsGroupingMode(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId((event.over?.id as string) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = state.filters.findIndex((f) => f.id === active.id);
    const overIndex = state.filters.findIndex((f) => f.id === over.id);

    if (activeIndex !== -1 && overIndex !== -1) {
      setState((prev) => reorderFilters(prev, activeIndex, overIndex));
    }

    // TODO: Handle dropping on groups to add to group
    // TODO: Handle dropping filters on each other to create groups
  };

  const hasFilters = state.filters.length > 0;
  const hasMultipleFilters = state.filters.length > 1;
  const selectedCount = selectedIds.size;
  const canGroup = selectedCount >= 2;

  // Find active item for drag overlay
  const findItemById = (
    items: (Filter | FilterGroupType)[],
    id: string
  ): Filter | FilterGroupType | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (isFilterGroup(item)) {
        const found = findItemById(item.filters, id);
        if (found) return found;
      }
    }
    return null;
  };

  const activeItem = activeId ? findItemById(state.filters, activeId) : null;

  return (
    <div className={cn("space-y-2", className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPropertyMenu
            options={filterOptions}
            onAddFilter={handleAddFilter}
          />

          {/* Grouping Controls */}
          {hasFilters && !isGroupingMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnterGroupingMode}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Group Filters
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
              >
                Clear
              </Button>
            </>
          )}

          {isGroupingMode && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateGroup}
                disabled={!canGroup}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                {selectedCount > 0
                  ? `Group Selected (${selectedCount})`
                  : "Group Filters"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelGrouping}
              >
                Cancel
              </Button>
            </>
          )}

          {/* Logical operator toggle button */}
          {hasMultipleFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleLogicalOperator}
              className="h-7 px-2 text-xs"
            >
              Switch to {state.rootLogicalOperator === LogicalOperators.AND ? LogicalOperators.OR : LogicalOperators.AND}
            </Button>
          )}
        </div>

        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-wrap items-start gap-3">
            {state.filters.map((item, index) => (
              <div key={item.id} className="flex items-center gap-1.5">
                {isFilter(item) ? (
                  <SortableFilterItem
                    filter={item}
                    selectedIds={selectedIds}
                    onToggleSelection={handleToggleSelection}
                    onRemove={handleRemoveFilter}
                    onEdit={handleEditFilter}
                    isOver={overId === item.id && activeId !== item.id}
                    showCheckbox={isGroupingMode}
                  />
                ) : (
                  <div className="w-full">
                    <FilterGroup
                      group={item}
                      depth={1}
                      selectedIds={selectedIds}
                      onToggleSelection={handleToggleSelection}
                      onToggleOperator={handleToggleGroupOperator}
                      onRemove={handleRemoveFilter}
                      onUngroup={handleUngroup}
                      onRemoveFilter={handleRemoveFilter}
                      onEditFilter={handleEditFilter}
                      filterOptions={filterOptions}
                      showCheckbox={isGroupingMode}
                    />
                  </div>
                )}

                {/* Show logical operator between items */}
                {index < state.filters.length - 1 && (
                  <span className="text-sm text-muted-foreground font-medium px-1">
                    {state.rootLogicalOperator}
                  </span>
                )}
              </div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem ? (
            <div className="cursor-grabbing opacity-90 rotate-2 shadow-2xl">
              {isFilter(activeItem) ? (
                <div className="flex items-center gap-1.5 bg-background border-2 border-primary rounded-md p-1.5">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <FilterBadge
                    filter={activeItem}
                    onRemove={() => {}}
                    onEdit={() => {}}
                  />
                </div>
              ) : (
                <div className="bg-background border-2 border-primary rounded-md p-2 shadow-lg max-w-md">
                  <div className="flex items-center gap-1.5">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs font-medium">
                      Group (Depth {1})
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {activeItem.filters.length}{" "}
                      {activeItem.filters.length === 1 ? "filter" : "filters"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Quick filter presets */}
      {presets.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-sm text-muted-foreground">Quick filters:</span>
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => {
                setState(preset.filter);
                setSelectedIds(new Set());
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasFilters && (
        <div className="text-sm text-muted-foreground">
          No filters applied. Click "Add Filter" to get started.
        </div>
      )}

      {/* Edit filter modal (supports all filter types) */}
      {editingFilter && (
        <FilterEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingFilter(null);
          }}
          onSubmit={handleUpdateFilter}
          filter={editingFilter}
          filterOptions={filterOptions}
        />
      )}
    </div>
  );
}

// Export utility function to convert state to QueryKit string
export { toQueryKitString };

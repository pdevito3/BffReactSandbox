# Filter Builder - Developer Onboarding Guide

## Table of Contents
1. [Overview](#overview)
2. [Background & Purpose](#background--purpose)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Type System](#type-system)
6. [Component Hierarchy](#component-hierarchy)
7. [State Management](#state-management)
8. [QueryKit Conversion](#querykit-conversion)
9. [Core Components](#core-components)
10. [Utilities & Helper Functions](#utilities--helper-functions)
11. [Usage Guide](#usage-guide)
12. [Advanced Features](#advanced-features)
13. [Extending the System](#extending-the-system)

---

## Overview

The Filter Builder is a sophisticated React component that enables users to construct complex, type-safe database queries through an intuitive drag-and-drop interface. It converts user-friendly filter selections into QueryKit filter strings that can be sent to a backend API.

### Key Capabilities
- **Multi-type Support**: Text, multiselect, date, number, and boolean filters
- **Complex Operators**: 40+ operators covering equality, comparison, strings, collections, and more
- **Logical Grouping**: Create nested groups with independent AND/OR logic (up to 3 levels deep)
- **Drag & Drop**: Reorder filters and groups visually using @dnd-kit
- **Live Editing**: Click any filter badge to edit its values in-place
- **Preset Filters**: Quick-apply common filter combinations
- **QueryKit Output**: Automatically generates backend-compatible filter strings

---

## Background & Purpose

### Problem Statement
Modern applications need to provide users with powerful search and filtering capabilities without requiring them to write query syntax manually. The filter builder solves this by:

1. **Abstracting Complexity**: Users don't need to know QueryKit syntax
2. **Preventing Errors**: Type-safe filters prevent invalid queries
3. **Visual Feedback**: Real-time preview of generated QueryKit strings
4. **Flexibility**: Supports simple filters to deeply nested logical groups

### QueryKit Integration
The component generates filter strings compatible with [QueryKit](https://github.com/pdevito3/QueryKit), a C# library for dynamic LINQ query building. This allows the frontend to construct sophisticated queries that the backend can execute safely against a database.

**Example:**
```typescript
// User creates filters in UI:
// - First Name contains "Paul"
// - Status in ["open", "closed"]

// Generated QueryKit string:
"firstName @=* Paul && status ^^ [open, closed]"
```

---

## Architecture

### Design Philosophy

The filter builder follows several key architectural principles:

1. **Separation of Concerns**: UI components, state logic, and conversion utilities are cleanly separated
2. **Immutable State**: All state updates return new objects (no mutations)
3. **Type Safety**: Comprehensive TypeScript types throughout
4. **Composability**: Small, focused components that work together
5. **Recursion**: Tree-like structure supports arbitrary nesting of filter groups

### Data Flow

```
User Interaction
    ↓
FilterPropertyMenu (select property)
    ↓
Control Component (text/multiselect/date/number/boolean)
    ↓
Filter State Update (via state utilities)
    ↓
FilterBuilder re-renders
    ↓
QueryKit Converter generates string
    ↓
Parent component receives onChange event
```

---

## Tech Stack

### Core Dependencies

| Library | Purpose | Version |
|---------|---------|---------|
| React 19 | Component framework | Latest |
| TypeScript | Type safety | Latest |
| @dnd-kit | Drag and drop | Latest |
| TanStack Router | Routing (test page) | Latest |
| date-fns | Date manipulation | Latest |
| Radix UI | Accessible primitives | Latest |
| Tailwind CSS v4 | Styling | Latest |
| shadcn/ui | Component library | Latest |
| Lucide React | Icons | Latest |

### Key Libraries Explained

**@dnd-kit**: Provides drag-and-drop functionality for reordering filters
- Lightweight and performant
- Accessibility built-in
- Supports nested sortable contexts

**date-fns**: Handles date formatting and manipulation
- Used for date presets (Today, This Week, etc.)
- Formats dates to ISO 8601 for QueryKit

**Radix UI**: Foundation for shadcn/ui components
- Dialog, Dropdown, Checkbox, etc.
- Ensures keyboard navigation and screen reader support

---

## Type System

### Core Types

#### Filter
Represents a single filter condition.

```typescript
interface Filter {
  id: string;                    // Unique identifier (UUID)
  propertyKey: string;           // Backend property name (e.g., "firstName")
  propertyLabel: string;         // Display name (e.g., "First Name")
  controlType: ControlType;      // UI control to use
  operator: OperatorType;        // Comparison operator
  value: string | string[] | number | boolean | DateValue;
  caseSensitive?: boolean;       // For text operators
}
```

#### FilterGroup
Represents a logical group of filters with an AND/OR operator.

```typescript
interface FilterGroup {
  id: string;
  type: 'group';                 // Discriminator for type guard
  filters: (Filter | FilterGroup)[];  // Recursive nesting support
  logicalOperator: 'AND' | 'OR';
}
```

#### FilterState
The root state object that contains all filters.

```typescript
interface FilterState {
  filters: (Filter | FilterGroup)[];
  rootLogicalOperator: 'AND' | 'OR';
}
```

#### DateValue
Special value type for date filters.

```typescript
interface DateValue {
  mode: 'before' | 'after' | 'between' | 'on' | 'excluding';
  startDate: Date;
  endDate?: Date;        // Only for 'between' mode
  exclude?: boolean;     // Inverts logic for 'between' mode
}
```

### Operator Types

The system supports 40+ operators across different categories:

```typescript
type OperatorType =
  // Equality: ==, !=, ==*, !=*
  // Comparison: >, <, >=, <=
  // String: _=, !_=, _-=, !_-=, @=, !@= (with * variants)
  // Phonetic: ~~, !~
  // Existence: ^$, !^$, ^$*, !^$*
  // Collection: ^^, !^^, ^^*, !^^*
  // Count: #==, #!=, #>, #<, #>=, #<=
```

**Case Sensitivity**: Operators ending with `*` are case-insensitive (e.g., `@=*` for case-insensitive contains).

### Configuration Types

#### FilterConfig
Defines a filterable property and its available options.

```typescript
interface FilterConfig {
  propertyKey: string;
  propertyLabel: string;
  controlType: 'text' | 'multiselect' | 'date' | 'number' | 'boolean';
  operators?: OperatorType[];              // Allowed operators (defaults to all for type)
  options?: FilterOption[];                // For multiselect
  defaultOperator?: OperatorType;
}
```

#### FilterPreset
Pre-configured filter combinations for quick access.

```typescript
interface FilterPreset {
  label: string;
  filter: FilterState;
}
```

---

## Component Hierarchy

```
<FilterBuilder>                              # Main orchestrator
├── <DndContext>                             # Drag-and-drop container
│   ├── <FilterPropertyMenu>                 # "Add Filter" dropdown
│   │   ├── <TextFilterModal>                # Text filter dialog
│   │   └── <DropdownMenuSub>                # Other filter types
│   │       ├── <MultiSelectFilter>
│   │       ├── <DateFilter>
│   │       ├── <NumberFilter>
│   │       └── <BooleanFilter>
│   │
│   ├── <SortableContext>                    # Sortable filter list
│   │   └── For each filter:
│   │       ├── <SortableFilterItem>         # Individual filter
│   │       │   ├── Drag handle (GripVertical)
│   │       │   ├── Checkbox (for grouping)
│   │       │   └── <FilterBadge>            # Visual representation
│   │       │
│   │       └── <FilterGroup>                # Nested group
│   │           ├── Group header with controls
│   │           └── Recursive filter list
│   │
│   └── <DragOverlay>                        # Visual feedback while dragging
│
├── Preset buttons                           # Quick filter presets
├── <FilterEditModal>                        # Edit existing filter
└── Empty state message
```

---

## State Management

### State Structure

The filter state is a tree structure that can be arbitrarily nested:

```typescript
{
  filters: [
    // Simple filter at root level
    {
      id: "uuid-1",
      propertyKey: "status",
      propertyLabel: "Status",
      controlType: "multiselect",
      operator: "^^",
      value: ["open", "closed"]
    },

    // Group at root level
    {
      id: "uuid-2",
      type: "group",
      logicalOperator: "AND",
      filters: [
        // Filter inside group
        { id: "uuid-3", propertyKey: "firstName", ... },

        // Nested group (up to 3 levels deep)
        {
          id: "uuid-4",
          type: "group",
          logicalOperator: "OR",
          filters: [ ... ]
        }
      ]
    }
  ],
  rootLogicalOperator: "AND"
}
```

### State Utilities

All state modifications use immutable utility functions from `utils/filter-state.ts`:

```typescript
// Adding filters
addFilter(state, filter)              // Add to root
addFilterToGroup(state, groupId, filter)

// Removing
removeFilter(state, filterId)         // Recursively removes from anywhere

// Updating
updateFilter(state, filterId, updates)

// Grouping
createGroupFromSelected(state, filterIds, operator)
ungroupFilters(state, groupId)        // Moves filters to parent level

// Reordering
reorderFilters(state, startIndex, endIndex)

// Operators
toggleRootLogicalOperator(state)
toggleGroupLogicalOperator(state, groupId)
```

### Depth Management

To prevent excessive nesting, the system enforces a maximum depth of 3 levels:

```typescript
MAX_NESTING_DEPTH = 3

// Level 0: Root
// Level 1: First-level groups
// Level 2: Groups inside groups
// Level 3: Groups inside groups inside groups (maximum)
```

Utilities in `utils/depth.ts` calculate and validate nesting:

```typescript
calculateDepth(state, targetId)          // Find depth of an item
canCreateGroup(state, filterIds)         // Check if grouping is allowed
getMaximumDepth(state)                   // Get current max depth
```

---

## QueryKit Conversion

### Conversion Process

The `toQueryKitString()` function recursively converts the filter state to a QueryKit-compatible string:

```typescript
toQueryKitString(state: FilterState): string
```

**Algorithm:**
1. Traverse the filter tree recursively
2. For each filter, format based on control type and operator
3. Combine filters with logical operators (`&&` or `||`)
4. Wrap groups in parentheses for proper precedence
5. Handle special cases (dates, arrays, case sensitivity)

### Conversion Rules by Type

#### Text Filters
```typescript
// Input
{ propertyKey: "firstName", operator: "@=*", value: "paul" }

// Output
"firstName @=* paul"

// With spaces (quoted)
{ propertyKey: "firstName", operator: "==", value: "John Doe" }
// Output: 'firstName == "John Doe"'
```

#### Multiselect Filters
```typescript
// Input
{ propertyKey: "status", operator: "^^", value: ["open", "closed"] }

// Output
"status ^^ [open, closed]"
```

#### Date Filters
```typescript
// Mode: "on"
{ mode: "on", startDate: new Date("2024-01-15") }
// Output: "createdAt == \"2024-01-15\""

// Mode: "between"
{ mode: "between", startDate: ..., endDate: ... }
// Output: "(createdAt >= \"2024-01-01\" && createdAt <= \"2024-01-31\")"

// Mode: "between" with exclude=true
// Output: "(createdAt < \"2024-01-01\" || createdAt > \"2024-01-31\")"
```

#### Number Filters
```typescript
{ propertyKey: "age", operator: ">", value: 18 }
// Output: "age > 18"
```

#### Boolean Filters
```typescript
{ propertyKey: "isActive", operator: "==", value: true }
// Output: "isActive == true"
```

### Grouping and Precedence

Groups are wrapped in parentheses to ensure correct evaluation:

```typescript
// State with group
{
  filters: [
    { type: "group", logicalOperator: "AND", filters: [filter1, filter2] },
    filter3
  ],
  rootLogicalOperator: "OR"
}

// Output
"(firstName == Paul && age < 30) || lastName == Smith"
```

---

## Core Components

### FilterBuilder
**Location**: `filter-builder.tsx`

The main component that orchestrates the entire filter builder.

**Key Responsibilities:**
- Manages filter state
- Handles drag-and-drop operations
- Coordinates grouping mode
- Renders filter badges and groups
- Emits state changes via `onChange` prop

**Props:**
```typescript
interface FilterBuilderProps {
  filterOptions: FilterConfig[];    // Available properties
  presets?: FilterPreset[];          // Quick filter presets
  onChange?: (state: FilterState) => void;
  initialState?: FilterState;
  className?: string;
}
```

**Usage:**
```typescript
<FilterBuilder
  filterOptions={myFilterOptions}
  presets={myPresets}
  onChange={(state) => {
    const queryString = toQueryKitString(state);
    console.log(queryString);
  }}
/>
```

---

### FilterPropertyMenu
**Location**: `filter-property-menu.tsx`

Dropdown menu for selecting which property to filter on.

**Features:**
- Searchable property list
- Routes to appropriate control component based on `controlType`
- Text filters open a modal (more space for options)
- Other types use dropdown submenus

**User Flow:**
1. Click "Add Filter" button
2. Search for property (optional)
3. Click property name
4. Fill in filter details in the appropriate control
5. Submit to add filter to state

---

### FilterBadge
**Location**: `filter-badge.tsx`

Visual representation of a single filter.

**Display Format:**
```
Property Label | Operator Label | Value
```

**Example:**
```
First Name | Contains | Paul
Status | In | open, closed
Created Date | Between | Jan 1, 2024 - Jan 31, 2024
```

**Interactions:**
- **Click**: Opens edit modal
- **X button**: Removes filter
- **Case-sensitive icon**: Shows for case-sensitive text filters

**Value Formatting:**
- Arrays: Shows first 3 values or count
- Dates: Formatted as "MMM d, yyyy"
- Booleans: "True" or "False"
- Numbers: As-is

---

### FilterGroup
**Location**: `filter-group.tsx`

Visual container for grouped filters.

**Features:**
- Color-coded border based on depth (blue → purple → pink)
- Drag handle for reordering
- Logical operator toggle (AND/OR)
- Ungroup button
- Delete button
- Recursive rendering for nested groups

**Visual Hierarchy:**
- Depth 0: Root level (no group card)
- Depth 1: Blue left border
- Depth 2: Purple left border
- Depth 3: Pink left border (maximum)

---

### Control Components

Located in `controls/` directory:

#### TextFilterModal
- **UI**: Modal dialog
- **Fields**: Operator dropdown, text input, case-sensitive checkbox
- **Operators**: Equals, Not Equals, Contains, Starts With, Ends With, etc.
- **Enter key**: Submits the form

#### MultiSelectFilter
- **UI**: Dropdown submenu
- **Fields**: Operator selector, search input, checkbox list
- **Features**: "Only" button (select single), "Select All/Deselect All"
- **Operators**: In, Not In

#### DateFilter
- **UI**: Dropdown submenu with calendar
- **Modes**: On, Before, After, Between
- **Presets**: Today, This Week, Last Month, etc.
- **Exclude checkbox**: Inverts the logic

#### NumberFilter
- **UI**: Dropdown submenu
- **Fields**: Operator dropdown, number input
- **Operators**: Comparison and count operators

#### BooleanFilter
- **UI**: Dropdown submenu
- **Fields**: True/False buttons
- **Simple**: One-click filter creation

#### FilterEditModal
- **Purpose**: Wrapper for editing existing filters
- **Behavior**: Routes to appropriate control component with initial values
- **Updates**: Modifies filter in-place rather than creating new

---

## Utilities & Helper Functions

### Operators (`utils/operators.ts`)

**Constants:**
```typescript
Operators.CONTAINS           // "@="
Operators.EQUALS            // "=="
Operators.IN                // "^^"
LogicalOperators.AND        // "AND"
LogicalOperators.OR         // "OR"
```

**Metadata:**
```typescript
OPERATORS: Record<OperatorType, OperatorMetadata>
```

Each operator has:
- `symbol`: The QueryKit operator string
- `label`: Human-readable name
- `appliesTo`: Which control types can use it
- `description`: Explanation of the operator

**Functions:**
```typescript
getOperatorsForControlType(controlType)   // Get all valid operators
getDefaultOperator(controlType)           // Get recommended default
getOperatorLabel(operator)                // Get display label
```

---

### Filter State (`utils/filter-state.ts`)

See [State Management](#state-management) section above.

Key pattern: All functions take `state` and return a new `state` (immutable).

---

### Depth Management (`utils/depth.ts`)

```typescript
MAX_NESTING_DEPTH = 3

calculateDepth(state, targetId)
// Returns the depth of an item (0 = root, 1 = first group, etc.)

canCreateGroup(state, filterIds)
// Returns { canCreate: boolean, reason?: string }
// Checks:
//   - At least 2 filters
//   - All at same level
//   - Won't exceed max depth

getMaximumDepth(state)
// Returns the deepest nesting level in the current state
```

---

### QueryKit Converter (`utils/querykit-converter.ts`)

```typescript
toQueryKitString(state: FilterState): string
// Main conversion function

validateFilterState(state: FilterState)
// Returns { valid: boolean, errors: string[] }
// Checks for:
//   - Missing required fields
//   - Empty arrays
//   - Invalid date ranges
```

---

## Usage Guide

### Basic Setup

**1. Define your filter options:**

```typescript
const filterOptions: FilterConfig[] = [
  {
    propertyKey: 'status',
    propertyLabel: 'Status',
    controlType: 'multiselect',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' }
    ],
    defaultOperator: '^^'
  },
  {
    propertyKey: 'firstName',
    propertyLabel: 'First Name',
    controlType: 'text',
    operators: ['==', '!=', '@=', '_='],
    defaultOperator: '@='
  },
  {
    propertyKey: 'createdAt',
    propertyLabel: 'Created Date',
    controlType: 'date'
  }
];
```

**2. Create presets (optional):**

```typescript
const presets: FilterPreset[] = [
  {
    label: 'My Open Items',
    filter: {
      filters: [
        {
          id: crypto.randomUUID(),
          propertyKey: 'assignee',
          propertyLabel: 'Assignee',
          controlType: 'multiselect',
          operator: '^^',
          value: ['current-user']
        },
        {
          id: crypto.randomUUID(),
          propertyKey: 'status',
          propertyLabel: 'Status',
          controlType: 'multiselect',
          operator: '^^',
          value: ['open']
        }
      ],
      rootLogicalOperator: 'AND'
    }
  }
];
```

**3. Use the component:**

```typescript
function MyPage() {
  const [filterState, setFilterState] = useState<FilterState>({
    filters: [],
    rootLogicalOperator: 'AND'
  });

  const handleFilterChange = (state: FilterState) => {
    setFilterState(state);
    const queryString = toQueryKitString(state);
    console.log('QueryKit string:', queryString);

    // Send to API
    fetchData({ filter: queryString });
  };

  return (
    <FilterBuilder
      filterOptions={filterOptions}
      presets={presets}
      onChange={handleFilterChange}
      initialState={filterState}
    />
  );
}
```

---

## Advanced Features

### Drag and Drop Reordering

The filter builder uses `@dnd-kit` to enable drag-and-drop:

**How it works:**
1. Each filter/group has a drag handle (grip icon)
2. Dragging shows a visual overlay
3. Dropping reorders within the current level
4. Cannot drag between different nesting levels (yet)

**Future Enhancement:**
- Drag filters into/out of groups
- Drag multiple selected items at once

---

### Grouping Workflow

**Entering Grouping Mode:**
1. Click "Group Filters" button
2. Checkboxes appear next to all filters
3. Select 2+ filters at the same level
4. Click "Group Selected"
5. New group is created with selected filters

**Limitations:**
- Can only group filters at the same nesting level
- Cannot exceed maximum depth of 3
- At least 2 items required

**Ungrouping:**
- Click "Ungroup" button on any group
- Filters move to parent level
- Group is removed

---

### Filter Editing

**How to edit:**
1. Click on any filter badge
2. Modal/dialog opens with current values pre-filled
3. Modify values
4. Click "Update Filter"
5. Filter is updated in-place

**What can be edited:**
- Operator
- Value(s)
- Case sensitivity (text filters)
- Date mode and range
- Everything except property key/label

---

### Logical Operators

**Root Level:**
- Button appears when 2+ filters at root
- Click to toggle between AND/OR
- Label shows: "Switch to OR" or "Switch to AND"

**Group Level:**
- Each group has its own operator
- Independent of root and other groups
- Click operator button in group header to toggle

**Visual Display:**
- Operator shown between filters: `filter1 AND filter2 OR filter3`
- Groups use parentheses in QueryKit output

---

## Extending the System

### Adding a New Control Type

**1. Define the type:**
```typescript
// In types.ts
type ControlType = 'text' | 'multiselect' | 'date' | 'number' | 'boolean' | 'yourtype';
```

**2. Create the control component:**
```typescript
// In controls/yourtype-filter.tsx
export function YourTypeFilter({
  propertyKey,
  propertyLabel,
  onSubmit,
  initialFilter
}: YourTypeFilterProps) {
  const handleSubmit = () => {
    onSubmit({
      propertyKey,
      propertyLabel,
      controlType: 'yourtype',
      operator: someOperator,
      value: yourValue
    });
  };

  return <div>Your UI here</div>;
}
```

**3. Add operators:**
```typescript
// In utils/operators.ts
export const Operators = {
  // ...existing
  YOUR_NEW_OPERATOR: 'your_symbol' as OperatorType,
};

export const OPERATORS: Record<OperatorType, OperatorMetadata> = {
  // ...existing
  'your_symbol': {
    symbol: 'your_symbol',
    label: 'Your Label',
    appliesTo: ['yourtype'],
    description: 'Description'
  }
};
```

**4. Add to property menu:**
```typescript
// In filter-property-menu.tsx
{config.controlType === 'yourtype' && (
  <YourTypeFilter
    propertyKey={config.propertyKey}
    propertyLabel={config.propertyLabel}
    onSubmit={handleFilterSubmit}
  />
)}
```

**5. Add QueryKit conversion:**
```typescript
// In utils/querykit-converter.ts
case 'yourtype':
  return convertYourTypeFilter(propertyKey, operator, value);
```

**6. Add to edit modal:**
```typescript
// In controls/filter-edit-modal.tsx
{filter.controlType === 'yourtype' && (
  <YourTypeFilter ... />
)}
```

---

### Adding New Operators

**1. Define the operator type:**
```typescript
// In types.ts
type OperatorType =
  | ... existing ...
  | 'your_new_operator';
```

**2. Add metadata:**
```typescript
// In utils/operators.ts
export const Operators = {
  YOUR_NEW_OPERATOR: 'your_new_operator' as OperatorType,
};

export const OPERATORS: Record<OperatorType, OperatorMetadata> = {
  'your_new_operator': {
    symbol: 'your_new_operator',
    label: 'Your Operator Label',
    appliesTo: ['text', 'number'], // Which control types can use it
    description: 'What this operator does'
  }
};
```

**3. Handle in QueryKit converter:**
```typescript
// In utils/querykit-converter.ts
// The operator will be automatically used in the conversion
// Just ensure your operator symbol is valid QueryKit syntax
```

---

### Customizing Presets

Presets are just pre-configured `FilterState` objects:

```typescript
const customPresets: FilterPreset[] = [
  {
    label: 'High Priority Bugs',
    filter: {
      filters: [
        {
          id: crypto.randomUUID(),
          propertyKey: 'priority',
          propertyLabel: 'Priority',
          controlType: 'number',
          operator: '>=',
          value: 8
        },
        {
          id: crypto.randomUUID(),
          propertyKey: 'labels',
          propertyLabel: 'Labels',
          controlType: 'multiselect',
          operator: '^$',
          value: ['bug']
        }
      ],
      rootLogicalOperator: 'AND'
    }
  },
  {
    label: 'Complex Query Example',
    filter: {
      filters: [
        {
          id: crypto.randomUUID(),
          type: 'group',
          filters: [
            // Filters inside group
          ],
          logicalOperator: 'OR'
        },
        // More root-level filters
      ],
      rootLogicalOperator: 'AND'
    }
  }
];
```

---

### Styling Customization

The component uses Tailwind CSS and shadcn/ui components. Customize by:

**1. Override className:**
```typescript
<FilterBuilder className="my-custom-classes" ... />
```

**2. Modify component styles:**
```typescript
// In filter-badge.tsx
<Badge className={cn("your-custom-classes", className)}>
```

**3. Adjust depth colors:**
```typescript
// In filter-group.tsx
const depthColors = [
  "border-l-blue-500",   // Change to your colors
  "border-l-purple-500",
  "border-l-pink-500",
];
```

---

## Testing Guide

### Test Page

Navigate to `/filter-test` to see a comprehensive demo with:
- All control types
- Multiple preset examples
- Live QueryKit string output
- Live JSON state output

### Manual Testing Checklist

- [ ] Add text filter with case sensitivity
- [ ] Add multiselect filter with multiple values
- [ ] Add date filter with "between" mode
- [ ] Add number and boolean filters
- [ ] Remove filters using X button
- [ ] Edit filters by clicking badges
- [ ] Toggle AND/OR operators
- [ ] Create groups from 2+ filters
- [ ] Create nested groups (up to depth 3)
- [ ] Ungroup filters
- [ ] Reorder filters by dragging
- [ ] Apply presets
- [ ] Clear all filters
- [ ] Verify QueryKit string output

### Edge Cases to Test

1. **Empty state**: No filters applied
2. **Single filter**: Verify no operator shown
3. **Maximum depth**: Try creating group at depth 3 (should fail)
4. **Cross-level grouping**: Try grouping filters from different depths (should fail)
5. **Empty groups**: Groups with no filters (should show message)
6. **Special characters**: Test with spaces, quotes, special chars in text
7. **Date ranges**: Test "between" with exclude checkbox

---

## Common Patterns

### Programmatically Setting Filters

```typescript
import { addFilter, createGroupFromSelected } from '~/components/filter-builder';

// Start with empty state
let state: FilterState = {
  filters: [],
  rootLogicalOperator: 'AND'
};

// Add first filter
const filter1: Filter = {
  id: crypto.randomUUID(),
  propertyKey: 'status',
  propertyLabel: 'Status',
  controlType: 'multiselect',
  operator: '^^',
  value: ['open']
};
state = addFilter(state, filter1);

// Add second filter
const filter2: Filter = { /* ... */ };
state = addFilter(state, filter2);

// Group them
state = createGroupFromSelected(state, [filter1.id, filter2.id], 'AND');
```

### Validating Before Submission

```typescript
import { validateFilterState, toQueryKitString } from '~/components/filter-builder';

const handleSubmit = () => {
  const validation = validateFilterState(filterState);

  if (!validation.valid) {
    console.error('Invalid filter state:', validation.errors);
    alert('Please fix filter errors');
    return;
  }

  const queryString = toQueryKitString(filterState);
  // Send to API
};
```

### Persisting Filters

```typescript
// Save to localStorage
const saveFilters = (state: FilterState) => {
  localStorage.setItem('savedFilters', JSON.stringify(state));
};

// Load from localStorage
const loadFilters = (): FilterState => {
  const saved = localStorage.getItem('savedFilters');
  return saved ? JSON.parse(saved) : { filters: [], rootLogicalOperator: 'AND' };
};

// Use as initial state
<FilterBuilder initialState={loadFilters()} ... />
```

---

## Architecture Diagrams

### Component Tree
```
FilterBuilder (state container)
│
├─ FilterPropertyMenu (add filters)
│  ├─ Search Input
│  └─ Property List
│     └─ Control Component
│        ├─ TextFilterModal
│        ├─ MultiSelectFilter
│        ├─ DateFilter
│        ├─ NumberFilter
│        └─ BooleanFilter
│
├─ Filter Display (DnD context)
│  ├─ SortableFilterItem
│  │  ├─ Drag Handle
│  │  ├─ Checkbox (grouping)
│  │  └─ FilterBadge
│  │
│  └─ FilterGroup (recursive)
│     ├─ Group Header
│     │  ├─ Operator Toggle
│     │  ├─ Ungroup Button
│     │  └─ Delete Button
│     └─ Child Filters (recursive)
│
├─ Grouping Controls
│  ├─ Group Filters Button
│  └─ Create Group Button
│
├─ Preset Buttons
│
└─ Edit Modal (overlay)
```

### State Flow
```
User Action
    ↓
Event Handler (FilterBuilder)
    ↓
State Utility Function
    ↓
Immutable State Update
    ↓
React Re-render
    ↓
[1] UI Updates
[2] onChange Callback Fired
    ↓
Parent Component
    ↓
toQueryKitString()
    ↓
API Request
```

---

## Troubleshooting

### Common Issues

**Issue**: Filters not appearing after adding
- **Cause**: State not updating correctly
- **Fix**: Ensure `onChange` prop is passed and parent state is updated

**Issue**: Drag-and-drop not working
- **Cause**: Missing DndContext or SortableContext
- **Fix**: Verify component hierarchy (already set up correctly)

**Issue**: QueryKit string looks wrong
- **Cause**: Incorrect operator or value formatting
- **Fix**: Check `toQueryKitString` logic and operator metadata

**Issue**: Cannot create group
- **Cause**: Filters at different depths or max depth exceeded
- **Fix**: Check `canCreateGroup` validation in console

**Issue**: Edited filter reverts to old value
- **Cause**: Not updating state correctly in edit handler
- **Fix**: Verify `updateFilter` is called with correct ID

---

## Performance Considerations

### Optimization Strategies

1. **Memoization**: useMemo for filtered options and computed values
2. **Virtualization**: Not currently implemented, but could help with 100+ filter options
3. **Debouncing**: Search inputs are not debounced (immediate filter)
4. **State Structure**: Flat structure would be more performant, but less flexible
5. **Re-renders**: React 19's automatic batching helps minimize re-renders

### Scalability Limits

- **Filter Count**: Tested up to 50 active filters (performs well)
- **Nesting Depth**: Hard limit of 3 levels
- **Option Count**: Multiselect with 1000+ options may benefit from virtualization
- **Drag Operations**: Smooth up to 100 items

---

## Future Enhancements

### Planned Features
1. **Saved Filters**: Allow users to save and name filter configurations
2. **Filter Validation**: Validate values based on data type (e.g., valid email format)
3. **Filter Suggestions**: Auto-suggest values based on existing data
4. **Bulk Operations**: Select and delete/group multiple items at once
5. **Regex Support**: Add regex operator for advanced text matching
6. **Performance**: Virtual scrolling for large option lists
7. **Mobile**: Touch-optimized drag-and-drop

### Potential Improvements
- Keyboard shortcuts (Cmd+G to group, Delete to remove)
- Undo/redo for filter changes
- Filter history
- Export/import filter configurations as JSON
- Visual query builder mode (flowchart-style)

---

## Resources

### Documentation Links
- [QueryKit GitHub](https://github.com/pdevito3/QueryKit)
- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [shadcn/ui Components](https://ui.shadcn.com/)

### File Locations
- **Components**: `src/components/filter-builder/`
- **Types**: `src/components/filter-builder/types.ts`
- **Utilities**: `src/components/filter-builder/utils/`
- **Test Page**: `src/routes/filter-test.tsx`
- **Plan Document**: `example-ui/FILTER_COMPONENT_PLAN.md`

---

## Questions?

For questions or contributions, refer to:
1. Implementation plan: `FILTER_COMPONENT_PLAN.md`
2. Test page: `/filter-test` route
3. Code examples: See test page source in `src/routes/filter-test.tsx`

---

**Last Updated**: November 2024
**Current Version**: 1.0
**Maintained By**: Development Team

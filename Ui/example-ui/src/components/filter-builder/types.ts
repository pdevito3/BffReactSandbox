// Core filter types for the FilterBuilder component

export type ControlType = 'text' | 'multiselect' | 'date' | 'number' | 'boolean';

export type OperatorType =
  // Equality
  | '==' | '!=' | '==*' | '!=*'
  // Comparison
  | '>' | '<' | '>=' | '<='
  // String
  | '_=' | '!_=' | '_-=' | '!_-=' | '@=' | '!@='
  | '_=*' | '!_=*' | '_-=*' | '!_-=*' | '@=*' | '!@=*'
  // Phonetic
  | '~~' | '!~'
  // Existence
  | '^$' | '!^$' | '^$*' | '!^$*'
  // Collection
  | '^^' | '!^^' | '^^*' | '!^^*'
  // Count
  | '#==' | '#!=' | '#>' | '#<' | '#>=' | '#<=';

export type LogicalOperator = 'AND' | 'OR';

export interface DateValue {
  mode: 'before' | 'after' | 'between' | 'on' | 'excluding';
  startDate: Date;
  endDate?: Date; // Only for 'between' mode
  exclude?: boolean; // When true with 'between' mode, becomes OR logic (outside range)
}

export interface Filter {
  id: string;
  propertyKey: string;
  propertyLabel: string;
  controlType: ControlType;
  operator: OperatorType;
  value: string | string[] | number | boolean | DateValue;
  caseSensitive?: boolean; // For text operators
}

export interface FilterGroup {
  id: string;
  type: 'group';
  filters: (Filter | FilterGroup)[];
  logicalOperator: LogicalOperator;
}

export interface FilterState {
  filters: (Filter | FilterGroup)[];
  rootLogicalOperator: LogicalOperator;
}

export interface FilterOption {
  value: string;
  label: string;
  isNested?: boolean; // If true, this option is nested under a group and won't be selected by "Select All"
}

export interface FilterConfig {
  propertyKey: string;
  propertyLabel: string;
  controlType: ControlType;
  operators?: OperatorType[]; // Allowed operators for this property (defaults to all for the type)
  options?: FilterOption[]; // For multiselect control type
  defaultOperator?: OperatorType; // Default operator when adding a filter
}

export interface FilterPreset {
  label: string;
  filter: FilterState;
}

export interface FilterBuilderProps {
  filterOptions: FilterConfig[];
  presets?: FilterPreset[];
  onChange?: (state: FilterState) => void;
  initialState?: FilterState;
  className?: string;
}

// Type guard functions
export function isFilter(item: Filter | FilterGroup): item is Filter {
  return !('type' in item);
}

export function isFilterGroup(item: Filter | FilterGroup): item is FilterGroup {
  return 'type' in item && item.type === 'group';
}

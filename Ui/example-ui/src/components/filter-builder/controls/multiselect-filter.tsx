import { useState, useMemo } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Checkbox } from '~/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '~/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import type { OperatorType, Filter, FilterOption } from '../types';
import { getOperatorLabel, Operators } from '../utils/operators';

interface MultiSelectFilterProps {
  propertyKey: string;
  propertyLabel: string;
  options: FilterOption[];
  onSubmit: (filter: Omit<Filter, 'id'>) => void;
  initialFilter?: Filter; // For editing existing filter
  allowedOperators?: OperatorType[];
}

export function MultiSelectFilter({
  propertyKey,
  propertyLabel,
  options,
  onSubmit,
  initialFilter,
  allowedOperators = [Operators.IN, Operators.NOT_IN],
}: MultiSelectFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<string[]>(
    (initialFilter?.value as string[]) || []
  );
  const [operator, setOperator] = useState<OperatorType>(
    initialFilter?.operator || Operators.IN
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lower = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        opt.value.toLowerCase().includes(lower)
    );
  }, [options, searchTerm]);

  // Only consider root-level (non-nested) options for "Select All"
  const rootOptions = useMemo(() => options.filter(opt => !opt.isNested), [options]);
  const allRootSelected = rootOptions.length > 0 && rootOptions.every(opt => selected.includes(opt.value));

  const toggleOption = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const selectOnly = (value: string) => {
    setSelected([value]);
  };

  const toggleAll = () => {
    if (allRootSelected) {
      // Deselect all root options, but keep any nested options that were selected
      const nestedValues = options.filter(opt => opt.isNested).map(opt => opt.value);
      setSelected(selected.filter(v => nestedValues.includes(v)));
    } else {
      // Select all root options, keeping any already-selected nested options
      const rootValues = rootOptions.map(opt => opt.value);
      const nestedSelected = selected.filter(v => !rootValues.includes(v));
      setSelected([...rootValues, ...nestedSelected]);
    }
  };

  const handleSubmit = () => {
    if (selected.length === 0) {
      return;
    }

    onSubmit({
      propertyKey,
      propertyLabel,
      controlType: 'multiselect',
      operator,
      value: selected,
    } as Omit<Filter, 'id'>);
  };

  return (
    <div className="w-64 space-y-2 p-2">
      {/* Operator selector */}
      <div className="space-y-1">
        <label className="text-xs font-medium">Operator</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              {getOperatorLabel(operator)}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {allowedOperators.map((op) => (
              <DropdownMenuItem key={op} onClick={() => setOperator(op)}>
                {getOperatorLabel(op)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search input */}
      <Input
        placeholder="Filter options..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        autoFocus
        className="h-8"
      />

      {/* Options list */}
      <div className="max-h-48 overflow-y-auto border rounded-md">
        {filteredOptions.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No options found
          </div>
        ) : (
          filteredOptions.map((option) => (
            <div
              key={option.value}
              className="flex items-center justify-between px-2 py-1.5 hover:bg-accent group"
            >
              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => toggleOption(option.value)}
                />
                <span className="text-sm">{option.label}</span>
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => selectOnly(option.value)}
              >
                Only
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {allRootSelected ? 'Deselect All' : 'Select All'}
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={selected.length === 0}>
          {initialFilter ? 'Update' : 'Add'} ({selected.length})
        </Button>
      </div>
    </div>
  );
}

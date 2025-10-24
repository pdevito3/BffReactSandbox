import { useState, useMemo } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '~/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import type { FilterConfig, Filter } from './types';
import { TextFilterModal } from './controls/text-filter-modal';
import { MultiSelectFilter } from './controls/multiselect-filter';
import { DateFilter } from './controls/date-filter';
import { NumberFilter } from './controls/number-filter';
import { BooleanFilter } from './controls/boolean-filter';

interface FilterPropertyMenuProps {
  options: FilterConfig[];
  onAddFilter: (filter: Omit<Filter, 'id'>) => void;
}

export function FilterPropertyMenu({ options, onAddFilter }: FilterPropertyMenuProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [textFilterModalOpen, setTextFilterModalOpen] = useState(false);
  const [selectedTextProperty, setSelectedTextProperty] = useState<FilterConfig | null>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lower = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.propertyLabel.toLowerCase().includes(lower) ||
        opt.propertyKey.toLowerCase().includes(lower)
    );
  }, [options, searchTerm]);

  const handleTextPropertyClick = (config: FilterConfig) => {
    setSelectedTextProperty(config);
    setTextFilterModalOpen(true);
    setDropdownOpen(false);
    setSearchTerm('');
  };

  const handleTextFilterSubmit = (filter: Omit<Filter, 'id'>) => {
    onAddFilter(filter);
    setTextFilterModalOpen(false);
    setSelectedTextProperty(null);
  };

  const handleFilterSubmit = (filter: Omit<Filter, 'id'>) => {
    onAddFilter(filter);
    setDropdownOpen(false);
    setSearchTerm('');
  };

  const handleDropdownOpenChange = (open: boolean) => {
    setDropdownOpen(open);
    if (!open) {
      setSearchTerm('');
    }
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={handleDropdownOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <div className="p-2">
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>
          <DropdownMenuSeparator />

          <div className="max-h-72 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No properties found
              </div>
            ) : (
              filteredOptions.map((config) => {
                // Text filters use a modal instead of submenu
                if (config.controlType === 'text') {
                  return (
                    <DropdownMenuItem
                      key={config.propertyKey}
                      onClick={() => handleTextPropertyClick(config)}
                    >
                      {config.propertyLabel}
                      <FileText className="ml-auto h-4 w-4 text-muted-foreground" />
                    </DropdownMenuItem>
                  );
                }

                // Other control types use submenus with popovers
                return (
                  <DropdownMenuSub key={config.propertyKey}>
                    <DropdownMenuSubTrigger>
                      {config.propertyLabel}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {config.controlType === 'multiselect' && (
                        <MultiSelectFilter
                          propertyKey={config.propertyKey}
                          propertyLabel={config.propertyLabel}
                          options={config.options || []}
                          onSubmit={handleFilterSubmit}
                          allowedOperators={config.operators}
                        />
                      )}
                      {config.controlType === 'date' && (
                        <DateFilter
                          propertyKey={config.propertyKey}
                          propertyLabel={config.propertyLabel}
                          onSubmit={handleFilterSubmit}
                        />
                      )}
                      {config.controlType === 'number' && (
                        <NumberFilter
                          propertyKey={config.propertyKey}
                          propertyLabel={config.propertyLabel}
                          onSubmit={handleFilterSubmit}
                          allowedOperators={config.operators}
                        />
                      )}
                      {config.controlType === 'boolean' && (
                        <BooleanFilter
                          propertyKey={config.propertyKey}
                          propertyLabel={config.propertyLabel}
                          onSubmit={handleFilterSubmit}
                        />
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              })
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Text filter modal */}
      {selectedTextProperty && (
        <TextFilterModal
          isOpen={textFilterModalOpen}
          onClose={() => {
            setTextFilterModalOpen(false);
            setSelectedTextProperty(null);
          }}
          onSubmit={handleTextFilterSubmit}
          propertyKey={selectedTextProperty.propertyKey}
          propertyLabel={selectedTextProperty.propertyLabel}
          allowedOperators={selectedTextProperty.operators}
        />
      )}
    </>
  );
}

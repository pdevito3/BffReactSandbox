import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { Filter, OperatorType } from "../types";
import {
  getOperatorLabel,
  getOperatorsForControlType,
  Operators,
} from "../utils/operators";

interface TextFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (filter: Omit<Filter, "id">) => void;
  propertyKey: string;
  propertyLabel: string;
  allowedOperators?: OperatorType[];
  initialFilter?: Filter; // For editing existing filter
}

export function TextFilterModal({
  isOpen,
  onClose,
  onSubmit,
  propertyKey,
  propertyLabel,
  allowedOperators,
  initialFilter,
}: TextFilterModalProps) {
  const textOperators = getOperatorsForControlType("text");
  // Filter to only show base operators (without * suffix) - the checkbox controls case sensitivity
  const baseOperators = textOperators.filter((op) => !op.symbol.endsWith("*"));
  const availableOperators = allowedOperators
    ? baseOperators.filter((op) => allowedOperators.includes(op.symbol))
    : baseOperators;

  // Extract base operator and case sensitivity from initial filter
  const initialOperator = initialFilter?.operator || Operators.CONTAINS;
  const initialIsCaseInsensitive = initialOperator.endsWith("*");
  const initialBaseOperator = (
    initialIsCaseInsensitive ? initialOperator.slice(0, -1) : initialOperator
  ) as OperatorType;

  const [value, setValue] = useState((initialFilter?.value as string) || "");
  const [operator, setOperator] = useState<OperatorType>(initialBaseOperator);
  const [caseSensitive, setCaseSensitive] = useState(
    initialFilter ? !initialIsCaseInsensitive : false
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Delay to allow dialog animation to complete
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!value.trim()) {
      return;
    }

    // Convert operator based on case sensitivity
    // If case-insensitive, append * to operator (e.g., @= becomes @=*)
    const finalOperator = caseSensitive
      ? operator
      : (`${operator}*` as OperatorType);

    onSubmit({
      propertyKey,
      propertyLabel,
      controlType: "text",
      operator: finalOperator,
      value: value.trim(),
      caseSensitive,
    } as Omit<Filter, "id">);

    // Reset form
    setValue("");
    setOperator(Operators.CONTAINS);
    setCaseSensitive(false); // Default to case-insensitive
    onClose();
  };

  const selectedOperatorLabel = getOperatorLabel(operator);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialFilter ? "Edit" : "Add"} {propertyLabel} Filter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="operator">Operator</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedOperatorLabel}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                {availableOperators.map((op) => (
                  <DropdownMenuItem
                    key={op.symbol}
                    onClick={() => setOperator(op.symbol)}
                  >
                    {op.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              ref={inputRef}
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Enter ${propertyLabel.toLowerCase()}...`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="case-sensitive"
              checked={caseSensitive}
              onCheckedChange={(checked) =>
                setCaseSensitive(checked as boolean)
              }
            />
            <Label
              htmlFor="case-sensitive"
              className="text-sm font-normal cursor-pointer"
            >
              Case sensitive
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!value.trim()} type="button">
            {initialFilter ? "Update" : "Add"} Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

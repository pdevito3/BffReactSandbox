import * as React from "react"
import { ChevronDown, X, Check } from "lucide-react"
import { useAutoComplete } from "@wispe/wispe-react"

import { cn } from "~/lib/utils"
import { Badge } from "./badge"

interface MultiSelectItem {
  id: string
  label: string
  value: string
}

interface MultiSelectProps<T extends MultiSelectItem> {
  items: T[]
  placeholder?: string
  values?: T[]
  onValuesChange?: (values: T[]) => void
  disabled?: boolean
  className?: string
  itemToString?: (item: T) => string
  maxDisplay?: number
}

export function MultiSelect<T extends MultiSelectItem>({
  items,
  placeholder = "Select items...",
  values = [],
  onValuesChange,
  disabled = false,
  className,
  itemToString = (item) => item.label,
  maxDisplay = 3,
}: MultiSelectProps<T>) {
  const [inputValue, setInputValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  const autocomplete = useAutoComplete<T>({
    mode: "multiple",
    items,
    itemToString,
    state: {
      inputValue,
      setInputValue,
      isOpen,
      setIsOpen,
      disabled,
    },
    onSelectItem: (item) => {
      const isSelected = values.some((v) => v.id === item.id)
      if (isSelected) {
        onValuesChange?.(values.filter((v) => v.id !== item.id))
      } else {
        onValuesChange?.([...values, item])
      }
      setInputValue("")
    },
    onInputValueChange: (value) => {
      setInputValue(value)
      if (!isOpen && value.length > 0) {
        setIsOpen(true)
      }
    },
  })

  const filteredItems = React.useMemo(() => {
    if (!inputValue) return items
    return items.filter((item) =>
      itemToString(item).toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [items, inputValue, itemToString])

  const removeItem = (itemToRemove: T) => {
    onValuesChange?.(values.filter((item) => item.id !== itemToRemove.id))
  }

  const displayValues = values.slice(0, maxDisplay)
  const remainingCount = values.length - maxDisplay

  return (
    <div className={cn("relative", className)}>
      <div
        {...autocomplete.getRootProps()}
        className="relative"
      >
        <div className="relative">
          <div
            className={cn(
              "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <div className="flex flex-1 flex-wrap items-center gap-1">
              {displayValues.map((item) => (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs"
                >
                  {itemToString(item)}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeItem(item)
                    }}
                    className="ml-1 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {itemToString(item)}</span>
                  </button>
                </Badge>
              ))}
              
              {remainingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +{remainingCount} more
                </Badge>
              )}
              
              <input
                {...autocomplete.getInputProps()}
                placeholder={values.length === 0 ? placeholder : ""}
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-8"
              />
            </div>
            
            <div className="flex items-center gap-1">
              {values.length > 0 && (
                <button
                  type="button"
                  onClick={() => onValuesChange?.([])}
                  className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Clear all</span>
                </button>
              )}
              
              <button
                {...autocomplete.getDisclosureProps()}
                className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center"
              >
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} 
                />
                <span className="sr-only">Toggle</span>
              </button>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
            <ul
              {...autocomplete.getListProps()}
              className="max-h-60 overflow-auto p-1"
            >
              {filteredItems.length === 0 ? (
                <li className="px-2 py-1.5 text-sm text-muted-foreground">
                  No results found
                </li>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = values.some((v) => v.id === item.id)
                  const itemState = autocomplete.getItemState(item)
                  
                  return (
                    <li
                      key={item.id}
                      {...autocomplete.getItemProps(item)}
                      className={cn(
                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                        "hover:bg-accent/50 hover:text-accent-foreground",
                        itemState.isActive && "bg-accent text-accent-foreground",
                        itemState.isDisabled && "pointer-events-none opacity-50"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {itemToString(item)}
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
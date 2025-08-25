import * as React from "react"
import { ChevronDown, X, Check } from "lucide-react"
import { useAutoComplete } from "@wispe/wispe-react"

import { cn } from "@/lib/utils"

interface AutocompleteItem {
  id: string
  label: string
  value: string
}

interface AutocompleteProps<T extends AutocompleteItem> {
  items: T[]
  placeholder?: string
  value?: T
  onValueChange?: (value: T | undefined) => void
  disabled?: boolean
  className?: string
  itemToString?: (item: T) => string
  onClearAsync?: (params: { signal: AbortSignal }) => Promise<void>
}

export function Autocomplete<T extends AutocompleteItem>({
  items,
  placeholder = "Search...",
  value,
  onValueChange,
  disabled = false,
  className,
  itemToString = (item) => item.label,
  onClearAsync,
}: AutocompleteProps<T>) {
  const [inputValue, setInputValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  const autocomplete = useAutoComplete<T>({
    mode: "single",
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
      onValueChange?.(item)
      setIsOpen(false)
    },
    onInputValueChange: (value) => {
      setInputValue(value)
      if (!isOpen && value.length > 0) {
        setIsOpen(true)
      }
    },
    onClearAsync,
  })

  const filteredItems = React.useMemo(() => {
    if (!inputValue) return items
    return items.filter((item) =>
      itemToString(item).toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [items, inputValue, itemToString])

  React.useEffect(() => {
    if (value) {
      setInputValue(itemToString(value))
    } else {
      setInputValue("")
    }
  }, [value, itemToString])

  return (
    <div className={cn("relative", className)}>
      <div
        {...autocomplete.getRootProps()}
        className="relative"
      >
        <div className="relative">
          <input
            {...autocomplete.getInputProps()}
            placeholder={placeholder}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              "pr-20"
            )}
          />
          
          <div className="absolute inset-y-0 right-0 flex items-center">
            {inputValue && (
              <button
                {...autocomplete.getClearProps()}
                className="mr-1 h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                type="button"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Clear</span>
              </button>
            )}
            
            <button
              {...autocomplete.getDisclosureProps()}
              className="mr-2 h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none flex items-center justify-center"
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
                          itemState.isSelected ? "opacity-100" : "opacity-0"
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
import React, { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Option {
  id: string;
  label: string;
  tags?: string[];
}

interface SearchableComboboxProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onCreateNew?: (inputValue: string) => void;
  placeholder?: string;
  emptyText?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
}

export function SearchableCombobox({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = "Select an option...",
  emptyText = "No option found.",
  ariaLabel,
  ariaLabelledby
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            className="w-full justify-between font-normal bg-background"
          >
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
        <Command
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            // cmdk value is typically the id, let's find the option
            const option = options.find(o => o.id === value || o.label === value);
            if (option) {
              if (option.label.toLowerCase().includes(search.toLowerCase())) return 1;
              if (option.tags && option.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) {
                return 1;
              }
            }
            return 0;
          }}
        >
          <CommandInput 
            placeholder={placeholder} 
            value={inputValue} 
            onValueChange={setInputValue} 
          />
          <CommandList>
            <CommandEmpty className="py-2 text-center text-sm">
              <span className="text-muted-foreground">{emptyText}</span>
              {onCreateNew && inputValue.trim() !== "" && (
                <div className="mt-2 px-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-primary"
                    onClick={() => {
                      onCreateNew(inputValue.trim());
                      setOpen(false);
                      setInputValue("");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create "{inputValue.trim()}"
                  </Button>
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {onCreateNew && inputValue.trim() !== "" && !options.some(o => o.label.toLowerCase() === inputValue.trim().toLowerCase()) && (
                <CommandItem
                  value="__CREATE__"
                  onSelect={() => {
                    onCreateNew(inputValue.trim());
                    setOpen(false);
                    setInputValue("");
                  }}
                  className="text-primary font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create "{inputValue.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

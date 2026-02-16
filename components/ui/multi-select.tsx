"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MultiSelectProps {
  options: string[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const allSelected = options.length > 0 && value.length === options.length;
  const noneSelected = value.length === 0;

  const toggle = (item: string) => {
    if (value.includes(item)) {
      onValueChange(value.filter((v) => v !== item));
    } else {
      onValueChange([...value, item]);
    }
  };

  const selectAll = () => onValueChange([...options]);
  const deselectAll = () => onValueChange([]);

  let label = placeholder;
  if (allSelected || noneSelected) {
    label = `All (${options.length})`;
  } else {
    label = `${value.length} selected`;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-[180px] justify-between font-normal",
            noneSelected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search zones..." />
          <CommandList>
            <CommandEmpty>No zones found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={allSelected ? deselectAll : selectAll}
                className="font-medium"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    allSelected ? "opacity-100" : "opacity-0"
                  )}
                />
                {allSelected ? "Deselect All" : "Select All"}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => toggle(option)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

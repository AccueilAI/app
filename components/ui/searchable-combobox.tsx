'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
  detail?: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  className,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedOption = options.find(
    (opt) => opt.value.toLowerCase() === value.toLowerCase(),
  );
  const displayValue = selectedOption?.label ?? (value || placeholder);
  const hasCustomValue = value && !selectedOption;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]',
            value ? 'text-[#1A1A2E]' : 'text-[#9CA3AF]',
            className,
          )}
        >
          <span className="truncate">
            {hasCustomValue ? value : displayValue}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-sm text-[#2B4C8C] hover:underline"
                  onClick={() => {
                    onChange(search.trim());
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  &ldquo;{search.trim()}&rdquo;
                </button>
              ) : (
                emptyMessage
              )}
            </CommandEmpty>
            <CommandGroup>
              {options
                .filter((opt) => {
                  if (!search.trim()) return true;
                  const q = search.toLowerCase();
                  return (
                    opt.label.toLowerCase().includes(q) ||
                    opt.value.toLowerCase().includes(q) ||
                    (opt.detail?.toLowerCase().includes(q) ?? false)
                  );
                })
                .slice(0, 50)
                .map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => {
                      onChange(opt.value);
                      setSearch('');
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value.toLowerCase() === opt.value.toLowerCase()
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      {opt.detail && (
                        <span className="text-xs text-[#5C5C6F]">
                          {opt.detail}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

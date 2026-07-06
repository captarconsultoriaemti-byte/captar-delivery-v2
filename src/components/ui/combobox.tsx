"use client";

import { useEffect, useRef, useState } from "react";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  onQueryChange?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  onQueryChange,
  placeholder,
  disabled,
}: ComboboxProps) {
  const selected = options.find((o) => o.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(selected?.label ?? "");
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected?.label ?? "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative" ref={containerRef}>
      <input
        disabled={disabled}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onQueryChange?.(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-secondary/10"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-secondary/45 bg-white shadow-lg">
          {filtered.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-primary/10"
                onClick={() => {
                  onChange(option.value);
                  setQuery(option.label);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

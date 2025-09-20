import React, { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronDown } from "lucide-react";

const languageOptions = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Kannada",
  "Bengali",
  // Add more as needed
];

export default function LanguageMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (langs: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleToggle = (lang: string) => {
    let next;
    if (selected.includes(lang)) {
      next = selected.filter((l) => l !== lang);
    } else {
      next = [...selected, lang];
    }
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full border border-border rounded px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:bg-muted/30 transition"
        >
          <span className="truncate">
            {selected.length === 0 ? "Select language(s)" : selected.join(", ")}
          </span>
          <ChevronDown className="w-4 h-4 ml-2 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] rounded shadow-lg bg-background z-50 p-2"
        align="end"
      >
        <div className="flex flex-col gap-1 max-h-52 overflow-auto">
          {languageOptions.map((lang) => (
            <button
              key={lang}
              type="button"
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent transition-colors text-left"
              onClick={() => handleToggle(lang)}
            >
              <Checkbox id={lang} checked={selected.includes(lang)} />
              <span>{lang}</span>
              {selected.includes(lang) && (
                <Check className="w-4 h-4 text-primary ml-auto" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

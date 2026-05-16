"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";

type TagInputProps = {
  name: string;
  defaultValue?: string[];
  suggestions?: string[];
};

export function TagInput({ name, defaultValue = [], suggestions = [] }: TagInputProps) {
  const [value, setValue] = useState(defaultValue.join(", "));
  const listId = useMemo(() => `${name}-suggestions`, [name]);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>Tags</Label>
      <Input
        id={name}
        name={name}
        list={listId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="healthcare, warm-intro, conference-2026"
      />
      <datalist id={listId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
    </div>
  );
}

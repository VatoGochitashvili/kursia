"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

/**
 * Editable ordered list of short strings (learning outcomes, requirements,
 * target audience). Enter adds the next item, so a creator can type a whole
 * list without touching the mouse.
 */
export function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  maxItems = 30,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
  maxItems?: number;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value || items.length >= maxItems) return;
    onChange([...items, value]);
    setDraft("");
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex items-center gap-1.5">
            <Icon name="check" size={15} className="shrink-0 text-success-500" />
            <Input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[index] = e.target.value;
                onChange(next);
              }}
              maxLength={300}
              className="h-10"
            />
            <div className="flex shrink-0">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="↑"
                className="inline-flex h-8 w-7 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken disabled:opacity-30"
              >
                <Icon name="chevronUp" size={13} />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label="↓"
                className="inline-flex h-8 w-7 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken disabled:opacity-30"
              >
                <Icon name="chevronDown" size={13} />
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                aria-label="×"
                className="inline-flex h-8 w-7 items-center justify-center rounded-md text-ink-subtle hover:bg-danger-50 hover:text-danger-700"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {items.length < maxItems && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            maxLength={300}
          />
          <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
            <Icon name="plus" size={15} />
            <span className="hidden sm:inline">{addLabel}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

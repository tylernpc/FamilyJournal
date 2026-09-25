"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { people } from "@/lib/data";
import { fullName } from "@/lib/family";
import { Avatar } from "./avatar";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
};

// Textarea with @mention autocomplete for family members.
export const MentionInput = forwardRef<HTMLTextAreaElement, Props>(function MentionInput(
  { value, onChange, onSubmit, placeholder, rows = 1, className = "", autoFocus, ...aria },
  forwarded,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwarded, () => ref.current!);
  const [query, setQuery] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const matches =
    query === null
      ? []
      : people
          .filter((p) =>
            [p.firstName, p.lastName, fullName(p)].some((n) =>
              n.toLowerCase().startsWith(query.toLowerCase()),
            ),
          )
          .slice(0, 6);

  const detect = (text: string, caret: number) => {
    const m = /(^|\s)@([A-Za-z]*)$/.exec(text.slice(0, caret));
    setQuery(m ? m[2] : null);
    setIndex(0);
  };

  const choose = (personId: string) => {
    const el = ref.current!;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@([A-Za-z]*)$/, "");
    const name = fullName(people.find((p) => p.id === personId)!);
    const next = `${before}@${name} ${value.slice(caret)}`;
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      const pos = before.length + name.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative flex-1">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={aria["aria-label"]}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart);
          if (rows === 1) {
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }
        }}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
        onKeyDown={(e) => {
          if (matches.length) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => (i + 1) % matches.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => (i - 1 + matches.length) % matches.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              choose(matches[index].id);
              return;
            }
            if (e.key === "Escape") {
              setQuery(null);
              return;
            }
          }
          if (e.key === "Enter" && !e.shiftKey && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        className={`block w-full resize-none bg-transparent outline-none placeholder:text-ink-3 ${className}`}
      />
      {matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-pop"
        >
          {matches.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === index}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p.id);
              }}
              onMouseEnter={() => setIndex(i)}
              className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[14px] ${
                i === index ? "bg-hover" : ""
              }`}
            >
              <Avatar personId={p.id} size={24} />
              {fullName(p)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}

export function DatePicker({ value, onChange, className, min, max }: Props) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      className={[
        "bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright",
        "focus:outline-none focus:border-teal [color-scheme:dark]",
        className ?? "",
      ].join(" ")}
    />
  );
}

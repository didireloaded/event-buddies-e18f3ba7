import { ChevronRight, Search, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  title,
  action,
  footer,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={cn("mt-7", className)} aria-labelledby={id}>
      {(title || action) && (
        <div className="flex items-end justify-between pr-1">
          {title ? (
            <h2 id={id} className="ios-section-title">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
      {footer && <p className="ios-footnote">{footer}</p>}
    </section>
  );
}

export function IconTile({ icon: Icon, tone = "bg-primary" }: { icon: LucideIcon; tone?: string }) {
  return (
    <span className={cn("ios-icon-tile", tone)} aria-hidden="true">
      <Icon size={18} strokeWidth={1.75} />
    </span>
  );
}

export function RowText({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle?: ReactNode | undefined;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block break-words text-[17px] leading-snug">{title}</span>
      {subtitle && (
        <span className="mt-0.5 block text-[15px] leading-snug text-muted-foreground">
          {subtitle}
        </span>
      )}
    </span>
  );
}

export function Chevron() {
  return <ChevronRight size={18} className="flex-none text-tertiary-foreground" aria-hidden />;
}

export function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
  inputRef,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className="ios-search" role="search">
      <Search size={18} aria-hidden />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-[0.625rem] bg-fill p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="min-h-11 flex-1 rounded-[10px] px-3 text-[15px] font-medium text-foreground aria-pressed:bg-popover aria-pressed:font-semibold aria-pressed:shadow-sm"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Notice({
  icon: Icon,
  children,
  tone = "info",
}: {
  icon: LucideIcon;
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl px-4 py-3 text-[15px] leading-snug",
        tone === "warning" ? "bg-warning-soft text-foreground" : "bg-secondary text-foreground",
      )}
    >
      <Icon
        size={20}
        className={cn("mt-0.5 flex-none", tone === "warning" ? "text-warning" : "text-primary")}
        aria-hidden
      />
      <div>{children}</div>
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "ios-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-[17px] font-semibold text-primary-foreground active:opacity-80 disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "ios-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 py-2 text-[17px] font-semibold text-secondary-foreground active:opacity-80 disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Avatar({
  label,
  index = 0,
  size = "md",
}: {
  label: string;
  index?: number;
  size?: "md" | "lg";
}) {
  const tones = ["bg-primary", "bg-pin-amenity", "bg-pin-entrance", "bg-pin-other"];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid flex-none place-items-center rounded-full font-semibold text-primary-foreground",
        tones[index % tones.length],
        size === "lg" ? "size-16 text-xl" : "size-10 text-[15px]",
      )}
    >
      {label}
    </span>
  );
}

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
    <section className={cn("mt-8", className)} aria-labelledby={id}>
      {(title || action) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title ? (
            <h2 id={id} className="eb-section-heading">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
      {footer && <p className="eb-footnote">{footer}</p>}
    </section>
  );
}

export function IconTile({ icon: Icon, tone }: { icon: LucideIcon; tone?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 flex-none place-items-center rounded-lg border border-border bg-secondary text-foreground",
        tone,
      )}
      aria-hidden="true"
    >
      <Icon size={17} strokeWidth={1.8} />
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
      <span className="block break-words text-[16px] font-medium leading-snug">{title}</span>
      {subtitle && (
        <span className="mt-0.5 block text-[14px] leading-snug text-muted-foreground">
          {subtitle}
        </span>
      )}
    </span>
  );
}

export function Chevron() {
  return <ChevronRight size={17} className="flex-none text-tertiary-foreground" aria-hidden />;
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
    <div className="eb-search" role="search">
      <Search size={17} aria-hidden />
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
          className="grid size-11 place-items-center rounded-full text-foreground"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X size={17} />
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
    <div role="group" aria-label={label} className="flex border-b border-separator">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap px-2 pb-2.5 pt-2 text-[14px] transition-colors sm:px-3 sm:text-[15px]",
              active
                ? "font-semibold text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-[2.5px] after:rounded-full after:bg-primary"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
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
        "flex gap-3 rounded-xl border px-4 py-3 text-[14px] leading-snug",
        tone === "warning"
          ? "border-warning/35 bg-warning-soft text-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      <Icon
        size={19}
        className={cn("mt-0.5 flex-none", tone === "warning" ? "text-warning" : "text-primary")}
        aria-hidden
      />
      <div className="min-w-0 flex-1">{children}</div>
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
        "eb-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground active:opacity-85 disabled:opacity-40",
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
        "eb-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-[15px] font-semibold text-foreground active:opacity-80 disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="eb-panel px-5 py-8 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
        <Icon size={20} aria-hidden />
      </span>
      <p className="mt-3 text-[17px] font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[14px] text-muted-foreground">{detail}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 py-2" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-secondary/75" />
      ))}
    </div>
  );
}

export function Avatar({
  label,
  index = 0,
  size = "md",
  src,
  alt = "",
}: {
  label: string;
  index?: number;
  size?: "sm" | "md" | "lg";
  src?: string | null | undefined;
  alt?: string;
}) {
  const tones = ["bg-primary", "bg-foreground", "bg-pin-amenity", "bg-pin-other"];
  const sizes = {
    sm: "size-8 text-[12px]",
    md: "size-11 text-[14px]",
    lg: "size-[4.25rem] text-[19px]",
  };
  return (
    <span
      aria-hidden={src ? undefined : true}
      className={cn(
        "grid flex-none place-items-center overflow-hidden rounded-full font-semibold text-primary-foreground ring-1 ring-border/70",
        tones[index % tones.length],
        sizes[size],
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          width={size === "lg" ? 68 : size === "sm" ? 32 : 44}
          height={size === "lg" ? 68 : size === "sm" ? 32 : 44}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        label
      )}
    </span>
  );
}

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-display tracking-wide uppercase transition-opacity duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:opacity-90",
        secondary:
          "border border-border-strong bg-elevated/70 text-fg hover:bg-elevated",
        ghost: "text-muted hover:text-fg hover:bg-elevated/60",
        danger: "bg-danger text-fg hover:opacity-90",
      },
      size: {
        sm: "h-10 px-4 text-xs rounded-[var(--radius-sm)]",
        md: "h-11 px-5 text-sm rounded-[var(--radius-md)]",
        lg: "h-12 px-6 text-sm rounded-[var(--radius-md)] min-h-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

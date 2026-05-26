import * as React from "react"

import { cn } from "@/lib/admin/utils"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 checked:border-primary checked:bg-primary",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Checkbox.displayName = "Checkbox"

export { Checkbox }

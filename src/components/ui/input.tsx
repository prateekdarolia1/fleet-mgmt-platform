import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  /**
   * When true, the space bar is blocked on keydown and any whitespace
   * (including pasted content) is stripped before reaching the parent's
   * onChange. Use for fields where spaces are never valid: IDs, codes,
   * phone/aadhaar/PAN/IFSC numbers, UPI handles, smart IDs, etc.
   */
  noSpaces?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, noSpaces, onKeyDown, onChange, ...props }, ref) => {
    const handleKeyDown = noSpaces
      ? (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === " ") e.preventDefault();
          onKeyDown?.(e);
        }
      : onKeyDown;

    const handleChange = noSpaces
      ? (e: React.ChangeEvent<HTMLInputElement>) => {
          if (/\s/.test(e.target.value)) {
            e.target.value = e.target.value.replace(/\s+/g, "");
          }
          onChange?.(e);
        }
      : onChange;

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

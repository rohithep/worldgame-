import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, ...props }, ref) => {
    return (
      <input
        type={type}
        style={{
          backgroundColor: "#0B101B",
          color: "#F4F1EA",
          WebkitTextFillColor: "#F4F1EA",
          caretColor: "#E8A849",
          ...style,
        }}
        className={cn(
          "flex min-h-12 w-full rounded-2xl border border-white/20 bg-[#0B101B] px-4 py-2.5 text-[15px] font-medium text-[#F4F1EA] caret-[#E8A849] shadow-[inset_0_1px_3px_rgba(0,0,0,0.65)] transition-all placeholder:text-[#6E7A8F] focus:border-[#E8A849] focus:bg-[#0E1524] focus:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#E8A849]/30 disabled:cursor-not-allowed disabled:opacity-45",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

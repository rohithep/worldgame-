"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "arcade-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary: "arcade-btn-primary",
        secondary: "arcade-btn-secondary",
        ghost: "hover:bg-white/[0.06] text-[#F4F1EA]",
        danger:
          "bg-gradient-to-b from-[#FF5468] to-[#C81E35] text-white tracking-[0.1em] uppercase shadow-[0_12px_28px_-8px_rgba(200,30,53,0.55),inset_0_1px_0_rgba(255,255,255,0.28)] hover:translate-y-[-1px] active:scale-[0.98]",
        outline:
          "border border-white/14 bg-white/[0.03] backdrop-blur-md text-[#F4F1EA] hover:bg-white/[0.08] hover:border-[#E8A849]/45",
      },
      size: {
        sm: "min-h-10 px-4 text-[12px]",
        md: "min-h-11 px-5 text-[12.5px]",
        lg: "min-h-13 px-7 text-[13px]",
        icon: "min-h-11 min-w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

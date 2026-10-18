"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

const ARABIC_REGEX = /[\u0600-\u06FF]/

function Input({ className, type, dir, onInput, value, defaultValue, style, ...props }: React.ComponentProps<"input">) {
  const initialText = String(value ?? defaultValue ?? "")
  const [detectedDir, setDetectedDir] = React.useState<"rtl" | "ltr" | "auto">(
    ARABIC_REGEX.test(initialText) ? "rtl" : (dir as any) || "auto"
  )

  React.useEffect(() => {
    if (value !== undefined) {
      const str = String(value ?? "")
      if (ARABIC_REGEX.test(str)) {
        setDetectedDir("rtl")
      } else if (str.trim().length > 0) {
        setDetectedDir("ltr")
      } else {
        setDetectedDir((dir as any) || "auto")
      }
    }
  }, [value, dir])

  const handleInput: React.InputEventHandler<HTMLInputElement> = (e) => {
    const val = e.currentTarget.value || ""
    if (ARABIC_REGEX.test(val)) {
      e.currentTarget.dir = "rtl"
      setDetectedDir("rtl")
    } else if (val.trim().length > 0) {
      e.currentTarget.dir = "ltr"
      setDetectedDir("ltr")
    } else {
      e.currentTarget.dir = dir || "auto"
      setDetectedDir((dir as any) || "auto")
    }
    onInput?.(e)
  }

  return (
    <InputPrimitive
      type={type}
      dir={detectedDir}
      value={value}
      defaultValue={defaultValue}
      onInput={handleInput}
      data-slot="input"
      style={{
        ...(detectedDir === "rtl" ? { direction: "rtl", textAlign: "right" } : {}),
        ...style,
      }}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base text-start transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }

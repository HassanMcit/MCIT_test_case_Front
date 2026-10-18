"use client"

import * as React from "react"
import { cn } from "cn"

const ARABIC_REGEX = /[\u0600-\u06FF]/

function Textarea({ className, dir, onInput, value, defaultValue, style, ...props }: React.ComponentProps<"textarea">) {
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

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
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
    <textarea
      dir={detectedDir}
      value={value}
      defaultValue={defaultValue}
      onInput={handleInput}
      data-slot="textarea"
      style={{
        ...(detectedDir === "rtl" ? { direction: "rtl", textAlign: "right" } : {}),
        ...style,
      }}
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base text-start transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-[#00A2D2] focus-visible:ring-2 focus-visible:ring-[#00A2D2]/25 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

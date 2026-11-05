"use client";

import Link from "next/link";
import { type ComponentProps, useState } from "react";

/** Full prefetch only after navigation intent. Next owns deduplication,
 * expiration, and mutation invalidation; this component stores no page data.
 * Use only for ordinary workflow routes, not account/security screens.
 */
export default function IntentLink({
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onTouchStart,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [active, setActive] = useState(false);
  return (
    <Link
      {...props}
      prefetch={active ? true : undefined}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        setActive(true);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        setActive(true);
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        setActive(true);
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        setActive(false);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setActive(false);
      }}
    />
  );
}

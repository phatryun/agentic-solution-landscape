"use client";

import { useState } from "react";

interface Props {
  name: string;
  /**
   * Stored logo path from front-matter (same-origin, e.g. `/api/logos/<slug>`).
   * Resolved and persisted at write time (user submission or agent scan).
   */
  logo?: string;
  /** Rendered box size in px. */
  size?: number;
  /** Background for the initials fallback. */
  fallbackBg?: string;
  /** Text color for the initials fallback. */
  fallbackColor?: string;
  className?: string;
}

/**
 * Renders a solution logo with graceful degradation:
 *   1. the stored `logo` (same-origin path)
 *   2. initials on a colored square (when no logo is stored or it fails to load)
 *
 * We intentionally do NOT hot-link a third-party favicon here: logos are
 * resolved and stored server-side at write time, so rendering stays
 * self-contained and the PNG poster export is not CORS-tainted.
 */
export function SolutionLogo({
  name,
  logo,
  size = 32,
  fallbackBg = "hsl(var(--primary) / 0.1)",
  fallbackColor = "hsl(var(--primary))",
  className = "",
}: Props) {
  const [failed, setFailed] = useState(false);
  const boxStyle = { width: size, height: size } as const;

  if (!logo || failed) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-md font-bold ${className}`}
        style={{ ...boxStyle, backgroundColor: fallbackBg, color: fallbackColor, fontSize: size * 0.4 }}
        aria-hidden="true"
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={logo}
      alt={`${name} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-md bg-white object-contain ${className}`}
      style={boxStyle}
    />
  );
}

"use client";

/* ─── Geometric SVG background (matches Stitch design) ──────────────── */
export function GeometricBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 w-full h-full overflow-hidden z-0 select-none"
      style={{ direction: "ltr" }}
      aria-hidden
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cyanMain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00C3F3" />
            <stop offset="100%" stopColor="#0096cc" />
          </linearGradient>
          <linearGradient id="cyanLight" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#00C3F3" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="cyanSheer1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00C3F3" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="cyanSheer2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00b4e6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* Main filled polygons */}
        <polygon fill="url(#cyanMain)" opacity="0.95" points="-150,950 -100,50 380,480 320,950" />
        <polygon fill="url(#cyanLight)" opacity="0.85" points="-80,40 280,320 480,-20 -20,-100" />
        <polygon fill="url(#cyanSheer1)" points="120,240 460,540 340,780 20,440" />
        <polygon fill="url(#cyanSheer2)" points="260,180 560,450 420,680 180,380" />
        {/* Outline decorations */}
        <polygon fill="none" points="-50,650 360,330 520,700 80,950" stroke="#38BDF8" strokeOpacity="0.6" strokeWidth="2" />
        <rect fill="none" x="180" y="600" width="260" height="260" rx="6" stroke="#00C3F3" strokeOpacity="0.45" strokeWidth="1.8" transform="rotate(45 180 600)" />
        <rect fill="none" x="240" y="720" width="190" height="190" rx="4" stroke="#38BDF8" strokeDasharray="6 4" strokeOpacity="0.35" strokeWidth="1.4" transform="rotate(45 240 720)" />
        <line x1="-60" y1="850" x2="440" y2="380" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2.5" />
        {/* Upper-right subtle lines */}
        <g opacity="0.55" stroke="#94A3B8" strokeLinecap="round" strokeWidth="1.6">
          <path d="M 1050,-40 L 1320,190 L 1480,70" fill="none" />
          <path d="M 940,30 L 1260,310 L 1520,120" fill="none" opacity="0.7" stroke="#64748B" strokeWidth="2" />
          <path d="M 1120,200 L 1380,420 L 1540,290" fill="none" strokeDasharray="8 6" />
          <path d="M 1260,310 L 1180,400 L 1020,260" fill="none" />
          <path d="M 940,30 L 820,140" fill="none" />
          <line x1="1160" y1="100" x2="1360" y2="270" opacity="0.4" strokeWidth="1" />
          <rect fill="none" x="1160" y="160" width="120" height="120" opacity="0.35" stroke="#94A3B8" strokeWidth="1.2" transform="rotate(45 1160 160)" />
        </g>
      </svg>
    </div>
  );
}

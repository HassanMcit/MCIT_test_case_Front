/**
 * Client-side device & telemetry collector for login auditing.
 * Collects IP, Location, Device Info, and a persistent MAC-formatted hardware fingerprint.
 */

function generateMacFromFingerprint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, "0").slice(0, 12);
  // Ensure locally administered unicast MAC
  const firstByte = ((parseInt(hex.slice(0, 2), 16) | 0x02) & 0xfe)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  const octets = [
    firstByte,
    hex.slice(2, 4).toUpperCase(),
    hex.slice(4, 6).toUpperCase(),
    hex.slice(6, 8).toUpperCase(),
    hex.slice(8, 10).toUpperCase(),
    hex.slice(10, 12).toUpperCase(),
  ];
  return octets.join(":");
}

export function getOrCreateDeviceMac(): string {
  if (typeof window === "undefined") return "02:00:00:00:00:01";
  try {
    const saved = localStorage.getItem("mcit_device_mac");
    if (saved && /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(saved)) {
      return saved;
    }
  } catch {}

  const hwSeed = [
    navigator.userAgent,
    navigator.platform,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    (navigator as any).hardwareConcurrency || 4,
    (navigator as any).deviceMemory || 8,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  const newMac = generateMacFromFingerprint(hwSeed);
  try {
    localStorage.setItem("mcit_device_mac", newMac);
  } catch {}
  return newMac;
}

export function getDeviceSummary(): string {
  if (typeof window === "undefined") return "Unknown Device";
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  if (/Windows NT 10\.0/i.test(ua)) os = "Windows 10/11";
  else if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome\//i.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  const res = typeof window !== "undefined" ? ` (${screen.width}×${screen.height})` : "";
  return `${os} - ${browser}${res}`;
}

export async function collectLoginTelemetry(): Promise<{
  clientIp?: string;
  macAddress: string;
  deviceInfo: string;
  location?: string;
  userAgent: string;
}> {
  const macAddress = getOrCreateDeviceMac();
  const deviceInfo = getDeviceSummary();
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

  let clientIp: string | undefined;
  let location: string | undefined;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("https://ipwho.is/", { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data?.success) {
        clientIp = data.ip;
        const parts = [data.city, data.region, data.country].filter(Boolean);
        location = parts.join(", ");
        if (data.connection?.isp) {
          location += ` (${data.connection.isp})`;
        }
        try {
          if (clientIp) localStorage.setItem("mcit_client_ip", clientIp);
          if (location) localStorage.setItem("mcit_client_location", location);
        } catch {}
      }
    }
  } catch {
    // Fallback to cached or timezone
    try {
      clientIp = localStorage.getItem("mcit_client_ip") || undefined;
      location = localStorage.getItem("mcit_client_location") || undefined;
      if (!location) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        location = tz ? `Timezone: ${tz}` : undefined;
      }
    } catch {}
  }

  return {
    clientIp,
    macAddress,
    deviceInfo,
    location,
    userAgent,
  };
}

export function getClientTelemetrySync(): {
  clientIp?: string;
  macAddress: string;
  deviceInfo: string;
  location?: string;
  userAgent: string;
} {
  const macAddress = getOrCreateDeviceMac();
  const deviceInfo = getDeviceSummary();
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let clientIp: string | undefined;
  let location: string | undefined;

  if (typeof window !== "undefined") {
    try {
      clientIp = localStorage.getItem("mcit_client_ip") || undefined;
      location = localStorage.getItem("mcit_client_location") || undefined;
    } catch {}
  }

  return {
    clientIp,
    macAddress,
    deviceInfo,
    location,
    userAgent,
  };
}

/**
 * Automatically fetch telemetry in background on load if not cached yet.
 */
if (typeof window !== "undefined") {
  setTimeout(() => {
    try {
      if (!localStorage.getItem("mcit_client_ip")) {
        collectLoginTelemetry();
      }
    } catch {}
  }, 1000);
}


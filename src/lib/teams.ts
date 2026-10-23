/**
 * Microsoft Teams Deep Link builders for instant Call, Chat, and Meeting scheduling.
 * Works with both Microsoft Teams Desktop App and Web App using corporate (@mcit.gov.eg) accounts.
 */

export function getTeamsCallUrl(emails: string | string[]): string {
  const list = (Array.isArray(emails) ? emails : [emails])
    .map((e) => e.trim())
    .filter(Boolean);
  if (list.length === 0) return "https://teams.microsoft.com";
  return `https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(list.join(","))}`;
}

export function getTeamsChatUrl(emails: string | string[], message?: string): string {
  const list = (Array.isArray(emails) ? emails : [emails])
    .map((e) => e.trim())
    .filter(Boolean);
  if (list.length === 0) return "https://teams.microsoft.com";
  const base = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(list.join(","))}`;
  if (message && message.trim()) {
    return `${base}&message=${encodeURIComponent(message.trim())}`;
  }
  return base;
}

export function getTeamsMeetingUrl(options: {
  attendees?: string | string[];
  subject?: string;
  content?: string;
}): string {
  const params = new URLSearchParams();
  if (options.subject && options.subject.trim()) {
    params.set("subject", options.subject.trim());
  }
  if (options.attendees) {
    const list = (Array.isArray(options.attendees) ? options.attendees : [options.attendees])
      .map((e) => e.trim())
      .filter(Boolean);
    if (list.length > 0) {
      params.set("attendees", list.join(","));
    }
  }
  if (options.content && options.content.trim()) {
    params.set("content", options.content.trim());
  }
  const qs = params.toString();
  return `https://teams.microsoft.com/l/meeting/new${qs ? `?${qs}` : ""}`;
}

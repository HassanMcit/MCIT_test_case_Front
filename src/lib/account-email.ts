// Public and deliberately explicit: Next.js inlines this setting in both the
// browser and server bundles. Only staging builds may accept synthetic users.
export function allowsSyntheticEmails(): boolean {
  return process.env.NEXT_PUBLIC_APP_ENV === "staging";
}

export function accountEmailPattern(): RegExp {
  return allowsSyntheticEmails()
    ? /^[a-zA-Z0-9._%+-]+@(?:mcit\.gov\.eg|synthetic\.local)$/
    : /^[a-zA-Z0-9._%+-]+@mcit\.gov\.eg$/;
}

export function isAllowedAccountEmail(value: unknown): value is string {
  return typeof value === "string" && accountEmailPattern().test(value);
}

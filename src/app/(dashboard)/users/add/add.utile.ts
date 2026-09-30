
const SPECIAL_CHARS = "@$!%*?&#";
const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBER_CHARS = "0123456789";


export function generateValidRandomPassword(): string {
  const getRandom = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const lower = getRandom(LOWERCASE_CHARS);
  const upper = getRandom(UPPERCASE_CHARS);
  const num = getRandom(NUMBER_CHARS);
  const special = getRandom(SPECIAL_CHARS);

  const allAllowed = LOWERCASE_CHARS + UPPERCASE_CHARS + NUMBER_CHARS + SPECIAL_CHARS;
  const remainingLength = 7; // Total 11 characters
  const remaining: string[] = [];
  for (let i = 0; i < remainingLength; i++) {
    remaining.push(getRandom(allAllowed));
  }

  const combined = [lower, upper, num, special, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  const res = combined.join("");
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  if (regex.test(res)) {
    return res;
  }
  return "Mcit@2026#Valid";
}



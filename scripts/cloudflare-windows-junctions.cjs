// Optional Windows build preload. Never loaded by application/Worker code.
// OpenNext copies directory symlinks into .open-next. Windows junctions preserve
// local directory resolution without requiring symlink privileges.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function sanitizeEnvValue(raw) {
  if (typeof raw !== 'string') return '';
  let value = raw.trim();
  while (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function sanitizeUrlEnvValue(raw) {
  const cleaned = sanitizeEnvValue(raw).replace(/\/+$/, '');
  if (!cleaned) return '';
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    const pathPart =
      parsed.pathname && parsed.pathname !== '/'
        ? parsed.pathname.replace(/\/+$/, '')
        : '';
    return `${parsed.origin}${pathPart}`;
  } catch {
    return cleaned;
  }
}

// Propagate non-secret vars only from the selected Wrangler config into
// process.env at build time so Next.js inlines the
// exact staging NEXT_PUBLIC_BASE_URL and AUTH_URL into compiled bundles.
try {
  for (const urlKey of ['AUTH_URL', 'NEXTAUTH_URL', 'NEXT_PUBLIC_BASE_URL']) {
    if (typeof process.env[urlKey] === 'string') {
      const cleaned = sanitizeUrlEnvValue(process.env[urlKey]);
      if (cleaned) {
        process.env[urlKey] = cleaned;
      } else {
        delete process.env[urlKey];
      }
    }
  }
  const root = path.resolve(__dirname, '..');
  const configArg = process.argv.find((arg) => arg.startsWith('--config='));
  if (configArg) {
    process.env.MCIT_WRANGLER_CONFIG = configArg.slice('--config='.length);
  }
  const selectedConfig = configArg
    ? configArg.slice('--config='.length)
    : process.env.MCIT_WRANGLER_CONFIG || 'wrangler.staging.jsonc';
  const candidateFiles = [selectedConfig];
  for (const relFile of candidateFiles) {
    const configPath = path.resolve(root, relFile);
    if (!fs.existsSync(configPath)) continue;
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    // Never inherit staging email policy when explicitly building another config.
    process.env.NEXT_PUBLIC_APP_ENV =
      sanitizeEnvValue(parsed.vars?.NEXT_PUBLIC_APP_ENV) || 'production';
    if (
      parsed.name === 'mcit-test-case-front-prod' &&
      process.env.NEXT_PUBLIC_APP_ENV === 'production'
    ) {
      // Next.js loads .env.production during build. Keep existing Vercel and
      // Supabase credentials out of the Worker artifact: production secrets
      // are supplied only by Wrangler at runtime after separate approval.
      process.env.AUTH_SECRET = crypto.randomBytes(32).toString('base64url');
      process.env.DATABASE_URL = '';
      process.env.DATABASE_CA_CERT = '';
      process.env.PGSSLROOTCERT_PEM = '';
    }
    if (parsed && typeof parsed.vars === 'object' && parsed.vars !== null) {
      for (const [key, value] of Object.entries(parsed.vars)) {
        if (typeof value === 'string') {
          process.env[key] =
            key === 'AUTH_URL' || key === 'NEXTAUTH_URL' || key === 'NEXT_PUBLIC_BASE_URL'
              ? sanitizeUrlEnvValue(value)
              : sanitizeEnvValue(value);
        }
      }
    }
  }
} catch {
  // Ignore config parse errors during preload; Wrangler validates config directly.
}

if (process.platform === 'win32') {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, '.open-next');
  const original = fs.symlinkSync;
  const inside = (base, target) => {
    const rel = path.relative(base, target);
    return rel !== '' && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
  };
  fs.symlinkSync = function(target, destination, type) {
    try {
      return original.call(fs, target, destination, type);
    } catch (error) {
      const dest = path.resolve(destination);
      const source = path.resolve(path.dirname(dest), target);
      if (error.code !== 'EPERM' || !inside(output, dest) || !inside(root, source) || !fs.statSync(source).isDirectory()) {
        throw error;
      }
      return original.call(fs, source, dest, 'junction');
    }
  };
  // OpenNext uses ESM named imports from node:fs.
  require('node:module').syncBuiltinESMExports();
}

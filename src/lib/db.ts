import {
  Client,
  type ClientConfig,
  type QueryConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";

export function sanitizeDatabaseEnvValue(raw?: string | null): string {
  if (typeof raw !== "string") return "";
  let value = raw.trim();
  if (/^psql\s+/i.test(value)) {
    value = value.replace(/^psql\s+/i, "").trim();
  }
  while (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  const envPrefixMatch = value.match(
    /^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(postgres(?:ql)?:\/\/.+)$/i,
  );
  if (envPrefixMatch) {
    value = envPrefixMatch[1].trim();
    while (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1).trim();
    }
  }
  return value;
}

export function resolveDirectDatabaseConfig(rawUrl?: string | null): {
  connectionString: string;
  ssl?: ClientConfig["ssl"];
} {
  const cleaned = sanitizeDatabaseEnvValue(rawUrl);
  if (!cleaned) {
    throw new Error("DATABASE_URL is required (server-only)");
  }

  let parsed: URL | null = null;
  try {
    const candidate = new URL(cleaned);
    if (
      (candidate.protocol === "postgresql:" ||
        candidate.protocol === "postgres:") &&
      candidate.hostname
    ) {
      parsed = candidate;
    }
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return { connectionString: cleaned };
  }

  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]";
  const sslmode = parsed.searchParams.get("sslmode")?.toLowerCase();

  if (isLoopback || sslmode === "disable") {
    return {
      connectionString: parsed.toString(),
      ssl: false,
    };
  }

  const compat = parsed.searchParams.get("uselibpqcompat");
  if (
    !compat &&
    (!sslmode ||
      sslmode === "require" ||
      sslmode === "prefer" ||
      sslmode === "verify-ca")
  ) {
    parsed.searchParams.set("sslmode", "verify-full");
  }

  const ca =
    sanitizeDatabaseEnvValue(process.env.DATABASE_CA_CERT) ||
    sanitizeDatabaseEnvValue(process.env.PGSSLROOTCERT_PEM) ||
    ((host.endsWith(".supabase.co") || host.endsWith(".supabase.com"))
      ? SUPABASE_ROOT_CA_PEM
      : undefined);

  return {
    connectionString: parsed.toString(),
    ssl: {
      rejectUnauthorized: true,
      ...(ca ? { ca } : {}),
    },
  };
}

export const SUPABASE_ROOT_CA_PEM = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;

// A query facade, never a live socket shared between Worker requests.
// Hyperdrive pools origin connections; every query owns its local client.
export const pool = {
  async query<R extends QueryResultRow = any>(
    text: string | QueryConfig,
    values?: any[],
  ): Promise<QueryResult<R>> {
    let connectionString: string;
    let sslOption: ClientConfig["ssl"] | undefined;
    const cloudflare = process.env.MCIT_CLOUDFLARE === "true";
    if (cloudflare) {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const { env } = getCloudflareContext();
      if (!env.HYPERDRIVE?.connectionString) {
        throw new Error(
          "HYPERDRIVE binding is required; database fallback is disabled",
        );
      }
      connectionString = env.HYPERDRIVE.connectionString;
    } else {
      const direct = resolveDirectDatabaseConfig(process.env.DATABASE_URL);
      connectionString = direct.connectionString;
      sslOption = direct.ssl;
    }

    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
      statement_timeout: 10000,
      // Hyperdrive terminates verified TLS to the origin itself. Its Worker-side
      // connection is the Cloudflare socket transport, so don't let PGSSLMODE
      // or an inherited sslmode trigger a second TLS negotiation on that hop.
      // Direct remote connections always use verified TLS; only explicit local
      // loopback/sslmode=disable targets may opt out in resolveDirectDatabaseConfig.
      ssl: cloudflare ? false : sslOption,
    });

    let closing = false;
    if (typeof client.on === "function") {
      client.on("error", (error: unknown) => {
        // pg-cloudflare can reject its socket.closed promise after Client.end().
        // Keep that late teardown event handled. Connect/query failures still
        // propagate through their returned promises; don't synthesize socket
        // events such as `end`, which can corrupt node-postgres state.
        if (!closing) return;
        void error;
      });
    }

    try {
      await client.connect();
      return await client.query<R>(text, values);
    } finally {
      closing = true;
      try {
        await client.end();
      } catch {
        // Ignore post-query socket close errors during client teardown.
      }
    }
  },
};

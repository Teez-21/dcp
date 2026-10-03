const { Buffer } = require("node:buffer");

const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const publicKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim();

// Both values may be absent for an offline/local preview, but a partial setup
// is almost certainly a mistake and must not be embedded in a public build.
if (!projectUrl && !publicKey) process.exit(0);
if (!projectUrl || !publicKey) {
  console.error("Supabase configuration is incomplete. Set both the project URL and a publishable/anon key.");
  process.exit(1);
}

try {
  const parsed = new URL(projectUrl);
  if (parsed.protocol !== "https:") throw new Error("invalid protocol");
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL.");
  process.exit(1);
}

let allowed = publicKey.startsWith("sb_publishable_");
if (!allowed && publicKey.startsWith("eyJ")) {
  try {
    const payload = publicKey.split(".")[1];
    if (payload) {
      const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      allowed = claims.role === "anon";
    }
  } catch {
    allowed = false;
  }
}

if (!allowed) {
  console.error("The Supabase browser key is not publishable/anon. Never use a service_role or sb_secret key in a NEXT_PUBLIC variable.");
  process.exit(1);
}

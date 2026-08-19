import { signToken, verifyToken, secureEqual, pkceChallenge, randomId } from "./security.mjs";

const html = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nomadic Paws Mail</title><style>body{font:16px system-ui;max-width:32rem;margin:4rem auto;padding:1rem;color:#3f352a}input,button{box-sizing:border-box;width:100%;padding:.8rem;margin:.4rem 0;border-radius:.5rem;border:1px solid #999}button{background:#3f352a;color:white}</style></head><body>${body}</body></html>`;
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

export function metadata(env) {
  const base = env.CONNECTOR_BASE_URL;
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"]
  };
}

export async function register(request, env) {
  const input = await request.json();
  const redirects = Array.isArray(input.redirect_uris) ? input.redirect_uris.filter((x) => /^https:\/\//.test(x)) : [];
  if (!redirects.length) return json({ error: "invalid_redirect_uris" }, 400);
  const clientId = signToken({ typ: "client", redirects, iat: Date.now(), nonce: randomId() }, env.CONNECTOR_AUTH_SECRET);
  return json({ client_id: clientId, client_id_issued_at: Math.floor(Date.now() / 1000), redirect_uris: redirects, token_endpoint_auth_method: "none" }, 201);
}

function authParams(url) {
  const q = new URL(url).searchParams;
  return Object.fromEntries(["client_id", "redirect_uri", "state", "code_challenge", "code_challenge_method", "response_type"].map((key) => [key, q.get(key) || ""]));
}

function validateAuth(input, env) {
  const client = verifyToken(input.client_id, env.CONNECTOR_AUTH_SECRET, "client");
  if (!client.redirects.includes(input.redirect_uri) || input.response_type !== "code" || input.code_challenge_method !== "S256" || !input.code_challenge) throw new Error("Invalid authorization request");
}

export async function authorize(request, env) {
  const input = request.method === "POST" ? Object.fromEntries(await request.formData()) : authParams(request.url);
  try { validateAuth(input, env); } catch { return new Response(html("<h1>Unable to connect</h1><p>The authorization request was invalid.</p>"), { status: 400, headers: { "content-type": "text/html" } }); }
  if (request.method === "GET") {
    const hidden = Object.entries(input).map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/&/g,"&amp;").replace(/\"/g,"&quot;")}">`).join("");
    return new Response(html(`<h1>Connect Nomadic Paws Mail</h1><p>This permits search, reading, and saving unsent drafts. It cannot send or delete mail.</p><form method="post">${hidden}<label>Private connector access code<input type="password" name="access_code" required autocomplete="current-password"></label><button>Authorize</button></form>`), { headers: { "content-type": "text/html", "cache-control": "no-store" } });
  }
  if (!secureEqual(input.access_code, env.CONNECTOR_ACCESS_CODE)) return new Response(html("<h1>Access denied</h1><p>The access code was incorrect.</p>"), { status: 401, headers: { "content-type": "text/html" } });
  const code = signToken({ typ: "code", client_id: input.client_id, redirect_uri: input.redirect_uri, challenge: input.code_challenge, exp: Date.now() + 5 * 60_000, nonce: randomId() }, env.CONNECTOR_AUTH_SECRET);
  const target = new URL(input.redirect_uri); target.searchParams.set("code", code); if (input.state) target.searchParams.set("state", input.state);
  return Response.redirect(target, 302);
}

export async function token(request, env) {
  const input = Object.fromEntries(await request.formData());
  try {
    const code = verifyToken(input.code, env.CONNECTOR_AUTH_SECRET, "code");
    if (input.grant_type !== "authorization_code" || input.client_id !== code.client_id || input.redirect_uri !== code.redirect_uri || pkceChallenge(input.code_verifier || "") !== code.challenge) throw new Error("invalid_grant");
    const accessToken = signToken({ typ: "access", sub: "nomadic-paws", exp: Date.now() + 12 * 60 * 60_000, nonce: randomId() }, env.CONNECTOR_AUTH_SECRET);
    return json({ access_token: accessToken, token_type: "Bearer", expires_in: 43200 });
  } catch { return json({ error: "invalid_grant" }, 400); }
}

export function requireAccess(request, env) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return verifyToken(token, env.CONNECTOR_AUTH_SECRET, "access");
}


let cachedAccessToken = null;

const required = (name, env) => {
  const value = env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
};

async function accessToken(env, fetchImpl = fetch) {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) return cachedAccessToken.value;
  const body = new URLSearchParams({
    refresh_token: required("ZOHO_MAIL_REFRESH_TOKEN", env),
    client_id: required("ZOHO_MAIL_CLIENT_ID", env),
    client_secret: required("ZOHO_MAIL_CLIENT_SECRET", env),
    grant_type: "refresh_token"
  });
  const response = await fetchImpl(`${env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com"}/oauth/v2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Zoho authorization failed");
  cachedAccessToken = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
  return cachedAccessToken.value;
}

async function zohoRequest(path, env, options = {}, fetchImpl = fetch) {
  const token = await accessToken(env, fetchImpl);
  const response = await fetchImpl(`${env.ZOHO_MAIL_API_URL || "https://mail.zoho.com/api"}${path}`, {
    ...options,
    headers: {
      accept: "application/json",
      authorization: `Zoho-oauthtoken ${token}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers
    }
  });
  const data = await response.json();
  if (!response.ok || (data.status?.code && Number(data.status.code) >= 400)) {
    throw new Error(`Zoho Mail request failed (${data.status?.code || response.status})`);
  }
  return data;
}

function safePlainSearch(value) {
  return String(value || "").replace(/[\r\n]/g, " ").replace(/[:]{1,2}/g, " ").trim().slice(0, 300);
}

export async function searchMail(args, env, fetchImpl = fetch) {
  const query = safePlainSearch(args.query);
  if (!query) throw new Error("A search query is required");
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 25);
  const params = new URLSearchParams({ searchKey: `entire:${query}`, start: "1", limit: String(limit), includeto: "true" });
  const accountId = required("ZOHO_MAIL_ACCOUNT_ID", env);
  const result = await zohoRequest(`/accounts/${encodeURIComponent(accountId)}/messages/search?${params}`, env, {}, fetchImpl);
  return { messages: result.data || [] };
}

export async function readMessage(args, env, fetchImpl = fetch) {
  const accountId = required("ZOHO_MAIL_ACCOUNT_ID", env);
  if (!args.folder_id || !args.message_id) throw new Error("folder_id and message_id are required");
  return zohoRequest(`/accounts/${encodeURIComponent(accountId)}/folders/${encodeURIComponent(args.folder_id)}/messages/${encodeURIComponent(args.message_id)}/content?includeBlockContent=true`, env, {}, fetchImpl);
}

export async function createDraft(args, env, fetchImpl = fetch) {
  const accountId = required("ZOHO_MAIL_ACCOUNT_ID", env);
  if (!args.to || !args.subject || !args.body) throw new Error("to, subject, and body are required");
  const payload = {
    mode: "draft",
    fromAddress: required("ZOHO_MAIL_FROM_ADDRESS", env),
    toAddress: String(args.to),
    ccAddress: args.cc ? String(args.cc) : undefined,
    bccAddress: args.bcc ? String(args.bcc) : undefined,
    subject: String(args.subject),
    content: String(args.body),
    mailFormat: args.format === "html" ? "html" : "plaintext",
    askReceipt: "no"
  };
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  const result = await zohoRequest(`/accounts/${encodeURIComponent(accountId)}/messages`, env, {
    method: "POST",
    body: JSON.stringify(payload)
  }, fetchImpl);
  return { status: "draft_saved", draft: result.data || result };
}

export function resetTokenCacheForTests() {
  cachedAccessToken = null;
}


import http from "node:http";
import { randomBytes } from "node:crypto";

const html = (message = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Build Netlify Environment File</title><style>body{font:17px system-ui;max-width:650px;margin:35px auto;padding:18px;color:#302820;background:#f7f3ea}main{background:#fff;padding:30px;border-radius:18px;box-shadow:0 4px 24px #0001}label{display:block;font-weight:700;margin-top:18px}input{box-sizing:border-box;width:100%;padding:13px;margin-top:6px;border:2px solid #918574;border-radius:9px;font:inherit}button{width:100%;margin-top:25px;padding:15px;border:0;border-radius:999px;background:#3f352a;color:#fff;font:bold 17px system-ui}.note{color:#685d50;line-height:1.5}.error{background:#ffe9e5;padding:13px;border-radius:9px}</style></head><body><main><h1>Build the Zoho connector file</h1><p class="note">This runs only on your computer. Values are sent directly to Zoho for authorization and placed into the downloaded file; they are not logged or saved by this helper.</p>${message}<form method="post">
<label>1. Zoho Client ID<input name="client_id" required autocomplete="off"></label>
<label>2. Zoho Client Secret<input name="client_secret" type="password" required autocomplete="off"></label>
<label>3. NEW temporary Zoho code<input name="code" type="password" required autocomplete="off"></label>
<label>4. Your Zoho Mail email address<input name="from_address" type="email" required autocomplete="email"></label>
<label>5. Choose your private connector access code<input name="access_code" type="password" required minlength="16" autocomplete="new-password"></label>
<label>6. Old exposed refresh token (optional, to revoke it)<input name="old_refresh_token" type="password" autocomplete="off"></label>
<button>Authorize and download the Netlify .env file</button></form></main></body></html>`;

const esc = (value) => String(value).replace(/[&<>\"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const envLine = (key, value) => `${key}=${JSON.stringify(String(value))}`;

const server = http.createServer(async (request, response) => {
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
  if (request.method === "GET") { response.setHeader("content-type", "text/html; charset=utf-8"); return response.end(html()); }
  if (request.method !== "POST") { response.statusCode = 405; return response.end(); }
  let body = "";
  for await (const chunk of request) { body += chunk; if (body.length > 64_000) { response.statusCode = 413; return response.end(); } }
  const form = new URLSearchParams(body);
  const clientId = form.get("client_id") || "";
  const clientSecret = form.get("client_secret") || "";
  try {
    const exchange = await fetch("https://accounts.zoho.com/oauth/v2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code: form.get("code") || "" }) });
    const tokens = await exchange.json();
    if (!exchange.ok || !tokens.access_token || !tokens.refresh_token) throw new Error(tokens.error || "Zoho did not return the required tokens");
    const accountsResponse = await fetch("https://mail.zoho.com/api/accounts", { headers: { accept: "application/json", authorization: `Zoho-oauthtoken ${tokens.access_token}` } });
    const accountsResult = await accountsResponse.json();
    if (!accountsResponse.ok) throw new Error(accountsResult?.status?.description || "Unable to read the Zoho account ID");
    const accounts = Array.isArray(accountsResult.data) ? accountsResult.data : [accountsResult.data].filter(Boolean);
    const fromAddress = (form.get("from_address") || "").trim();
    const account = accounts.find((item) => [item?.mailboxAddress, item?.emailAddress, item?.primaryEmailAddress].filter(Boolean).some((value) => String(value).toLowerCase() === fromAddress.toLowerCase())) || accounts[0];
    const accountId = account?.accountId || account?.accountID || account?.account_id;
    if (!accountId) throw new Error("Zoho returned no mailbox account ID");
    const oldToken = form.get("old_refresh_token") || "";
    if (oldToken && oldToken !== tokens.refresh_token) await fetch(`https://accounts.zoho.com/oauth/v2/token/revoke?token=${encodeURIComponent(oldToken)}`, { method: "POST" });
    const values = [
      envLine("CONNECTOR_BASE_URL", "https://nomadic-paws-mail.netlify.app"),
      envLine("CONNECTOR_AUTH_SECRET", randomBytes(48).toString("base64url")),
      envLine("CONNECTOR_ACCESS_CODE", form.get("access_code") || ""),
      envLine("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.com"),
      envLine("ZOHO_MAIL_API_URL", "https://mail.zoho.com/api"),
      envLine("ZOHO_MAIL_CLIENT_ID", clientId),
      envLine("ZOHO_MAIL_CLIENT_SECRET", clientSecret),
      envLine("ZOHO_MAIL_REFRESH_TOKEN", tokens.refresh_token),
      envLine("ZOHO_MAIL_ACCOUNT_ID", accountId),
      envLine("ZOHO_MAIL_FROM_ADDRESS", fromAddress)
    ].join("\n") + "\n";
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.setHeader("content-disposition", "attachment; filename=nomadic-paws-mail.env");
    return response.end(values);
  } catch (error) {
    response.statusCode = 400;
    response.setHeader("content-type", "text/html; charset=utf-8");
    return response.end(html(`<div class="error"><strong>Could not build the file:</strong> ${esc(error.message)}</div>`));
  }
});

server.listen(43129, "127.0.0.1", () => console.log("Environment helper ready at http://127.0.0.1:43129"));

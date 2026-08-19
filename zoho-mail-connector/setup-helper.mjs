import http from "node:http";

const page = (message = "") => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Zoho Mail Connector Setup</title>
<style>body{font:17px system-ui;max-width:620px;margin:40px auto;padding:20px;color:#302820;background:#f7f3ea}main{background:white;padding:30px;border-radius:18px;box-shadow:0 4px 24px #0001}label{display:block;font-weight:700;margin-top:20px}input{box-sizing:border-box;width:100%;padding:14px;margin-top:7px;border:2px solid #918574;border-radius:9px;font:inherit}button{width:100%;margin-top:26px;padding:15px;border:0;border-radius:999px;background:#3f352a;color:white;font:bold 17px system-ui}.note{color:#685d50;line-height:1.5}.result{padding:14px;background:#f4eee1;border-radius:10px;overflow-wrap:anywhere}</style>
</head><body><main><h1>Connect Zoho Mail</h1><p class="note">Paste each value into the matching box. This page runs only on your computer and does not save or log the values.</p>${message}<form method="post">
<label>1. Zoho Client ID<input name="client_id" required autocomplete="off"></label>
<label>2. Zoho Client Secret<input name="client_secret" type="password" required autocomplete="off"></label>
<label>3. Temporary Zoho Code<input name="code" type="password" required autocomplete="off"></label>
<button>Exchange for the long-lived refresh token</button></form></main></body></html>`;

const escapeHtml = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

const server = http.createServer(async (request, response) => {
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
  response.setHeader("referrer-policy", "no-referrer");
  if (request.method === "GET") {
    response.setHeader("content-type", "text/html; charset=utf-8");
    return response.end(page());
  }
  if (request.method !== "POST") { response.statusCode = 405; return response.end(); }
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 32_000) { response.statusCode = 413; return response.end(); }
  }
  const values = new URLSearchParams(body);
  try {
    const tokenResponse = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: values.get("client_id") || "",
        client_secret: values.get("client_secret") || "",
        code: values.get("code") || ""
      })
    });
    const result = await tokenResponse.json();
    if (!tokenResponse.ok || !result.refresh_token) throw new Error(result.error || "Zoho did not return a refresh token");
    response.setHeader("content-type", "text/html; charset=utf-8");
    return response.end(page(`<div class="result"><strong>Success.</strong><p>Copy this refresh token and keep it private:</p><code>${escapeHtml(result.refresh_token)}</code><p>You can take your time now; this token does not have the ten-minute deadline.</p></div>`));
  } catch (error) {
    response.statusCode = 400;
    response.setHeader("content-type", "text/html; charset=utf-8");
    return response.end(page(`<div class="result"><strong>Zoho could not complete the exchange:</strong> ${escapeHtml(error.message)}</div>`));
  }
});

const port = 43128;
server.listen(port, "127.0.0.1", () => {
  console.log(`Zoho setup helper is ready at http://127.0.0.1:${port}`);
});

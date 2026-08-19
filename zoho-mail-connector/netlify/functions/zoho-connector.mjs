import { metadata, register, authorize, token, requireAccess } from "../../src/oauth.mjs";
import { handleMcp } from "../../src/mcp.mjs";

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

export default async (request) => {
  const env = process.env;
  const url = new URL(request.url);
  const route = url.searchParams.get("route") || url.pathname.replace(/^\//, "");
  if (!env.CONNECTOR_BASE_URL || !env.CONNECTOR_AUTH_SECRET || !env.CONNECTOR_ACCESS_CODE) return json({ error: "Connector is not configured" }, 503);
  if (route === "oauth-authorization-server") return json(metadata(env));
  if (route === "oauth-protected-resource") return json({ resource: `${env.CONNECTOR_BASE_URL}/mcp`, authorization_servers: [env.CONNECTOR_BASE_URL] });
  if (route === "oauth/register" && request.method === "POST") return register(request, env);
  if (route === "oauth/authorize" && ["GET", "POST"].includes(request.method)) return authorize(request, env);
  if (route === "oauth/token" && request.method === "POST") return token(request, env);
  if (route === "mcp") {
    try { requireAccess(request, env); } catch { return json({ error: "unauthorized" }, 401, { "www-authenticate": `Bearer resource_metadata=\"${env.CONNECTOR_BASE_URL}/.well-known/oauth-protected-resource\"` }); }
    if (request.method === "GET") return new Response(null, { status: 405, headers: { allow: "POST" } });
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST" } });
    const message = await request.json();
    const response = await handleMcp(message, env);
    return response ? json(response) : new Response(null, { status: 202 });
  }
  return json({ error: "not_found" }, 404);
};

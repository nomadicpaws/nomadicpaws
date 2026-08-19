import test from "node:test";
import assert from "node:assert/strict";
import { TOOLS, handleMcp } from "../src/mcp.mjs";
import { createDraft, resetTokenCacheForTests } from "../src/zoho.mjs";
import { signToken, verifyToken, pkceChallenge } from "../src/security.mjs";

test("tool surface contains no sending or destructive mail actions", () => {
  assert.deepEqual(TOOLS.map((tool) => tool.name), ["search_mail", "read_message", "create_draft"]);
  const surface = JSON.stringify(TOOLS).toLowerCase();
  for (const prohibited of ["send_mail", "delete_mail", "archive_mail", "move_mail", "spam_mail"]) assert.equal(surface.includes(prohibited), false);
});

test("unknown tools fail closed", async () => {
  const response = await handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "send_mail", arguments: {} } }, {});
  assert.match(response.error.message, /prohibited/i);
});

test("draft requests force mode=draft and never accept a send mode", async () => {
  resetTokenCacheForTests();
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/oauth/v2/token")) return new Response(JSON.stringify({ access_token: "test", expires_in: 3600 }), { status: 200 });
    return new Response(JSON.stringify({ status: { code: 200 }, data: { messageId: "draft-1" } }), { status: 200 });
  };
  const env = { ZOHO_MAIL_REFRESH_TOKEN: "r", ZOHO_MAIL_CLIENT_ID: "i", ZOHO_MAIL_CLIENT_SECRET: "s", ZOHO_MAIL_ACCOUNT_ID: "a", ZOHO_MAIL_FROM_ADDRESS: "hello@example.com" };
  await createDraft({ to: "person@example.com", subject: "Hi", body: "Draft", mode: "send" }, env, fakeFetch);
  const payload = JSON.parse(calls[1].options.body);
  assert.equal(payload.mode, "draft");
  assert.equal(payload.askReceipt, "no");
});

test("signed connector tokens reject tampering and PKCE is deterministic", () => {
  const token = signToken({ typ: "access", exp: Date.now() + 1000 }, "secret");
  assert.equal(verifyToken(token, "secret", "access").typ, "access");
  assert.throws(() => verifyToken(`${token}x`, "secret", "access"));
  assert.equal(pkceChallenge("verifier"), pkceChallenge("verifier"));
});

import { searchMail, readMessage, createDraft } from "./zoho.mjs";

export const TOOLS = [
  {
    name: "search_mail",
    description: "Search the connected Zoho mailbox. This is read-only.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 25 } }, required: ["query"], additionalProperties: false }
  },
  {
    name: "read_message",
    description: "Read one Zoho Mail message returned by search_mail. This is read-only.",
    inputSchema: { type: "object", properties: { folder_id: { type: "string" }, message_id: { type: "string" } }, required: ["folder_id", "message_id"], additionalProperties: false }
  },
  {
    name: "create_draft",
    description: "Create an unsent Zoho Mail draft. This tool can never send email.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string" }, cc: { type: "string" }, bcc: { type: "string" },
        subject: { type: "string" }, body: { type: "string" }, format: { type: "string", enum: ["plaintext", "html"] }
      },
      required: ["to", "subject", "body"], additionalProperties: false
    }
  }
];

const result = (value) => ({ content: [{ type: "text", text: JSON.stringify(value) }] });

export async function handleMcp(message, env, fetchImpl = fetch) {
  const base = { jsonrpc: "2.0", id: message?.id ?? null };
  try {
    if (message.method === "initialize") {
      const requestedVersion = typeof message.params?.protocolVersion === "string" ? message.params.protocolVersion : "2025-03-26";
      return { ...base, result: { protocolVersion: requestedVersion, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "Nomadic Paws Zoho Mail", version: "0.1.1" }, instructions: "Private Zoho Mail access for search, reading, and saving unsent drafts only. Sending and destructive mailbox actions are unavailable." } };
    }
    if (message.method === "notifications/initialized") return null;
    if (message.method === "ping") return { ...base, result: {} };
    if (message.method === "tools/list") return { ...base, result: { tools: TOOLS } };
    if (message.method === "tools/call") {
      const name = message.params?.name;
      const args = message.params?.arguments || {};
      if (name === "search_mail") return { ...base, result: result(await searchMail(args, env, fetchImpl)) };
      if (name === "read_message") return { ...base, result: result(await readMessage(args, env, fetchImpl)) };
      if (name === "create_draft") return { ...base, result: result(await createDraft(args, env, fetchImpl)) };
      throw new Error("Unknown or prohibited tool");
    }
    return { ...base, error: { code: -32601, message: "Method not found" } };
  } catch (error) {
    return { ...base, error: { code: -32000, message: error.message || "Connector error" } };
  }
}

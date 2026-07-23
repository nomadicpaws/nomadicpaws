import type { Handler } from "@netlify/functions";

const DOWNLOAD_URL = "/downloads/how-to-leash-train-your-cat.pdf";

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event: Parameters<Handler>[0]) {
  const contentType = event.headers["content-type"] || "";
  if (contentType.includes("application/json")) return JSON.parse(event.body || "{}");
  return Object.fromEntries(new URLSearchParams(event.body || ""));
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, {error: "Please submit the guide form."});

  try {
    const body = parseBody(event);
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.firstName || "").trim().slice(0, 80);
    const honeypot = String(body.company || "").trim();

    if (honeypot) return json(200, {message: "Your guide is ready.", downloadUrl: DOWNLOAD_URL});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, {error: "Please enter a valid email address."});
    }

    const {ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_CAMPAIGNS_LIST_KEY} = process.env;
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN || !ZOHO_CAMPAIGNS_LIST_KEY) {
      console.error("Zoho Campaigns environment variables are incomplete.");
      return json(503, {error: "The email delivery is being connected. Please try again soon."});
    }

    const accountsUrl = (process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com").replace(/\/$/, "");
    const campaignsUrl = (process.env.ZOHO_CAMPAIGNS_API_URL || "https://campaigns.zoho.com").replace(/\/$/, "");
    const tokenParams = new URLSearchParams({
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    });
    const tokenResponse = await fetch(`${accountsUrl}/oauth/v2/token`, {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: tokenParams,
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) {
      console.error("Zoho token refresh failed:", token);
      return json(502, {error: "We could not send the guide just yet. Please try again."});
    }

    const contactInfo: Record<string, string> = {"Contact Email": email};
    if (firstName) contactInfo["First Name"] = firstName;
    const subscribeParams = new URLSearchParams({
      resfmt: "JSON",
      listkey: ZOHO_CAMPAIGNS_LIST_KEY,
      contactinfo: JSON.stringify(contactInfo),
      source: "Nomadic Paws free training guide",
    });
    if (process.env.ZOHO_CAMPAIGNS_TOPIC_ID) {
      subscribeParams.set("topic_id", process.env.ZOHO_CAMPAIGNS_TOPIC_ID);
    }

    const subscribeResponse = await fetch(`${campaignsUrl}/api/v1.1/json/listsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Zoho-oauthtoken ${token.access_token}`,
      },
      body: subscribeParams,
    });
    const subscription = await subscribeResponse.json();
    if (!subscribeResponse.ok || String(subscription.code) !== "0") {
      console.error("Zoho Campaigns subscription failed:", subscription);
      return json(502, {error: "We could not send the guide just yet. Please try again."});
    }

    return json(200, {
      message: "Your guide is ready. Check your inbox for a copy from Nomadic Paws.",
      downloadUrl: DOWNLOAD_URL,
    });
  } catch (error) {
    console.error("Training guide signup failed:", error);
    return json(500, {error: "We could not send the guide just yet. Please try again."});
  }
};

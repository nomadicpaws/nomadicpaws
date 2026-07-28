import type {Handler} from "@netlify/functions";

const ALLOWED_SOURCES: Record<string, string> = {
  homepage: "Nomadic Paws homepage",
  "trail-journal": "Nomadic Paws Trail Journal",
  "product-updates": "Nomadic Paws product updates",
};

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
  if (event.httpMethod !== "POST") {
    return json(405, {error: "Please submit the signup form."});
  }

  try {
    const body = parseBody(event);
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.firstName || "").trim().slice(0, 80);
    const sourceKey = String(body.source || "").trim();
    const honeypot = String(body.company || "").trim();

    if (honeypot) return json(200, {message: "Please check your inbox."});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, {error: "Please enter a valid email address."});
    }
    if (!ALLOWED_SOURCES[sourceKey]) {
      return json(400, {error: "Please use a Nomadic Paws signup form."});
    }

    const {
      ZOHO_CLIENT_ID,
      ZOHO_CLIENT_SECRET,
      ZOHO_REFRESH_TOKEN,
      ZOHO_PACK_SIGNUPS_LIST_KEY,
    } = process.env;
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN || !ZOHO_PACK_SIGNUPS_LIST_KEY) {
      console.error("Zoho Pack signup environment variables are incomplete.");
      return json(503, {error: "The Pack signup is being connected. Please try again soon."});
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
      return json(502, {error: "We could not complete your signup just yet. Please try again."});
    }

    const contactInfo: Record<string, string> = {"Contact Email": email};
    if (firstName) contactInfo["First Name"] = firstName;
    const subscribeParams = new URLSearchParams({
      resfmt: "JSON",
      listkey: ZOHO_PACK_SIGNUPS_LIST_KEY,
      contactinfo: JSON.stringify(contactInfo),
      source: ALLOWED_SOURCES[sourceKey],
    });
    const topicId = process.env.ZOHO_PACK_TOPIC_ID || process.env.ZOHO_CAMPAIGNS_TOPIC_ID;
    if (topicId) subscribeParams.set("topic_id", topicId);

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
      console.error("Zoho Pack subscription failed:", subscription);
      return json(502, {error: "We could not complete your signup just yet. Please try again."});
    }

    return json(200, {
      message: "Almost there—check your inbox and confirm your email to join the Pack.",
    });
  } catch (error) {
    console.error("Pack signup failed:", error);
    return json(500, {error: "We could not complete your signup just yet. Please try again."});
  }
};

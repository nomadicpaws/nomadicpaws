// netlify/edge-functions/post-social-preview.js
//
// Injects per-post Open Graph / Twitter meta tags into the HTML for
// /trail-journal/:slug before it reaches the browser. This is what makes
// iMessage, Facebook, Twitter, Discord, etc. show the correct title,
// description, and image for each individual Trail Journal post — those
// crawlers don't run JavaScript, so the client-side fetch() in
// post-template.html never runs for them. This runs on Netlify's edge
// instead, so the HTML is already correct by the time it leaves the server.
export default async (request, context) => {
  const url = new URL(request.url);
  const slug = context.params.slug;
  // Let the normal request chain run first (this resolves to post-template.html
  // via your existing redirect rule).
  const response = await context.next();
  if (!slug) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  let post;
  try {
    const apiUrl = new URL("/api/posts", url.origin);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    let postsRes;
    try {
      postsRes = await fetch(apiUrl.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!postsRes.ok) return response;
    const posts = await postsRes.json();
    post = Array.isArray(posts) ? posts.find((p) => p.slug === slug) : null;
  } catch (err) {
    // If the posts API is unreachable or times out, just serve the page as-is
    // (it'll fall back to the static default tags already in the HTML).
    return response;
  }
  if (!post) return response;
  const title = `${post.title} — Nomadic Paws`;
  const rawDescription =
    post.excerpt || post.description || stripMarkdown(post.body || "");
  const description = truncate(rawDescription, 200);
  const image = post.image
    ? new URL(post.image, url.origin).toString()
    : new URL("/og-trail-journal.png", url.origin).toString();
  const pageUrl = `${url.origin}/trail-journal/${slug}`;

  class TitleRewriter {
    element(element) {
      element.setInnerContent(title);
    }
  }

  // Strips the static fallback og:*/twitter:* tags from post-template.html
  // so crawlers don't grab the generic "Trail Journal" tag instead of the
  // post-specific one appended below. og:site_name is left alone since the
  // HeadRewriter below doesn't re-add it.
  class MetaStripper {
    element(element) {
      const prop = element.getAttribute("property") || element.getAttribute("name");
      if (!prop) return;
      if (prop === "og:site_name") return;
      if (prop.startsWith("og:") || prop.startsWith("twitter:")) {
        element.remove();
      }
    }
  }

  class HeadRewriter {
    element(element) {
      element.append(
        `<meta property="og:type" content="article">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:image" content="${escapeAttr(image)}">
<meta property="og:url" content="${escapeAttr(pageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(title)}">
<meta name="twitter:description" content="${escapeAttr(description)}">
<meta name="twitter:image" content="${escapeAttr(image)}">`,
        { html: true }
      );
    }
  }

  return new HTMLRewriter()
    .on("title", new TitleRewriter())
    .on("meta", new MetaStripper())
    .on("head", new HeadRewriter())
    .transform(response);
};

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripMarkdown(md) {
  return md
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[#*_`>]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + "…";
}

export const config = { path: "/trail-journal/:slug" };

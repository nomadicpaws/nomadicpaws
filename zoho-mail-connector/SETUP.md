# Nomadic Paws private Zoho Mail connector

This is a separate, private remote MCP service for ChatGPT and Claude. Its exposed tools can search mail, read one message, and save an unsent draft. It intentionally has no send, delete, archive, move, spam, or mailbox-settings tool.

## Safety boundary

Zoho uses the same `ZohoMail.messages.CREATE` permission for saving a draft and sending mail. The connector compensates by exposing only `create_draft`, always inserting `mode: draft` server-side, and having no code path or MCP tool that sends mail.

## Required Zoho scopes

- `ZohoMail.accounts.READ`
- `ZohoMail.messages.READ`
- `ZohoMail.messages.CREATE`

Do not grant `ZohoMail.messages.ALL`, `UPDATE`, or `DELETE`.

## Separate Netlify site

Create a new Netlify site with this directory as its base directory. Do not attach these secrets to the main Nomadic Paws website site.

Add the variables listed in `.env.example`. Generate unique values for `CONNECTOR_AUTH_SECRET` and `CONNECTOR_ACCESS_CODE`. The access code is entered only on the connector's private authorization screen.

The Zoho client ID, secret, and refresh token must be entered directly in Netlify, never in ChatGPT, Claude, source files, or GitHub.

## Connector URLs

After deployment, both clients use:

`https://YOUR-CONNECTOR-SITE.netlify.app/mcp`

Claude: add a custom web connector from **Customize > Connectors**.

ChatGPT Business: enable Developer Mode, then create a custom app under **Workspace settings > Apps** and provide the MCP URL.

Keep the connector in draft/private mode until the labeled test draft has been created and read back successfully.

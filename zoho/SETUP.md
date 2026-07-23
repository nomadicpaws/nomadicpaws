# Free training guide: Zoho Campaigns + Netlify setup

The website code is ready. Complete these account-level steps once so the form can subscribe visitors and Zoho Campaigns can email the guide.

## 1. Create the mailing list and delivery workflow in Zoho Campaigns

1. Create a mailing list named `Free Cat Training Guides`.
2. Copy its **List Key**.
3. Under **Automation**, create a **Workflow** triggered when a contact joins that list.
4. Add a **Send Email** action with no delay.
5. Use the subject `Your free cat leash-training guide is ready`.
6. Import or recreate the design in `zoho/training-guide-delivery.html`.
7. Confirm the download button points to:
   - Complete guide: `https://nomadicpaws.co/downloads/nomadic-paws-complete-leash-training-guide.pdf`
   - Quick-start guide: `https://nomadicpaws.co/downloads/nomadic-paws-leash-training-quick-start.pdf`
8. Activate the workflow.

Zoho is retiring the older Autoresponder feature for new users, so use a Workflow when it is available.

## 2. Create the narrowest Zoho API credential

1. In the Zoho API Console, create a **Self Client** for this Nomadic Paws-owned server connection.
2. Authorize only the scope needed to subscribe a contact:
   `ZohoCampaigns.contact.UPDATE`
3. Generate a refresh token and keep the Client ID, Client Secret, and Refresh Token private.
4. Do not paste any of those values into GitHub or a website file.

## 3. Add the private values in Netlify

Open the Nomadic Paws site in Netlify, then go to:

`Site configuration > Environment variables`

Add:

- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_CAMPAIGNS_LIST_KEY`

Optional:

- `ZOHO_CAMPAIGNS_TOPIC_ID` if the Zoho account requires Topics.
- `ZOHO_ACCOUNTS_URL` and `ZOHO_CAMPAIGNS_API_URL` only if the Zoho account is outside the US data center. The code defaults to the `.com` US domains.

Trigger a fresh Netlify deploy after saving the values.

## 4. Test the complete path

1. Open the live checklist page in a private browser window.
2. Submit an email address you can check.
3. Confirm the page immediately reveals the PDF download link.
4. Confirm the contact appears in the Zoho list.
5. Confirm the workflow email arrives and its download button works.
6. Test the unsubscribe link Zoho adds to the sent email.

## Official references

- Zoho Campaigns subscribe API:
  https://www.zoho.com/campaigns/help/developers/contact-subscribe.html
- Zoho Campaigns OAuth access tokens:
  https://www.zoho.com/campaigns/help/developers/access-token.html
- Zoho Campaigns data centers:
  https://www.zoho.com/campaigns/help/developers/data-centers.html

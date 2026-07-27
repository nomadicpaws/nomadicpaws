# Free training guide: Zoho Campaigns + Netlify setup

The website code is ready. Complete these account-level steps once so the form can subscribe visitors and Zoho Campaigns can email the guide.

## 1. Create the mailing list and delivery workflow in Zoho Campaigns

1. Create a mailing list named `Free Cat Training Guides`.
2. Copy its **List Key**.
3. In **Settings > Manage Opt-in**, enable **Double Opt-in** and customize the confirmation email. Keep this email focused on the confirmation button; do not include the guide links in it.
4. Confirm the mailing list has a signup form enabled. Contacts submitted through the subscribe API remain pending and receive the confirmation email; Zoho adds them to the list only after they confirm.
5. Under **Automation**, create a **Workflow** triggered when a confirmed contact joins that list.
6. Add a **Send Email** action with no delay.
7. Use the subject `Your free cat leash-training guide is ready`.
8. Import or recreate the design in `zoho/training-guide-delivery.html`.
9. Confirm the download buttons point to:
   - Complete guide: `https://nomadicpaws.co/downloads/nomadic-paws-complete-leash-training-guide.pdf`
   - Quick-start guide: `https://nomadicpaws.co/downloads/nomadic-paws-leash-training-quick-start.pdf`
10. Activate the workflow.

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
3. Confirm the page tells the visitor to check their inbox, without revealing either PDF link.
4. Confirm Zoho sends the subscription confirmation email.
5. Before clicking confirm, verify the guide-delivery workflow has not sent the guides.
6. Click the confirmation link and confirm the contact then appears as subscribed in the Zoho list.
7. Confirm the workflow email arrives after confirmation and both download buttons work.
8. Test the unsubscribe link Zoho adds to the sent email.

## Official references

- Zoho Campaigns subscribe API:
  https://www.zoho.com/campaigns/help/developers/contact-subscribe.html
- Zoho Campaigns OAuth access tokens:
  https://www.zoho.com/campaigns/help/developers/access-token.html
- Zoho Campaigns data centers:
  https://www.zoho.com/campaigns/help/developers/data-centers.html

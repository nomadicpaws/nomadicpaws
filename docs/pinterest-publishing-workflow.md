# Pinterest publishing workflow

Pinterest campaigns live in a separate **Pinterest Queue** collection in the Trail Journal CMS. This keeps image preparation and Pin scheduling outside the article-writing screen.

## For each Trail Journal post

1. Open **Pinterest Queue** and create a campaign.
2. Select the related Trail Journal story.
3. Enter the Pinterest board name and shared keywords.
4. Upload four vertical Pinterest images and add a title and description for each.
5. For an older article, turn **Retroactive article** on.
6. Save the campaign.

The four uploads also appear automatically as a magazine-style photo spread in the related Trail Journal article. They use the same files in the shared CMS media library, so there is no second upload and no need to reopen the article editor. The Pin title supplies accessible alternative text for the photo.

## What publishes when

- For a new article, Pin 1 appears in `/pinterest-rss.xml` as soon as the article publishes. Pinterest normally imports an updated RSS feed within 24 hours.
- For a new article, Pins 2–4 appear in `/pinterest.csv` for article publish day +7, +14, and +21.
- For an older article, all four images bypass RSS and appear in the CSV. They fill the next open calendar dates between the regular new-article RSS windows and weekly follow-ups.
- Download the CSV immediately before uploading it. Retroactive dates are calculated from the day it is downloaded so they remain in the future.

## Pinterest setup

- Connect `https://nomadicpaws.co/pinterest-rss.xml` under Pinterest **Settings → Import content → Connect RSS feed**.
- Download `https://nomadicpaws.co/pinterest.csv` after campaigns are ready, then upload it under **Settings → Import content → Upload .csv or .txt file**.
- Pinterest requires desktop for RSS connection and bulk CSV upload.

The CSV columns follow Pinterest's current bulk-creation format: Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, and Keywords.

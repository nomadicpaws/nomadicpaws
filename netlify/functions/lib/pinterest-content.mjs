const SITE_URL = 'https://nomadicpaws.co'
const DAY_MS = 24 * 60 * 60 * 1000

export function xmlEscape(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function csvCell(value = '') {
  const text = String(value).replaceAll('"', '""')
  return /[",\r\n]/.test(text) ? `"${text}"` : text
}

export function postUrl(slug) {
  return `${SITE_URL}/trail-journal/${encodeURIComponent(slug)}`
}

export function absoluteMediaUrl(path = '') {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}/${String(path).replace(/^\/+/, '')}`
}

export function brandedMediaUrl(pin = {}) {
  const source = absoluteMediaUrl(pin.image || '')
  if (!pin.template) return source
  const template = ['bark', 'sage', 'sand', 'terracotta'].includes(pin.template) ? pin.template : 'bark'
  const size = ['small', 'medium'].includes(pin.logo_size) ? pin.logo_size : 'small'
  const placement = ['left', 'right'].includes(pin.logo_placement) ? pin.logo_placement : 'left'
  return `${SITE_URL}/pinterest-image.jpg?image=${encodeURIComponent(source)}&template=${template}&size=${size}&placement=${placement}`
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS)
}

export function dateOnly(date) {
  return date.toISOString().slice(0, 10)
}

export function buildRss(campaigns, postsBySlug, now = new Date()) {
  const items = campaigns
    .filter((campaign) => campaign.enabled !== false && campaign.retroactive !== true)
    .flatMap((campaign) => {
      const post = postsBySlug.get(campaign.post_slug)
      const publishDate = post?.date ? new Date(post.date) : null
      if (!post || !publishDate || Number.isNaN(publishDate.getTime())) return []
      if (publishDate > now) return []
      const pin = campaign.rss_pin
      if (!pin?.image || !pin?.title) return []
      const link = postUrl(campaign.post_slug)
      return [{ campaign, post, pin, link, publishDate }]
    })
    .sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime())
    .map(({ campaign, pin, link, publishDate }) => `
    <item>
      <title>${xmlEscape(pin.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="false">${xmlEscape(`${link}#pinterest-rss`)}</guid>
      <pubDate>${publishDate.toUTCString()}</pubDate>
      <description>${xmlEscape(pin.description || campaign.campaign_title || pin.title)}</description>
      <media:content url="${xmlEscape(brandedMediaUrl(pin))}" medium="image" />
    </item>`)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Nomadic Paws — Pinterest Trail Journal</title>
    <link>${SITE_URL}/trail-journal</link>
    <description>Delayed Pinterest publishing feed for Nomadic Paws Trail Journal stories.</description>${items}
  </channel>
</rss>\n`
}

function nextOpenDate(cursor, occupied) {
  let candidate = cursor
  while (occupied.has(dateOnly(candidate))) candidate = addDays(candidate, 1)
  return candidate
}

export function buildCsv(campaigns, postsBySlug, now = new Date()) {
  const header = ['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords']
  const rows = [header]

  const validCampaigns = campaigns
    .filter((campaign) => campaign.enabled !== false)
    .map((campaign) => {
      const post = postsBySlug.get(campaign.post_slug)
      const publishDate = post?.date ? new Date(post.date) : null
      return { campaign, post, publishDate }
    })
    .filter(({ post, publishDate }) => post && publishDate && !Number.isNaN(publishDate.getTime()))

  const occupied = new Set()
  for (const { campaign, publishDate } of validCampaigns) {
    if (campaign.retroactive === true) continue
    // Keep the article publication day and Pinterest's following 24-hour RSS
    // import window clear, along with the three weekly CSV follow-ups.
    ;[0, 1, 7, 14, 21].forEach((days) => occupied.add(dateOnly(addDays(publishDate, days))))
  }

  for (const { campaign, publishDate } of validCampaigns.filter(({ campaign }) => campaign.retroactive !== true)) {
    const dates = [7, 14, 21].map((days) => addDays(publishDate, days))
    const pins = [campaign.day_7_pin, campaign.day_14_pin, campaign.day_21_pin]
    pins.forEach((pin, index) => {
      if (!pin?.image || !pin?.title) return
      rows.push([
        pin.title.slice(0, 100),
        brandedMediaUrl(pin),
        campaign.board || 'Nomadic Paws Trail Journal',
        '',
        (pin.description || '').slice(0, 500),
        postUrl(campaign.post_slug),
        dateOnly(dates[index]),
        campaign.keywords || '',
      ])
    })
  }

  // Older articles bypass RSS. Their complete four-image campaigns fill the
  // next available dates between regular new-post publishing dates.
  let cursor = addDays(new Date(`${dateOnly(now)}T12:00:00Z`), 1)
  const retroactive = validCampaigns
    .filter(({ campaign }) => campaign.retroactive === true)
    .sort((a, b) => a.publishDate.getTime() - b.publishDate.getTime())

  for (const { campaign } of retroactive) {
    const pins = [campaign.rss_pin, campaign.day_7_pin, campaign.day_14_pin, campaign.day_21_pin]
    for (const pin of pins) {
      if (!pin?.image || !pin?.title) continue
      cursor = nextOpenDate(cursor, occupied)
      rows.push([
        pin.title.slice(0, 100),
        brandedMediaUrl(pin),
        campaign.board || 'Nomadic Paws Trail Journal',
        '',
        (pin.description || '').slice(0, 500),
        postUrl(campaign.post_slug),
        dateOnly(cursor),
        campaign.keywords || '',
      ])
      occupied.add(dateOnly(cursor))
      cursor = addDays(cursor, 1)
    }
  }

  return `${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

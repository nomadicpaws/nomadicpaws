const colors = ['bark', 'sage', 'sand', 'terracotta']
const sizes = ['small', 'medium']
const sides = ['left', 'right']

function validPin(pin) {
  return pin && typeof pin.image === 'string' && pin.image.length <= 1000
    && typeof pin.title === 'string' && pin.title.trim().length > 0 && pin.title.length <= 100
    && typeof pin.description === 'string' && pin.description.length <= 500
    && colors.includes(pin.template) && sizes.includes(pin.logo_size) && sides.includes(pin.logo_placement)
}

export function validPinterestCampaign(value) {
  return value && typeof value.post_slug === 'string' && /^[a-z0-9][a-z0-9-]{0,120}$/.test(value.post_slug)
    && typeof value.campaign_title === 'string' && value.campaign_title.trim().length > 0 && value.campaign_title.length <= 160
    && typeof value.board === 'string' && value.board.trim().length > 0 && value.board.length <= 120
    && typeof value.keywords === 'string' && value.keywords.length <= 500
    && typeof value.retroactive === 'boolean' && typeof value.enabled === 'boolean'
    && [value.rss_pin, value.day_7_pin, value.day_14_pin, value.day_21_pin].every(validPin)
}


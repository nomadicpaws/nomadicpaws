import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const outputSizes = {
  'trail-hero': [1600, 900],
  'trail-article': [1500, 1000],
  pinterest: [1000, 1500],
  instagram: [1080, 1350],
}

export async function renderWorkingImage(original, version) {
  const [width, height] = outputSizes[version.destination_type] || outputSizes.instagram
  const treatment = version.treatment
  const position = treatment.focus === 'top' ? 'north' : treatment.focus === 'bottom' ? 'south' : 'centre'
  const base = sharp(original).rotate().resize(width, height, { fit: 'cover', position })
  if (treatment.logoColor === 'none') return base.jpeg({ quality: 92, mozjpeg: true }).toBuffer()
  const logoWidth = Math.round(width * (treatment.logoSize === 'medium' ? 0.31 : 0.23))
  const marginX = Math.round(width * 0.06), marginBottom = Math.round(height * 0.04)
  const logoPath = join(process.cwd(), 'images', 'pinterest-logos', `logo-${treatment.logoColor}.png`)
  const logo = await sharp(await readFile(logoPath)).resize({ width: logoWidth }).png().toBuffer()
  const logoMeta = await sharp(logo).metadata()
  return base.composite([{
    input: logo,
    left: treatment.logoSide === 'right' ? width - marginX - (logoMeta.width || logoWidth) : marginX,
    top: height - marginBottom - (logoMeta.height || logoWidth),
  }]).jpeg({ quality: 92, mozjpeg: true }).toBuffer()
}

export function workingFilename(version) {
  return `nomadic-paws-${version.destination_type}-${version.id}.jpg`
}

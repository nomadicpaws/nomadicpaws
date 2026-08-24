import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const colors = ['bark', 'sage', 'sand', 'terracotta']
const sourceDirectory = join(process.cwd(), 'images', 'pinterest-templates')
const outputDirectory = join(process.cwd(), 'images', 'pinterest-logos')

await mkdir(outputDirectory, { recursive: true })

for (const color of colors) {
  await sharp(join(sourceDirectory, `pin-${color}.png`))
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outputDirectory, `logo-${color}.png`))
}

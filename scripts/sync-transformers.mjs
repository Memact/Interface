import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const source = path.join(root, 'node_modules', '@xenova', 'transformers', 'dist', 'transformers.min.js')
const vendorDir = path.join(root, 'extension', 'memact', 'vendor')
const target = path.join(vendorDir, 'transformers.min.js')

async function main() {
  try {
    await mkdir(vendorDir, { recursive: true })
    await copyFile(source, target)
    console.log(`Synced transformers bundle to ${target}`)
  } catch (error) {
    console.warn('Skipping transformers bundle sync:', error?.message || error)
  }
}

await main()

import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const files = ['_redirects']

await mkdir(resolve('dist'), { recursive: true })

for (const file of files) {
  const from = resolve('public', file)
  const to = resolve('dist', file)
  await mkdir(dirname(to), { recursive: true })
  await copyFile(from, to)
}

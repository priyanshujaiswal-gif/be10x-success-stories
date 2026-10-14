import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const publicJson = path.join(ROOT, 'data', 'public-stories.json')
const siteUrl = (process.env.SITE_URL || 'https://success-stories.be10x.com').replace(/\/$/, '')

const stories = JSON.parse(fs.readFileSync(publicJson, 'utf-8'))
const published = stories.filter((s) => s.publicationStatus === 'published')

const urls = [
  { loc: `${siteUrl}/`, priority: '1.0' },
  ...published.map((s) => ({
    loc: `${siteUrl}/success-stories/${s.slug}`,
    priority: s.featured ? '0.9' : '0.7',
  })),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url><loc>${u.loc}</loc><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>
`

fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), xml)
console.log(`Wrote sitemap with ${urls.length} URLs`)

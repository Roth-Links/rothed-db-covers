// _worker.js — Cloudflare Workers + Static Assets entry point
//
// Menggantikan functions/games/[slug].js (Pages Functions) karena struktur
// "Workers with Static Assets" cuma baca SATU custom worker di root, bukan
// folder functions/. File ini menangani:
//
//   1. /games/<apapun>[.html]  → render halaman game dari database.json
//      (logic & algoritma slug PERSIS sama dengan [slug].js lama)
//   2. Semua request lain      → diteruskan ke env.ASSETS.fetch() (static
//      file di dist/: index.html, database.json, sw.js, dst — otomatis)
//
// PENTING: gameSlug() di bawah HARUS identik dengan game_slug() di build.py
// (dipakai buat sitemap.xml & feed.xml). Kalau salah satu diubah, edit juga
// yang satunya — kalau tidak, link dari sitemap/RSS bakal nyasar ke 404.

const COVERS_BASE_URL = 'https://cdn.jsdelivr.net/gh/Roth-Links/rothed-db-covers@main/';
const SITE_URL = 'https://rothed-db.com';
const SITE_NAME = 'RothedDB';

function gameSlug(name, platform) {
  let txt = `${name}-${platform}`.toLowerCase().trim();
  txt = txt.replace(/[^a-z0-9 -]/g, '');
  txt = txt.replace(/ +/g, '-');
  txt = txt.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return txt || 'game';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Sama seperti renderDesc() di template.html: pecah "A. B. C" jadi bullet.
function descBullets(text) {
  if (!text) return [];
  return text.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
}

function resolveCover(cover) {
  if (!cover) return null;
  if (cover.startsWith('http://') || cover.startsWith('https://')) return cover;
  return COVERS_BASE_URL + String(cover).replace(/^\/+/, '');
}

function renderPage({ name, platform, game, slug }) {
  const unavailable = !!game.unavailable;
  const desc = game.description || game.note || '';
  const bullets = descBullets(desc);
  const links = game.links || [];
  const cover = resolveCover(game.cover);
  const canonical = `${SITE_URL}/games/${slug}.html`;

  const title = `${name} (${platform}) Save Data Download — ${SITE_NAME}`;
  const metaDesc = (desc
    ? `Download ${name} save data for ${platform}. ${desc}`
    : `Download ${name} save data for ${platform} on ${SITE_NAME}, free game save library.`
  ).slice(0, 160);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${name} — Save Data (${platform})`,
    applicationCategory: 'GameSaveFile',
    operatingSystem: platform,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: canonical,
  };

  const bulletsHtml = bullets.length > 1
    ? `<ul class="desc">${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
    : desc ? `<p class="desc-plain">${esc(desc)}</p>` : '';

  const linksHtml = links.length
    ? `<div class="dl-wrap">${links.map((l) => `
        <a class="dl-btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || 'Download')}</a>
      `).join('')}</div>`
    : `<p class="unavail-note">${unavailable ? (game.note ? esc(game.note) : 'Not available yet — check back later.') : 'No download link available.'}</p>`;

  const coverHtml = cover
    ? `<img class="cover" src="${esc(cover)}" alt="${esc(name)} cover art" loading="eager">`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="website">
${cover ? `<meta property="og:image" content="${esc(cover)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
  :root{--bg:#0a0f1e;--gold:#f7c948;--text:#e8ecf4;--muted:#8a93a8;--card:#131a2e}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif;line-height:1.6}
  .wrap{max-width:720px;margin:0 auto;padding:32px 20px 64px}
  .back{color:var(--muted);text-decoration:none;font-size:14px}
  .back:hover{color:var(--gold)}
  .cover{width:100%;max-width:320px;border-radius:12px;display:block;margin:20px 0}
  h1{font-family:Outfit,sans-serif;font-size:28px;margin:12px 0 4px}
  .platform{display:inline-block;background:var(--card);color:var(--gold);font-size:12px;
    font-weight:700;padding:4px 10px;border-radius:6px;letter-spacing:.03em}
  .desc,.desc-plain{color:var(--text);font-size:15px}
  .desc{padding-left:20px}
  .desc li{margin:6px 0}
  .dl-wrap{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
  .dl-btn{background:var(--gold);color:#0a0f1e;font-weight:700;text-decoration:none;
    padding:10px 18px;border-radius:8px;font-size:14px}
  .unavail-note{color:var(--muted);font-style:italic}
  footer{margin-top:40px;font-size:13px;color:var(--muted)}
  footer a{color:var(--gold)}
</style>
</head>
<body>
<div class="wrap">
  <a class="back" href="${SITE_URL}/">&larr; Back to full library</a>
  ${coverHtml}
  <span class="platform">${esc(platform)}</span>
  <h1>${esc(name)}</h1>
  ${bulletsHtml}
  ${linksHtml}
  <footer>Part of <a href="${SITE_URL}/">${SITE_NAME}</a> — free game save data library.</footer>
</div>
</body>
</html>`;
}

async function handleGamePage(request, env, rawSlug) {
  // database.json sudah ada sebagai static asset (di-generate build.py) —
  // ambil lewat binding ASSETS, bukan lewat network fetch.
  const dbUrl = new URL('/database.json', request.url);
  const dbRes = await env.ASSETS.fetch(new Request(dbUrl));
  if (!dbRes.ok) {
    return new Response('Database unavailable', { status: 500 });
  }
  const gameData = await dbRes.json(); // { platform: [ {name, links|unavailable, ...} ] }

  for (const platform of Object.keys(gameData)) {
    for (const game of gameData[platform]) {
      if (gameSlug(game.name, platform) === rawSlug) {
        const html = renderPage({ name: game.name, platform, game, slug: rawSlug });
        return new Response(html, {
          headers: {
            'content-type': 'text/html; charset=UTF-8',
            'cache-control': 'public, max-age=3600',
          },
        });
      }
    }
  }

  // Nggak ketemu → fallback ke 404.html yang sudah di-generate build.py
  const notFoundUrl = new URL('/404.html', request.url);
  const notFoundRes = await env.ASSETS.fetch(new Request(notFoundUrl));
  return new Response(await notFoundRes.text(), {
    status: 404,
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Hanya GET/HEAD yang kita tangani khusus; selain itu langsung ke asset.
    if (request.method === 'GET' && url.pathname.startsWith('/games/')) {
      const rawSlug = url.pathname.slice('/games/'.length).replace(/\.html$/i, '');
      // '/games/' kosong (tanpa slug) → biarkan ASSETS yang urus (404 statis dll)
      if (rawSlug) {
        return handleGamePage(request, env, rawSlug);
      }
    }

    // Semua request lain (index.html, database.json, sw.js, css, js, dst)
    // → serve langsung dari static assets, persis seperti sebelumnya.
    return env.ASSETS.fetch(request);
  },
};

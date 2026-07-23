const CLIENT_ID     = '1p5gv4b03z9sexov8qr4xui1ah4pvg';
const CLIENT_SECRET = '3eekgxogdmq8yaym154jzvfrgo206f';

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

// Cloudflare Pages Functions format — this file at /functions/api/igdb.js
// automatically becomes routable at /api/igdb (no extra config needed).
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const search = url.searchParams.get('search');
  if (!search) {
    return new Response('Missing search param', { status: 400 });
  }
  try {
    const token = await getToken();
    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${token}`, 'Content-Type': 'text/plain' },
      body: `search "${search}"; fields name,cover.image_id,first_release_date,genres.name,summary,involved_companies.developer,involved_companies.company.name; limit 30;`
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

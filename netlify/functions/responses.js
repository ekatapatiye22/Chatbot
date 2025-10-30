// Netlify Function - note: streaming may be buffered depending on platform
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing OPENAI_API_KEY' }) };
  }
  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: event.body
    });
    const headers = Object.fromEntries(upstream.headers.entries());
    const body = await upstream.text();
    return { statusCode: upstream.status, headers, body };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Proxy error' }) };
  }
}



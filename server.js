require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const cors = require('cors');
const { marked } = require('marked');

const app = express();
app.use(cors());
app.use(express.static('.'));               // serve all static files

const PORT = process.env.PORT || 3000;

// ---------- Tumblr OAuth ----------
const oauth = OAuth({
  consumer: {
    key: process.env.TUMBLR_CONSUMER_KEY,
    secret: process.env.TUMBLR_CONSUMER_SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

const token = {
  key: process.env.TUMBLR_OAUTH_TOKEN,
  secret: process.env.TUMBLR_OAUTH_TOKEN_SECRET
};

async function tumblrGet(url) {
  const request = { url, method: 'GET' };
  const headers = oauth.toHeader(oauth.authorize(request, token));
  const res = await fetch(url, { headers });
  return res.json();
}

// ---------- Routes ----------
app.get('/blog/:blog/posts', async (req, res) => {
  const { blog } = req.params;
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const data = await tumblrGet(
      `https://api.tumblr.com/v2/blog/${blog}/posts?offset=${offset}&limit=${limit}`
    );
    const raw = data.response?.posts || [];
    const posts = raw.map(p => ({
      id: p.id,
      title: p.title || p.slug,
      summary: marked.parse(p.summary || ''),
      body: marked.parse(p.body || ''),
      timestamp: p.timestamp,
      url: p.post_url,
      tags: p.tags || []
    }));
    res.json({ posts });
  } catch (e) {
    console.error(e);
    res.status(500).json({ posts: [] });
  }
});

app.get('/tag/:tag', async (req, res) => {
  const { tag } = req.params;
  try {
    const data = await tumblrGet(`https://api.tumblr.com/v2/tagged?tag=${tag}`);
    res.json({ posts: data.response || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ posts: [] });
  }
});

// fallback – serve index.html for any unknown route
app.get('*', (req, res) => res.sendFile(__dirname + '/index.html'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

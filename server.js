require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');

const app = express();
app.use(cors());

// SERVE ALL FILES IN ROOT
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;

// OAuth setup
const oauth = OAuth({
  consumer: {
    key: process.env.TUMBLR_CONSUMER_KEY,
    secret: process.env.TUMBLR_CONSUMER_SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function: (base_string, key) => crypto.createHmac('sha1', key).update(base_string).digest('base64')
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

// API: Get posts
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

// FALLBACK: serve correct file or index.html
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

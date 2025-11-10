// ---------- 1. Load env + deps ----------
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const { marked } = require('marked');   // <-- Markdown → HTML
const cors = require('cors');

const app = express();
app.use(cors());                         // simple CORS for all origins
app.use(express.static('.'));            // serve index.html, style.css, etc.

// ---------- 2. Config ----------
const API_KEY = process.env.TUMBLR_API_KEY;
if (!API_KEY) {
  console.error('ERROR: TUMBLR_API_KEY missing in .env');
  process.exit(1);
}

const BLOGS = [
  "2face2","appreciation6","aztepayatl","anna-lisachristiane",
  "alexmucciblog","baddiesdaily","beautifulwomen8910","curvesheaven",
  "demirose-model-blog","elifmusa","goslowhand","lacikaysomersfanclub",
  "marynabokova","valerie-cossett"
];

// ---------- 3. Helper: fetch with error handling ----------
async function safeFetch(url) {
  try {
    const r = await fetch(url);
    return await r.json();
  } catch (e) {
    console.error('Fetch error:', e.message);
    return { response: { posts: [] } };
  }
}

// ---------- 4. Routes ----------
app.get('/blogs/all/posts', async (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit  = parseInt(req.query.limit)  || 20;

  const results = await Promise.all(
    BLOGS.map(async b => {
      const data = await safeFetch(
        `https://api.tumblr.com/v2/blog/${b}.tumblr.com/posts?api_key=${API_KEY}&limit=20&filter=raw`
      );
      return (data.response?.posts || [])
        .map(p => ({ ...p, blog_name: b, post_url: p.post_url }));
    })
  );

  const posts = results
    .flat()
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(offset, offset + limit);

  // OPTIONAL: render Markdown fields for the client
  const enriched = posts.map(p => ({
    ...p,
    summary_html: p.summary ? marked.parse(p.summary) : '',
    body_html:    p.body    ? marked.parse(p.body)    : ''
  }));

  res.json({ posts: enriched });
});

app.get('/blog/:blog/posts', async (req, res) => {
  const { blog } = req.params;
  const offset = parseInt(req.query.offset) || 0;
  const limit  = parseInt(req.query.limit)  || 20;

  const data = await safeFetch(
    `https://api.tumblr.com/v2/blog/${blog}.tumblr.com/posts?api_key=${API_KEY}&limit=${limit}&offset=${offset}&filter=raw`
  );

  const enriched = (data.response?.posts || [])
    .map(p => ({
      ...p,
      blog_name: blog,
      summary_html: p.summary ? marked.parse(p.summary) : '',
      body_html:    p.body    ? marked.parse(p.body)    : ''
    }));

  res.json({ posts: enriched });
});

app.get('/tag/:tag', async (req, res) => {
  const { tag } = req.params;
  const data = await safeFetch(
    `https://api.tumblr.com/v2/tagged?tag=${encodeURIComponent(tag)}&api_key=${API_KEY}&limit=20`
  );
  res.json({ posts: data.response || [] });
});

// ---------- 5. Start server ----------
const PORT = process.env.PORT || 3000;   // Render injects its own port

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Visit → https://YOUR-SERVICE.onrender.com`);
});

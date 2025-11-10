require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;

const API_KEY = process.env.TUMBLR_API_KEY;
if (!API_KEY) {
  console.error("ERROR: TUMBLR_API_KEY missing in .env");
  process.exit(1);
}

const BLOGS = ["2face2","appreciation6","aztepayatl","anna-lisachristiane","alexmucciblog","baddiesdaily","beautifulwomen8910","curvesheaven","demirose-model-blog","elifmusa","goslowhand","lacikaysomersfanclub","marynabokova","valerie-cossett"];

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});
app.use(express.static('.'));

app.get('/blogs/all/posts', async (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 20;
  const results = await Promise.all(BLOGS.map(async b => {
    try {
      const r = await fetch(`https://api.tumblr.com/v2/blog/${b}.tumblr.com/posts?api_key=${API_KEY}&limit=20&filter=raw`);
      const d = await r.json();
      return (d.response?.posts || []).map(p => ({ ...p, post_url: p.post_url })).map(p => ({...p, blog_name: b}));
    } catch { return []; }
  }));
  const posts = results.flat().sort((a,b) => (b.timestamp||0)-(a.timestamp||0)).slice(offset, offset+limit);
  res.json({ posts });
});

app.get('/blog/:blog/posts', async (req, res) => {
  const { blog } = req.params;
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 20;
  const r = await fetch(`https://api.tumblr.com/v2/blog/${blog}.tumblr.com/posts?api_key=${API_KEY}&limit=${limit}&offset=${offset}&filter=raw`);
  const d = await r.json();
  res.json({ posts: (d.response?.posts || []).map(p => ({...p, blog_name: blog})) });
});

app.get('/tag/:tag', async (req, res) => {
  const { tag } = req.params;
  const r = await fetch(`https://api.tumblr.com/v2/tagged?tag=${encodeURIComponent(tag)}&api_key=${API_KEY}&limit=20`);
  const d = await r.json();
  res.json({ posts: d.response || [] });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`http://localhost:${PORT}/blogs/all/posts`);
});

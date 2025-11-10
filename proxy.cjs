require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// === SERVE index.html ON / ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// === SERVE JS/CSS ===
app.use('/js', express.static('js'));
app.use('/css', express.static('css'));

const API_KEY = process.env.TUMBLR_API_KEY;
const OAUTH_TOKEN = process.env.TUMBLR_OAUTH_TOKEN;

if (!API_KEY || !OAUTH_TOKEN) {
  console.error("MISSING .env! Add TUMBLR_API_KEY and TUMBLR_OAUTH_TOKEN");
  process.exit(1);
}

// === DASHBOARD ===
app.get('/dashboard', async (req, res) => {
  const { offset = 0 } = req.query;
  try {
    const url = `https://api.tumblr.com/v2/user/dashboard?api_key=${API_KEY}&access_token=${OAUTH_TOKEN}&limit=20&offset=${offset}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({ posts: data.response.posts || [] });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// === TAG ALL ===
app.get('/tag/all', async (req, res) => {
  const { offset = 0 } = req.query;
  try {
    const url = `https://api.tumblr.com/v2/tagged?tag=all&api_key=${API_KEY}&limit=20&offset=${offset}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({ posts: data.response || [] });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// === TAG SEARCH ===
app.get('/tag/:tag', async (req, res) => {
  const { tag } = req.params;
  const { offset = 0 } = req.query;
  try {
    const url = `https://api.tumblr.com/v2/tagged?tag=${tag}&api_key=${API_KEY}&limit=20&offset=${offset}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({ posts: data.response || [] });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// === BLOG POSTS ===
app.get('/blog/:blog/posts', async (req, res) => {
  const { blog } = req.params;
  const { offset = 0 } = req.query;
  try {
    const url = `https://api.tumblr.com/v2/blog/${blog}.tumblr.com/posts?api_key=${API_KEY}&limit=20&offset=${offset}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({ posts: data.response.posts || [] });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.listen(3000, () => {
  console.log('PHAZR LIVE ON http://localhost:3000');
});

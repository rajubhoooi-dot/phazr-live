const PROXY = 'http://localhost:3000';
let offset = 0;
const limit = 10;
let loading = false;
let hasMore = true;
let allPosts = [];
let isSearching = false;

const feed = document.getElementById('feed');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const search = document.getElementById('search');

// Infinite scroll
new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && hasMore && !loading && !isSearching) {
    loadPosts();
  }
}, { threshold: 1.0, rootMargin: '100px' }).observe(document.getElementById('sentinel'));

async function loadPosts() {
  if (loading || !hasMore || isSearching) return;
  loading = true;
  loadingEl.style.display = 'block';

  try {
    const res = await fetch(`${PROXY}/dashboard?limit=${limit}&offset=${offset}&npf=true`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const posts = data.response?.posts || [];

    if (posts.length === 0) {
      hasMore = false;
      loadingEl.textContent = "No more posts.";
      return;
    }

    allPosts = allPosts.concat(posts);
    render(posts);
    offset += posts.length;

  } catch (err) {
    console.error(err);
    errorEl.textContent = err.name === 'TypeError'
      ? "Proxy not running! Run: node proxy.js"
      : "Check .env keys or internet.";
    errorEl.style.display = 'block';
  } finally {
    loading = false;
    loadingEl.style.display = 'none';
  }
}

function render(posts) {
  const frag = document.createDocumentFragment();
  posts.forEach(p => {
    const img = getImage(p);
    if (!img) return;

    const post = document.createElement('article');
    post.className = 'post';

    post.innerHTML = `
      <img src="${img}" loading="lazy" />
      <div class="post-actions">
        <i class="far fa-heart"></i>
      </div>
    `;

    const heart = post.querySelector('.fa-heart');
    heart.onclick = e => {
      e.target.classList.toggle('fas');
      e.target.classList.toggle('far');
      e.target.classList.toggle('liked');
    };

    frag.appendChild(post);
  });
  feed.appendChild(frag);
}

function getImage(p) {
  // NPF content
  if (Array.isArray(p.content)) {
    for (const b of p.content) {
      if (b.type === 'image' && b.media?.[0]?.url) return b.media[0].url;
    }
  }
  // Legacy photo
  if (p.type === 'photo' && p.photos?.[0]?.original_size?.url) {
    return p.photos[0].original_size.url;
  }
  // Video thumbnail
  if (p.type === 'video' && p.thumbnail_url) return p.thumbnail_url;
  // Trail (reblogs)
  if (Array.isArray(p.trail)) {
    for (const t of p.trail) {
      if (t.content) {
        for (const b of t.content) {
          if (b.type === 'image' && b.media?.[0]?.url) return b.media[0].url;
        }
      }
    }
  }
  return null;
}

fetch('/dashboard?limit=20')
  .then(r => r.json())
  .then(data => {
    const posts = data.posts;
    if (posts.length === 0) {
      document.getElementById('posts').innerHTML = '<p>Log in to Tumblr to see your dashboard.</p>';
      return;
    }

    const container = document.getElementById('posts');
    container.innerHTML = posts.map(p => `
      <div class="post">
        <small>From: <strong>${p.blog_name}</strong></small>
        <h3>${p.title}</h3>
        <div>${p.summary}</div>
        <small><a href="${p.url}" target="_blank">View on Tumblr</a></small>
      </div>
    `).join('');
  });

// Search
search.oninput = () => {
  const term = search.value.trim().toLowerCase();
  isSearching = term.length > 0;

  const filtered = allPosts.filter(p => {
    const blog = (p.blog?.name || '').toLowerCase();
    return blog.includes(term);
  });

  feed.innerHTML = '';
  render(filtered);
};

// Start
loadPosts();

console.log("PHAZR JS LOADED - ALL BLOGS = PHAZR + FIXED CAPTION");

// ==== CONFIG ====
const LIMIT = 20;
const HOME_BLOG = 'dangerous-curves-ahead';
let currentBlog = HOME_BLOG;
let currentTag = '';
let offset = 0;
let isLoading = false;
let hasMore = true;
const loadedIds = new Set();
const CACHE_EXPIRY = 60 * 60 * 1000;
let allPosts = [];

const feedEl = document.getElementById('feed');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
let loaderEl = null;

const POPULAR_BLOGS = [
  "2face2","appreciation6","aztepayatl","anna-lisachristiane","alexmucciblog",
  "baddiesdaily","beautifulwomen8910","curvesheaven","demirose-model-blog",
  "elifmusa","goslowhand","lacikaysomersfanclub","marynabokova","valerie-cossett"
];
const FAVORITE_TAGS = ["love", "art", "fashion", "aesthetic", "cute", "model", "beauty", "monika kinga",
  "natalie amari", "natasha krasavina", "nati marquez", "neesy rizzo", "nicole thorne", "nikita sullivan", "nikki rauner", "nikki sandiego", "nikki waka", "nova quinn",
  "oksana konoalova",
  "paige woolen",
  "pandora kaaki",
  "princess ceddy",
  "samantha buxton",
  "sarai rollins",
  "savanah santos",
  "sephora maria noori",
  "sexy mikayla",
  "skylar mae",
  "skyler lo",
  "solomia maievska",
  "soni maria torres gil",
  "sophie nichols",
  "sophie reade",
  "sophie saint marjan",
  "sydney sweeney",
  "tana rain",
  "tatjana k",
  "taylor chambers",
  "valentina garzon",
  "valerie cossette",
  "vansessy",
  "victoria justice",
  "victoria lane",
  "violet myers",
  "whitney johns",
  "yourtereza"];

// ==== LOAD .ENV ====
let ENV = {};
(async () => {
  try {
    const r = await fetch('/api/env');
    ENV = await r.json();
  } catch {
    try {
      const r = await fetch('.env');
      const t = await r.text();
      t.split('\n').forEach(l => {
        const [k, ...v] = l.split('=');
        if (k) ENV[k.trim()] = v.join('=').trim();
      });
    } catch {}
  }
})();

// ==== CACHING ====
function getCached(k) { const c = localStorage.getItem(k); if (!c) return null; const {d, t} = JSON.parse(c); if (Date.now() - t > CACHE_EXPIRY) { localStorage.removeItem(k); return null; } return d; }
function setCached(k, d) { localStorage.setItem(k, JSON.stringify({d, t: Date.now()})); }

// ==== LOADER ====
function createLoader() { if (loaderEl) return; loaderEl = document.createElement('div'); loaderEl.className = 'loader'; loaderEl.innerHTML = 'Loading more...'; loaderEl.style.cssText = 'text-align:center;padding:20px;color:#d32f2f;font-size:14px;'; feedEl.appendChild(loaderEl); }
function removeLoader() { if (loaderEl && loaderEl.parentNode) { loaderEl.parentNode.removeChild(loaderEl); loaderEl = null; } }

// ==== RESET ====
function resetFeed() { feedEl.innerHTML = ''; offset = 0; hasMore = true; loadedIds.clear(); allPosts = []; removeLoader(); }

// ==== FETCH ALL ====
async function fetchAllBlogs() {
  if (isLoading || !hasMore) return;
  isLoading = true; createLoader();
  const url = `/blogs/all/posts?offset=${offset}&limit=50`;
  let newPosts = getCached(`all_${offset}`);
  if (!newPosts) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const d = await r.json();
      newPosts = (d.posts || []).filter(p => !loadedIds.has(p.id)).map(p => {
        loadedIds.add(p.id);
        let src = p.photos?.[0]?.original_size?.url || '';
        if (!src && p.body) {
          const m = p.body.match(/<img[^>]+src="([^">]+)"/);
          src = m ? m[1] : '';
        }
        return { 
          id: p.id, 
          src, 
          user: 'PHAZR',  // ← ALL BLOGS = PHAZR
          likes: p.note_count || 0, 
          caption: 'READ ROMANTIC STORIES AT BOTTOM [heart] .ENJOY!!'  // ← FIXED CAPTION
        };
      });
      if (newPosts.length) setCached(`all_${offset}`, newPosts);
    } catch (e) { console.error(e); newPosts = []; }
  }
  allPosts = offset === 0 ? newPosts : [...allPosts, ...newPosts];
  offset += newPosts.length;
  hasMore = newPosts.length > 0;
  isLoading = false; removeLoader();
  renderPosts(allPosts);
  if (!hasMore && allPosts.length === 0) showEndMessage();
}

// ==== FETCH BLOG / TAG ====
async function fetchFromBlog(blog) {
  if (isLoading || !hasMore) return;
  isLoading = true; createLoader();
  const url = `/blog/${blog}/posts?offset=${offset}&limit=${LIMIT}`;
  let newPosts = getCached(`blog_${blog}_${offset}`);
  if (!newPosts) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const d = await r.json();
      newPosts = (d.posts || []).filter(p => !loadedIds.has(p.id)).map(p => {
        loadedIds.add(p.id);
        let src = p.photos?.[0]?.original_size?.url || '';
        if (!src && p.body) {
          const m = p.body.match(/<img[^>]+src="([^">]+)"/);
          src = m ? m[1] : '';
        }
        return { 
          id: p.id, 
          src, 
          user: 'PHAZR',  // ← ALL BLOGS = PHAZR
          likes: p.note_count || 0, 
          caption: 'READ ROMANTIC STORIES AT BOTTOM [heart] .ENJOY!!'  // ← FIXED CAPTION
        };
      });
      if (newPosts.length) setCached(`blog_${blog}_${offset}`, newPosts);
    } catch (e) { newPosts = []; }
  }
  allPosts = offset === 0 ? newPosts : [...allPosts, ...newPosts];
  offset += newPosts.length;
  hasMore = newPosts.length > 0;
  isLoading = false; removeLoader();
  renderPosts(allPosts);
  if (!hasMore && allPosts.length === 0) showEndMessage();
}

async function fetchTaggedPosts(tag) {
  if (isLoading || !hasMore) return;
  isLoading = true; createLoader();
  const url = `/tag/${tag}?offset=${offset}&limit=${LIMIT}`;
  let newPosts = getCached(`tag_${tag}_${offset}`);
  if (!newPosts) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const d = await r.json();
      newPosts = (d.posts || []).filter(p => !loadedIds.has(p.id)).map(p => {
        loadedIds.add(p.id);
        let src = p.photos?.[0]?.original_size?.url || '';
        if (!src && p.body) {
          const m = p.body.match(/<img[^>]+src="([^">]+)"/);
          src = m ? m[1] : '';
        }
        return { 
          id: p.id, 
          src, 
          user: 'PHAZR',  // ← ALL BLOGS = PHAZR
          likes: p.note_count || 0, 
          caption: 'READ ROMANTIC STORIES AT BOTTOM [heart] .ENJOY!!'  // ← FIXED CAPTION
        };
      });
      if (newPosts.length) setCached(`tag_${tag}_${offset}`, newPosts);
    } catch (e) { newPosts = []; }
  }
  allPosts = offset === 0 ? newPosts : [...allPosts, ...newPosts];
  offset += newPosts.length;
  hasMore = newPosts.length > 0;
  isLoading = false; removeLoader();
  renderPosts(allPosts);
  if (!hasMore && allPosts.length === 0) showEndMessage();
}

function showEndMessage() {
  if (allPosts.length > 0) return;
  const end = document.createElement('div');
  end.textContent = 'No posts found.';
  end.style.cssText = 'padding:15px;background:#f9f9f9;border-radius:8px;margin:20px 0;text-align:center;color:#666;font-size:14px;';
  feedEl.appendChild(end);
}

// ==== RENDER POSTS (INSTAGRAM STYLE) ====
function renderPosts(posts) {
  if (offset === 0) feedEl.innerHTML = '';

  posts.forEach(p => {
    if (document.querySelector(`[data-id="${p.id}"]`)) return;

    const post = document.createElement('article');
    post.className = 'post';
    post.dataset.id = p.id;

    let imgSrc = p.src || 'https://via.placeholder.com/700?text=No+Image';

    post.innerHTML = `
      <div class="post-header">
        <img src="https://via.placeholder.com/32/333/fff?text=P" alt="PHAZR">
        <strong>PHAZR</strong>
      </div>
      <div class="post-media" style="position:relative;cursor:pointer;">
        <img src="${imgSrc}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/700?text=No+Image'" 
             style="width:100%;height:auto;display:block;">
        <div class="double-tap-heart" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:80px;opacity:0;pointer-events:none;color:white;text-shadow:0 0 10px rgba(0,0,0,0.5);transition:opacity 0.3s;">
          
        </div>
      </div>
      <div class="post-actions" style="padding:8px 12px;display:flex;align-items:center;gap:12px;">
        <button class="ig-like-btn" style="background:none;border:none;cursor:pointer;font-size:24px;">
          <i class="far fa-heart"></i>
        </button>
        <span class="like-count" style="font-weight:600;">${(p.likes || 0).toLocaleString()}</span>
      </div>
      <div class="post-caption" style="padding:0 12px 12px;font-size:14px;">
        <strong>PHAZR</strong> 
        READ ROMANTIC STORIES AT BOTTOM [heart] .ENJOY!!
      </div>
    `;

    // === INSTAGRAM DOUBLE-TAP LIKE ===
    const media = post.querySelector('.post-media');
    const heartIcon = post.querySelector('.ig-like-btn i');
    const floatingHeart = post.querySelector('.double-tap-heart');
    const likeCount = post.querySelector('.like-count');
    let liked = false;
    let timeout;

    const triggerLike = () => {
      if (liked) return;
      liked = true;
      heartIcon.classList.replace('far', 'fas');
      heartIcon.style.color = '#e1306c';
      floatingHeart.style.opacity = '1';
      setTimeout(() => floatingHeart.style.opacity = '0', 800);

      let count = parseInt(likeCount.textContent.replace(/,/g, '')) || 0;
      count++;
      likeCount.textContent = count.toLocaleString();
    };

    media.addEventListener('dblclick', triggerLike);
    media.addEventListener('click', () => clearTimeout(timeout));
    media.addEventListener('click', () => {
      timeout = setTimeout(() => {
        if (!liked) return;
        liked = false;
        heartIcon.classList.replace('fas', 'far');
        heartIcon.style.color = '';
      }, 2000);
    });

    post.querySelector('.ig-like-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      triggerLike();
    });

    feedEl.appendChild(post);
  });
}

// ==== SIDEBAR, SEARCH, MENU, SCROLL (unchanged) ====
(() => {
  const blogLinks = document.getElementById('blogLinks');
  const allLink = document.createElement('a'); allLink.href = '#'; allLink.textContent = 'ALL';
  allLink.onclick = e => { e.preventDefault(); currentBlog = 'all'; currentTag = ''; resetFeed(); fetchAllBlogs(); sidebar.classList.remove('visible'); };
  blogLinks.appendChild(allLink);

  POPULAR_BLOGS.forEach(b => {
    const a = document.createElement('a'); a.href = '#'; a.textContent = b;
    a.onclick = e => { e.preventDefault(); currentBlog = b; currentTag = ''; resetFeed(); fetchFromBlog(b); sidebar.classList.remove('visible'); };
    blogLinks.appendChild(a);
  });

  FAVORITE_TAGS.forEach(t => {
    const a = document.createElement('a'); a.href = '#'; a.textContent = `#${t}`; a.style.color = '#d32f2f';
    a.onclick = e => { e.preventDefault(); currentTag = t; currentBlog = ''; resetFeed(); fetchTaggedPosts(t); sidebar.classList.remove('visible'); };
    blogLinks.appendChild(a);
  });
})();

document.getElementById('searchInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') triggerSearch(e.target.value.trim()); });
document.querySelector('.search-bar .fa-search')?.addEventListener('click', () => triggerSearch(document.getElementById('searchInput').value.trim()));

function triggerSearch(q) {
  if (!q) return;
  const isTag = q.startsWith('#');
  const clean = isTag ? q.slice(1).toLowerCase() : q.toLowerCase();
  if (isTag) { currentTag = clean; currentBlog = ''; resetFeed(); fetchTaggedPosts(clean); }
  else { currentBlog = clean; currentTag = ''; resetFeed(); fetchFromBlog(clean); }
  sidebar.classList.remove('visible');
}

menuBtn.addEventListener('click', e => { e.stopPropagation(); sidebar.classList.toggle('visible'); });
document.getElementById('closeSidebar')?.addEventListener('click', e => { e.stopPropagation(); sidebar.classList.remove('visible'); });
document.addEventListener('click', e => {
  if (sidebar.classList.contains('visible') && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
    sidebar.classList.remove('visible');
  }
});

const sentinel = document.createElement('div'); sentinel.id = 'sentinel'; sentinel.style.height = '20px'; document.body.appendChild(sentinel);
new IntersectionObserver(([e]) => {
  if (e.isIntersecting && !isLoading && hasMore) {
    if (currentTag) fetchTaggedPosts(currentTag);
    else if (currentBlog === 'all') fetchAllBlogs();
    else fetchFromBlog(currentBlog);
  }
}, { threshold: 0.1 }).observe(sentinel);

// ==== START ===
resetFeed();
setTimeout(() => fetchAllBlogs(), 500);

/* ========= tiny helpers ========= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const norm = s => (s || "")
  .toLowerCase()
  .normalize("NFD").replace(/\p{Diacritic}/gu, ""); // TR karakterleri sadeleştir

/* ========= state ========= */
const state = {
  all: [],
  q: "",
  tags: new Set()
};

/* ========= reading time calculation ========= */
// Cache sistemi kaldırıldı - her seferinde yeniden hesaplanacak

async function calculateReadingTime(slug) {
  try {
    // Markdown dosyasını oku
    const response = await fetch(`content/posts/${slug}.md`);
    if (!response.ok) return null;

    const md = await response.text();

    // Markdown işaretlerini temizle (ana sayfadaki gibi)
    const text = md
      .replace(/```[\s\S]*?```/g, " ") // Kod bloklarını kaldır
      .replace(/`[^`]*`/g, " ") // Inline kodları kaldır
      .replace(/!\[[^\]]*]\([^)]+\)/g, " ") // Resim linklerini kaldır
      .replace(/\[[^\]]*]\([^)]+\)/g, " ") // Linkleri kaldır
      .replace(/[\*_>#~\-]/g, " "); // Markdown işaretlerini kaldır

    // Kelime sayısını hesapla
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(words / 300)); // En az 1 dakika

    return readingTime;
  } catch (error) {
    console.error('Okuma süresi hesaplanırken hata:', error);
    return null;
  }
}



/* ========= card template (tam tıklanabilir) ========= */
const fmt = (d) => new Date(d).toLocaleDateString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit" });
const cardHTML = async (p) => {
  // Okuma süresini hesapla
  const readingTime = p.readingMinutes || await calculateReadingTime(p.slug);

  return `
  <article class="card">
    <a class="card-link" href="post.html?slug=${encodeURIComponent(p.slug)}" aria-label="${p.title}">
      ${p.cover ? `<img class="thumb" src="${p.cover}" alt="${p.title}" loading="lazy">` : ""}
      <div class="card-body">
        <h3>${p.title}</h3>
        <div class="meta">
          ${fmt(p.date)}${p.tags && p.tags.length ? ` • ${p.tags.join(", ")}` : ""}
          ${readingTime ? ` • ⌚ ${readingTime} dk` : ""}
        </div>
        <p>${p.excerpt || ""}</p>
      </div>
    </a>
  </article>`;
};

/* ========= filtering ========= */
function matches(post) {
  // Markdown içeriğini temizle (HTML etiketlerini kaldır)
  const cleanContent = (post.content || "")
    .replace(/<[^>]*>/g, '') // HTML etiketlerini kaldır
    .replace(/[#*`]/g, '') // Markdown işaretlerini kaldır
    .replace(/\n+/g, ' ') // Satır sonlarını boşluk yap
    .replace(/\s+/g, ' ') // Fazla boşlukları tek boşluk yap
    .trim();

  // Arama alanlarını genişlet: başlık, özet, etiketler VE içerik
  const searchableText = [
    post.title,
    post.excerpt,
    (post.tags || []).join(" "),
    cleanContent // Temizlenmiş içerik
  ].join(" ");

  const hay = norm(searchableText);
  const qs = norm(state.q).split(/\s+/).filter(Boolean);
  const okQ = qs.every(q => hay.includes(q));

  if (state.tags.size === 0) return okQ;
  const postTags = new Set((post.tags || []).map(t => norm(t)));
  const okT = [...state.tags].every(t => postTags.has(t));
  return okQ && okT;
}

/* ========= render ========= */
async function render() {
  // Önce filtrele, sonra tarihe göre sırala (en yeni önce)
  const posts = state.all
    .filter(matches)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Async olarak kartları oluştur
  const cardPromises = posts.map(cardHTML);
  const cardHTMLs = await Promise.all(cardPromises);

  // Sanitize with DOMPurify to prevent XSS
  const safeHtml = DOMPurify.sanitize(cardHTMLs.join(""));

  $("#blogResults").innerHTML = safeHtml || `
    <p class="muted" style="margin-top:12px">Sonuç bulunamadı.</p>`;
}

/* ========= chips ========= */
function buildChips(allPosts) {
  const tagSet = new Set();
  allPosts.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
  const tags = [...tagSet].sort((a, b) => a.localeCompare(b, 'tr'));

  const wrap = $("#tagChips");

  // Sanitize tags before rendering
  const safeTagsHtml = DOMPurify.sanitize(tags.map(t => `<button class="chip" data-tag="${t}">${t}</button>`).join(""));
  wrap.innerHTML = safeTagsHtml;

  wrap.addEventListener("click", async (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const key = norm(b.dataset.tag);
    if (state.tags.has(key)) { state.tags.delete(key); b.classList.remove("active"); }
    else { state.tags.add(key); b.classList.add("active"); }
    await render();
  });
}

/* ========= Theme manager will be initialized from theme-manager.js module ========= */
let themeManager;

/* ========= boot ========= */
document.addEventListener("DOMContentLoaded", async () => {
  // Load custom theme from server first
  await loadCustomTheme();

  // Initialize theme manager first
  themeManager = new ThemeManager();

  // Yıl güncellemesi
  const yearElement = document.getElementById('year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Loading göstergesi
  $("#blogResults").innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="width: 32px; height: 32px; border: 3px solid var(--line); border-top: 3px solid var(--accent); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
      <p class="muted">Yazılar yükleniyor...</p>
    </div>
  `;

  try {
    const posts = await fetch("content/posts.json").then(r => r.json());

    // Her yazının Markdown içeriğini yükle
    const postsWithContent = await Promise.all(
      posts.map(async (post) => {
        try {
          const response = await fetch(`content/posts/${post.slug}.md`);
          if (response.ok) {
            const content = await response.text();
            return { ...post, content };
          }
        } catch (error) {
          console.warn(`İçerik yüklenemedi: ${post.slug}`, error);
        }
        return post;
      })
    );

    // Sadece yayınlanmış ve silinmemiş yazıları göster
    const publishedPosts = postsWithContent.filter((p) => {
      const status = p.status || 'published'; // Eski yazılar için default published

      // Silinmiş yazıları gösterme
      if (status === 'deleted') {
        return false;
      }

      if (status === 'scheduled') {
        // Zamanlanmış yazılar için publish tarihini kontrol et
        const publishDate = new Date(p.publishDate);
        return publishDate <= new Date();
      }
      return status === 'published';
    });

    // Blog sayfasında tüm yayınlanmış yazılar listelensin (featured dahil)
    state.all = publishedPosts;

    buildChips(state.all);

    const input = $("#blogSearch");
    input.addEventListener("input", async () => { state.q = input.value; await render(); });

    await render();

    // Track page view
    trackPageView('blog');

  } catch (e) {
    console.error("Yazılar yüklenemedi:", e);
    $("#blogResults").innerHTML = `<p class="muted">Yazılar yüklenemedi: ${e.message}</p>`;
  }
});

// ====== Statistics Tracking ======
// ====== Development Mode Configuration ======
// Auto-detect development mode based on current hostname
const DEVELOPMENT_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = window.location.origin;

// ====== Statistics Tracking ======
async function trackPageView(page) {
  // Geliştirme modunda analytics'i atla (scripts.js/post.js ile tutarlı)
  if (DEVELOPMENT_MODE) {
    console.log('📊 Analytics skipped in development mode');
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/api/analytics/track-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page, source: document.referrer })
    });
  } catch (error) {
    console.log('Failed to track page view:', error);
  }
} 
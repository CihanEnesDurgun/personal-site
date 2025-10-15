/* ===== Helpers ===== */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const fmt = (d) =>
    new Date(d).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  const esc = (s = "") =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  
  /* ===== Performance optimizations ===== */
  // Debounce function for scroll events
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Throttle function for scroll events
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }
  
/* ===== Theme manager will be initialized from theme-manager.js module ===== */
  let themeManager;
  
  /* ===== Scroll features ===== */
  function initScroll() {
    const prog = $("#progress"),
      toTop = $("#toTop");
    const onScroll = throttle(() => {
      const sc = scrollY,
        max = document.body.scrollHeight - innerHeight;
      if (prog) prog.style.transform = `scaleX(${max > 0 ? sc / max : 0})`;
      if (toTop) toTop.classList.toggle("show", sc > 400);
    }, 16); // ~60fps
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toTop?.addEventListener("click", () =>
      scrollTo({ top: 0, behavior: "smooth" })
    );
  }
  
  /* ===== Reveal ===== */
  function initReveal() {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        }),
      { threshold: 0.1 }
    );
    $$(".reveal, .card").forEach((el) => io.observe(el));
  }
  
  /* ========= Menü aktiflik takibi ========= */
  function initNavTracking() {
    const navLinks = document.querySelectorAll(".pill-nav a[data-nav]");
    const sections = [...navLinks]
      .map((a) => document.getElementById(a.dataset.nav))
      .filter(Boolean);
  
    const setActive = () => {
      const mid = window.scrollY + window.innerHeight / 2;
      const scrollBottom = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      let current = sections[0]?.id;
      
      // Sayfanın en altına yaklaşıldığında iletişim bölümünü aktif hale getir
      if (scrollBottom >= documentHeight - 100) {
        current = 'contact';
      } else {
        sections.forEach((sec) => {
          const top = sec.offsetTop;
          const bottom = top + sec.offsetHeight;
          if (mid >= top && mid < bottom) current = sec.id;
        });
      }
      
      navLinks.forEach((a) =>
        a.classList.toggle("active", a.dataset.nav === current)
      );
    };
  
    setActive();
    window.addEventListener("scroll", setActive, { passive: true });
    window.addEventListener("resize", setActive);
    window.addEventListener("hashchange", setActive);
    navLinks.forEach((a) =>
      a.addEventListener("click", () => setTimeout(setActive, 200))
    );
  }
  
  /* ====== Kapak çözümleyici (opsiyonel otomatik) ====== */
  async function resolveCover(post) {
    if (post.cover) return post.cover;
    const base = `images/posts/${post.slug}/cover`;
    const candidates = [`${base}.avif`, `${base}.webp`, `${base}.jpg`, `${base}.png`];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) return url;
      } catch (_) {}
    }
    return "";
  }
  
  /* ====== Okuma süresi (cache'li) ====== */
  const RT_CACHE_KEY = "rt_cache_v1";
  // Cache sistemi kaldırıldı - her seferinde yeniden hesaplanacak
  
  async function getReadingTime(slug) {
    try {
      const md = await fetch(`content/posts/${slug}.md`).then((r) =>
        r.ok ? r.text() : ""
      );
      const text = md
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]*`/g, " ")
        .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
        .replace(/\[[^\]]*]\([^)]+\)/g, " ")
        .replace(/[\*_>#~\-]/g, " ");
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const minutes = Math.max(1, Math.ceil(words / 300));
      return minutes;
    } catch {
      return null;
    }
  }
  
  /* ===== Hero/CTA ===== */
  function renderHero(site) {
    const h = site.hero || {};
    $("#home").innerHTML = `
      <img class="avatar reveal" src="${h.avatar || "images/avatar.jpg"}" alt="Portre Fotoğraf" onerror="this.style.visibility='hidden'">
      <div class="reveal">
        <div class="kicker">Merhaba, ben <strong>${esc(h.name || "")}</strong></div>
        <h1>${esc(h.headline || "")}</h1>
        <p class="lead">${esc(h.bio || "")}</p>
        <div class="actions">
          <a class="btn btn-primary" href="#blog">Blog'a göz at</a>
          ${site.social?.email ? `<a class="btn" href="mailto:${site.social.email}">E‑posta</a>` : ""}
          ${site.social?.linkedin ? `<a class="btn" target="_blank" href="${site.social.linkedin}">LinkedIn</a>` : ""}
          ${site.social?.github ? `<a class="btn" target="_blank" href="${site.social.github}">GitHub</a>` : ""}
        </div>
      </div>`;
  }
  function renderCTA(site) {
    $("#cta").innerHTML = `
      <h2>Birlikte üretelim?</h2>
      <p class="muted">Fikir, proje ya da iş birliği için bir mesaj uzağındayım.</p>
      <div class="actions" style="justify-content:center;margin-top:14px">
        ${site.social?.email ? `<a class="btn btn-primary" href="mailto:${site.social.email}">E‑posta</a>` : ""}
        ${site.social?.linkedin ? `<a class="btn" target="_blank" href="${site.social.linkedin}">LinkedIn</a>` : ""}
        ${site.social?.github ? `<a class="btn" target="_blank" href="${site.social.github}">GitHub</a>` : ""}
      </div>`;
  }
  
  /* ===== Card template (okuma süresi dahil) ===== */
  function cardHTML(p, { coverUrl, readingMins, isFeatured = false }) {
    const tags = p.tags ? ` • ${p.tags.join(", ")}` : "";
    const rt = readingMins ? ` • ⌚ ${readingMins} dk` : "";
    const featuredBadge = isFeatured ? `<div class="featured-badge">Öne Çıkan</div>` : "";
    
    return `
    <article class="card reveal" ${isFeatured ? 'data-featured="true"' : ''}>
      ${featuredBadge}
      <a class="card-link" href="post.html?slug=${encodeURIComponent(p.slug)}" aria-label="${esc(p.title)}">
        ${coverUrl ? `<img class="thumb" src="${coverUrl}" alt="${esc(p.title)}" loading="lazy">` : ""}
        <div class="card-body">
          <h3>${esc(p.title)}</h3>
          <div class="meta">${fmt(p.date)}${tags}${rt}</div>
          <p>${esc(p.excerpt)}</p>
        </div>
      </a>
    </article>`;
  }
  
  
  
  /* ===== Boot ===== */
  document.addEventListener("DOMContentLoaded", async () => {
    // Load custom theme from server first
    await loadCustomTheme();
    
    // Initialize theme manager first
    themeManager = new ThemeManager();
    
    initScroll();
    $("#year").textContent = new Date().getFullYear();
  
    const site = await fetch("content/site.json").then((r) => r.json()).catch(() => ({}));
    if (site.owner) $("#owner").textContent = site.owner;
    renderHero(site);
    renderCTA(site);
  
    const posts = await fetch("content/posts.json").then((r) => r.json()).catch(() => []);
  
    // Sadece yayınlanmış ve silinmemiş yazıları göster
    const publishedPosts = posts.filter((p) => {
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
    
    // Yazıları sırala: önce öne çıkanlar (tarihe göre), sonra diğerleri (tarihe göre)
    const featured = publishedPosts.filter((p) => p.featured).sort((a, b) => new Date(b.date) - new Date(a.date));
    const others = publishedPosts.filter((p) => !p.featured).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Öne çıkanları + diğerlerini birleştir (max 6 yazı)
    const allPosts = [...featured, ...others].slice(0, 6);
    
    const blogHTML = await Promise.all(
      allPosts.map(async (p) => {
        const [coverUrl, readingMins] = await Promise.all([
          resolveCover(p),
          getReadingTime(p.slug),
        ]);
        return cardHTML(p, { coverUrl, readingMins, isFeatured: p.featured });
      })
    );
    $("#blog-grid").innerHTML = blogHTML.join("");
  
    initReveal();
    initNavTracking();
    
    // Track page view
    trackPageView('home');
  });
  
  // ====== Statistics Tracking ======
  async function trackPageView(page) {
    try {
              // PRODUCTION MODE
          await fetch('https://cihanenesdurgun.com/api/stats/pageview', {
          // DEVELOPMENT MODE
          // await fetch('http://localhost:3000/api/stats/pageview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page })
      });
    } catch (error) {
      console.log('Failed to track page view:', error);
    }
  }
  
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

/* ========= güvenli hex kontrolü ========= */
const safeHex = (c) => (typeof c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(c)) ? c : "#A67B5B";

/* ========= dil çubuğu (GitHub linguist tarzı) ========= */
function langBarHTML(languages) {
  if (!Array.isArray(languages) || languages.length === 0) return "";

  const segs = languages.map(l =>
    `<span class="lang-seg" data-percent="${Number(l.percent) || 0}" data-color="${safeHex(l.color)}"></span>`
  ).join("");

  const legend = languages.map(l =>
    `<span class="lang-item"><span class="lang-dot" data-color="${safeHex(l.color)}"></span>${l.name} <span class="lang-pct">%${Number(l.percent) || 0}</span></span>`
  ).join("");

  return `
    <div class="lang-wrap">
      <div class="lang-bar" role="img" aria-label="Kullanılan teknolojiler">${segs}</div>
      <div class="lang-legend">${legend}</div>
    </div>`;
}

/* render sonrası dil segmentlerinin genişlik/renklerini uygula (DOMPurify style-strip bypass) */
function applyLangBars(root = document) {
  $$(".lang-seg", root).forEach(seg => {
    const pct = Math.max(0, Math.min(100, Number(seg.dataset.percent) || 0));
    seg.style.width = pct + "%";
    seg.style.background = safeHex(seg.dataset.color);
  });
  $$(".lang-dot", root).forEach(dot => {
    dot.style.background = safeHex(dot.dataset.color);
  });
}

/* ========= card template (tam tıklanabilir) ========= */
const fmt = (d) => new Date(d).toLocaleDateString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit" });
const cardHTML = (p) => {
  return `
  <article class="card">
    <a class="card-link" href="project.html?slug=${encodeURIComponent(p.slug)}" aria-label="${p.title}">
      ${p.cover ? `<img class="thumb" src="${p.cover}" alt="${p.title}" loading="lazy">` : ""}
      <div class="card-body">
        <h3>${p.title}</h3>
        <div class="meta">
          ${fmt(p.date)}${p.tags && p.tags.length ? ` • ${p.tags.join(", ")}` : ""}
        </div>
        <p>${p.excerpt || ""}</p>
        ${langBarHTML(p.languages)}
      </div>
    </a>
  </article>`;
};

/* ========= filtering ========= */
function matches(project) {
  const cleanContent = (project.content || "")
    .replace(/<[^>]*>/g, '')
    .replace(/[#*`]/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Dil adlarını da aranabilir yap
  const langNames = (project.languages || []).map(l => l.name).join(" ");

  const searchableText = [
    project.title,
    project.excerpt,
    (project.tags || []).join(" "),
    langNames,
    cleanContent
  ].join(" ");

  const hay = norm(searchableText);
  const qs = norm(state.q).split(/\s+/).filter(Boolean);
  const okQ = qs.every(q => hay.includes(q));

  if (state.tags.size === 0) return okQ;
  const projectTags = new Set((project.tags || []).map(t => norm(t)));
  const okT = [...state.tags].every(t => projectTags.has(t));
  return okQ && okT;
}

/* ========= render ========= */
function render() {
  const projects = state.all
    .filter(matches)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const html = projects.map(cardHTML).join("");
  const safeHtml = DOMPurify.sanitize(html);

  $("#projectResults").innerHTML = safeHtml || `
    <p class="muted" style="margin-top:12px">Sonuç bulunamadı.</p>`;

  applyLangBars($("#projectResults"));
}

/* ========= chips ========= */
function buildChips(allProjects) {
  const tagSet = new Set();
  allProjects.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
  const tags = [...tagSet].sort((a, b) => a.localeCompare(b, 'tr'));

  const wrap = $("#projectTagChips");
  const safeTagsHtml = DOMPurify.sanitize(tags.map(t => `<button class="chip" data-tag="${t}">${t}</button>`).join(""));
  wrap.innerHTML = safeTagsHtml;

  wrap.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const key = norm(b.dataset.tag);
    if (state.tags.has(key)) { state.tags.delete(key); b.classList.remove("active"); }
    else { state.tags.add(key); b.classList.add("active"); }
    render();
  });
}

/* ========= Theme manager ========= */
let themeManager;

/* ========= boot ========= */
document.addEventListener("DOMContentLoaded", async () => {
  await loadCustomTheme();
  themeManager = new ThemeManager();

  const yearElement = document.getElementById('year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  $("#projectResults").innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="width: 32px; height: 32px; border: 3px solid var(--line); border-top: 3px solid var(--accent); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
      <p class="muted">Projeler yükleniyor...</p>
    </div>
  `;

  try {
    const projects = await fetch("content/projects.json").then(r => r.json());

    // Her projenin Markdown içeriğini yükle (arama için)
    const projectsWithContent = await Promise.all(
      projects.map(async (project) => {
        try {
          const response = await fetch(`content/projects/${project.slug}.md`);
          if (response.ok) {
            const content = await response.text();
            return { ...project, content };
          }
        } catch (error) {
          console.warn(`İçerik yüklenemedi: ${project.slug}`, error);
        }
        return project;
      })
    );

    // Sadece yayınlanmış ve silinmemiş projeleri göster
    const publishedProjects = projectsWithContent.filter((p) => {
      const status = p.status || 'published';
      if (status === 'deleted') return false;
      if (status === 'scheduled') {
        return new Date(p.publishDate) <= new Date();
      }
      return status === 'published';
    });

    state.all = publishedProjects;
    buildChips(state.all);

    const input = $("#projectSearch");
    input.addEventListener("input", () => { state.q = input.value; render(); });

    render();
    trackPageView('projects');

  } catch (e) {
    console.error("Projeler yüklenemedi:", e);
    $("#projectResults").innerHTML = `<p class="muted">Projeler yüklenemedi: ${e.message}</p>`;
  }
});

// ====== Development Mode Configuration ======
const DEVELOPMENT_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = window.location.origin;

// ====== Statistics Tracking ======
async function trackPageView(page) {
  // Geliştirme modunda analytics'i atla
  if (DEVELOPMENT_MODE) {
    console.log('📊 Analytics skipped in development mode');
    return;
  }
  try {
    await fetch(`${API_BASE_URL}/api/analytics/track-page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, source: document.referrer })
    });
  } catch (error) {
    console.log('Failed to track page view:', error);
  }
}

// project.js — Proje detay sayfası

function q(s, r = document) { return r.querySelector(s); }
function qa(s, r = document) { return [...r.querySelectorAll(s)]; }

function formatTR(d) {
  try { return new Date(d).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return d || ''; }
}

function escapeHtml(text) {
  // Öznitelik içinde de güvenli olması için tırnaklar dahil tüm özel karakterler kaçırılır
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const safeHex = (c) => (typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c)) ? c : '#A67B5B';

let themeManager;

// --- Okuma İlerleme Çubuğu ---
function initProgressBar() {
  const progressBar = document.getElementById('progressBar');
  if (!progressBar) return;
  window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = scrollPercent + '%';
  });
}

// Marked yüklenene kadar bekle
function waitForMarked() {
  return new Promise((resolve) => {
    if (typeof marked !== 'undefined') return resolve();
    const iv = setInterval(() => {
      if (typeof marked !== 'undefined') { clearInterval(iv); resolve(); }
    }, 100);
    setTimeout(() => { clearInterval(iv); resolve(); }, 5000);
  });
}

// ====== Kayar Galeri ======
function initGallery(images) {
  const section = q('#galerySection');
  const track = q('#galleryTrack');
  const dotsWrap = q('#galleryDots');
  if (!section || !track || !Array.isArray(images) || images.length === 0) return;

  section.style.display = '';

  // Slide'ları oluştur
  track.innerHTML = images.map(src =>
    `<div class="gallery-slide"><img src="${escapeHtml(src)}" alt="Proje fotoğrafı" loading="lazy"></div>`
  ).join('');

  // Noktaları oluştur
  dotsWrap.innerHTML = images.map((_, i) =>
    `<button class="gallery-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Fotoğraf ${i + 1}"></button>`
  ).join('');

  const slides = qa('.gallery-slide', track);
  const dots = qa('.gallery-dot', dotsWrap);
  let current = 0;
  let autoTimer = null;
  const total = slides.length;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }
  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    if (total <= 1) return;
    stopAuto();
    autoTimer = setInterval(next, 2500);
  }
  function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

  q('#galleryNext').addEventListener('click', () => { next(); startAuto(); });
  q('#galleryPrev').addEventListener('click', () => { prev(); startAuto(); });
  dots.forEach(d => d.addEventListener('click', () => { goTo(Number(d.dataset.index)); startAuto(); }));

  // Hover'da durdur
  section.addEventListener('mouseenter', stopAuto);
  section.addEventListener('mouseleave', startAuto);

  // Tek görsel varsa kontrolleri gizle
  if (total <= 1) {
    q('#galleryPrev').style.display = 'none';
    q('#galleryNext').style.display = 'none';
    dotsWrap.style.display = 'none';
  }

  goTo(0);
  startAuto();
}

// ====== Dil / Teknoloji Çubuğu ======
function renderLanguages(languages) {
  const section = q('#langSection');
  const bar = q('#projectLangBar');
  const legend = q('#projectLangLegend');
  if (!section || !Array.isArray(languages) || languages.length === 0) return;

  section.style.display = '';
  bar.innerHTML = '';
  legend.innerHTML = '';

  languages.forEach(l => {
    const pct = Math.max(0, Math.min(100, Number(l.percent) || 0));
    const color = safeHex(l.color);

    const seg = document.createElement('span');
    seg.className = 'lang-seg';
    seg.style.width = pct + '%';
    seg.style.background = color;
    bar.appendChild(seg);

    const item = document.createElement('span');
    item.className = 'lang-item';
    const dot = document.createElement('span');
    dot.className = 'lang-dot';
    dot.style.background = color;
    item.appendChild(dot);
    item.appendChild(document.createTextNode(` ${l.name} `));
    const pctEl = document.createElement('span');
    pctEl.className = 'lang-pct';
    pctEl.textContent = `%${pct}`;
    item.appendChild(pctEl);
    legend.appendChild(item);
  });
}

// ====== Kod Örneği ======
function renderCodeSample(codeSample) {
  const section = q('#codeSection');
  if (!section || !codeSample || !codeSample.code) return;

  section.style.display = '';
  const lang = codeSample.language || 'code';

  q('#codeSampleLang').textContent = lang;
  q('#codeSampleCode').textContent = codeSample.code;
  q('#codeModalLang').textContent = lang;
  q('#codeModalCode').textContent = codeSample.code;

  const modal = q('#codeModal');
  const openModal = () => { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; };
  const closeModal = () => { modal.style.display = 'none'; document.body.style.overflow = ''; };

  q('#codeExpandBtn').addEventListener('click', openModal);
  q('#codeModalClose').addEventListener('click', closeModal);
  q('#codeModalBackdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });
}

// ====== GitHub Önizleme Kartı ======
async function renderGithubCard(githubUrl) {
  const section = q('#githubSection');
  const card = q('#githubCard');
  if (!section || !githubUrl) return;

  section.style.display = '';

  try {
    const resp = await fetch(`${window.location.origin}/api/github/repo-preview?url=${encodeURIComponent(githubUrl)}`);
    if (!resp.ok) throw new Error('GitHub verisi alınamadı');
    const data = await resp.json();

    // Dil çubuğu (GitHub API byte sayılarını yüzdeye çevir)
    const langEntries = Object.entries(data.languages || {});
    const totalBytes = langEntries.reduce((s, [, v]) => s + v, 0);
    const ghColors = { JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', 'C++': '#f34b7d', C: '#555555', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', Dart: '#00B4AB' };
    let ghLangBar = '';
    let ghLangLegend = '';
    if (totalBytes > 0) {
      langEntries.sort((a, b) => b[1] - a[1]);
      ghLangBar = langEntries.map(([name, bytes]) => {
        const pct = ((bytes / totalBytes) * 100).toFixed(1);
        const color = ghColors[name] || '#A67B5B';
        return `<span class="lang-seg" style="width:${pct}%;background:${color}"></span>`;
      }).join('');
      ghLangLegend = langEntries.slice(0, 6).map(([name, bytes]) => {
        const pct = ((bytes / totalBytes) * 100).toFixed(1);
        const color = ghColors[name] || '#A67B5B';
        return `<span class="lang-item"><span class="lang-dot" style="background:${color}"></span>${escapeHtml(name)} <span class="lang-pct">%${pct}</span></span>`;
      }).join('');
    }

    // README (markdown → HTML, sanitize)
    let readmeHtml = '';
    if (data.readme && typeof marked !== 'undefined') {
      try {
        readmeHtml = DOMPurify.sanitize(marked.parse(data.readme, { gfm: true, breaks: true }));
      } catch (e) { readmeHtml = ''; }
    }

    card.innerHTML = `
      <div class="github-browser">
        <div class="github-browser-bar">
          <span class="gh-dot gh-red"></span>
          <span class="gh-dot gh-yellow"></span>
          <span class="gh-dot gh-green"></span>
          <span class="github-address">github.com/${escapeHtml(data.fullName || '')}</span>
        </div>
        <div class="github-browser-body">
          <div class="github-repo-head">
            <svg viewBox="0 0 16 16" width="20" height="20" class="gh-icon"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            <div>
              <a href="${escapeHtml(data.htmlUrl)}" target="_blank" rel="noopener" class="github-repo-name">${escapeHtml(data.fullName || '')}</a>
              ${data.description ? `<p class="github-repo-desc">${escapeHtml(data.description)}</p>` : ''}
            </div>
          </div>
          <div class="github-stats">
            <span class="gh-stat" title="Yıldız">⭐ ${data.stars}</span>
            <span class="gh-stat" title="Fork">🍴 ${data.forks}</span>
            <span class="gh-stat" title="Açık konu">⊙ ${data.openIssues}</span>
            ${data.license ? `<span class="gh-stat" title="Lisans">⚖ ${escapeHtml(data.license)}</span>` : ''}
          </div>
          ${ghLangBar ? `<div class="lang-wrap"><div class="lang-bar">${ghLangBar}</div><div class="lang-legend">${ghLangLegend}</div></div>` : ''}
          ${readmeHtml ? `<div class="github-readme blog-content"><h4 class="github-readme-title">README</h4>${readmeHtml}</div>` : ''}
          <a href="${escapeHtml(data.htmlUrl)}" target="_blank" rel="noopener" class="btn btn-primary github-open-btn">GitHub'da Aç</a>
        </div>
      </div>`;
  } catch (error) {
    console.error('GitHub kartı hatası:', error);
    // Fallback: sadece link kartı
    card.innerHTML = `
      <div class="github-fallback">
        <p class="muted">GitHub önizlemesi yüklenemedi (depo özel olabilir veya erişim limiti).</p>
        <a href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener" class="btn btn-primary">GitHub'da Aç</a>
      </div>`;
  }
}

// ====== Ana Yükleme ======
async function boot() {
  await waitForMarked();

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  const isPreview = urlParams.get('preview') === 'true';

  // Taslak onizleme sunucuda kimlik dogrulamasi ister (bkz. post.js'teki ayni desen).
  const previewHeaders = () => {
    const token = isPreview && localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  if (!slug) {
    q('#projectContent').innerHTML = '<p class="muted">Proje bulunamadı.</p>';
    return;
  }

  try {
    const projects = await fetch('content/projects.json', { headers: previewHeaders() }).then(r => r.json());
    const project = projects.find(p => p.slug === slug);

    if (!project) {
      q('#projectContent').innerHTML = '<p class="muted">Proje bulunamadı.</p>';
      return;
    }

    // Güvenlik: taslak/silinmiş projeler sadece admin önizlemesiyle görünür
    const isPublic = project.status === 'published' ||
      (project.status === 'scheduled' && project.publishDate && new Date(project.publishDate) <= new Date());
    if (!isPublic && !isPreview) {
      q('#projectContent').innerHTML = '<p class="muted">Proje bulunamadı.</p>';
      return;
    }

    // Başlık ve tarih
    q('#projectTitle').textContent = project.title || '';
    // Sekme basligi + paylasim meta etiketleri (bkz. src/js/meta-tags.js)
    applyPageMeta(project, 'article');
    if (project.date) q('#projectDate').textContent = formatTR(project.date);

    // Hero görsel
    const heroImg = q('#heroImg');
    const heroCap = q('#heroCaption');
    if (project.cover) { heroImg.src = project.cover; heroImg.alt = project.title; }
    if (project.coverCaption) heroCap.textContent = project.coverCaption;

    // Kayar galeri (hero'nun hemen altı)
    initGallery(project.gallery);

    // Dil çubuğu
    renderLanguages(project.languages);

    // Markdown içerik
    const mdResponse = await fetch(`content/projects/${project.slug}.md`, { headers: previewHeaders() });
    const md = mdResponse.ok ? await mdResponse.text() : '';
    const rawHtml = marked.parse(md, { gfm: true, breaks: true });
    let html = DOMPurify.sanitize(rawHtml);

    // Görselleri figure ile sarmala (post.js ile aynı davranış)
    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('img').forEach(img => {
      if (img.closest('figure')) return;
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      const figure = document.createElement('figure');
      figure.style.textAlign = 'center';
      figure.style.margin = '2em 0';
      const newImg = document.createElement('img');
      newImg.src = src; newImg.alt = alt;
      newImg.style.maxWidth = '100%';
      newImg.style.height = 'auto';
      newImg.style.borderRadius = '6px';
      newImg.style.display = 'block';
      newImg.style.margin = '0 auto';
      figure.appendChild(newImg);
      if (alt && alt.trim()) {
        const cap = document.createElement('figcaption');
        cap.style.fontSize = '14px';
        cap.style.color = 'var(--muted)';
        cap.style.fontStyle = 'italic';
        cap.style.textAlign = 'center';
        cap.style.marginTop = '8px';
        cap.textContent = alt;
        figure.appendChild(cap);
      }
      img.parentNode.replaceChild(figure, img);
    });
    q('#projectContent').innerHTML = temp.innerHTML;

    // Kod örneği
    renderCodeSample(project.codeSample);

    // GitHub kartı (async, en sonda)
    if (project.githubUrl) renderGithubCard(project.githubUrl);

    // Görüntüleme takibi (preview değilse)
    if (!isPreview) trackProjectView(slug);

  } catch (error) {
    console.error('Proje yüklenirken hata:', error);
    q('#projectContent').innerHTML = '<p class="muted">Proje yüklenirken bir hata oluştu.</p>';
  }
}

// ====== Development Mode ======
const DEVELOPMENT_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = window.location.origin;

async function trackProjectView(slug) {
  if (DEVELOPMENT_MODE) { console.log('📊 Analytics skipped in development mode'); return; }
  try {
    await fetch(`${API_BASE_URL}/api/analytics/track-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, source: document.referrer })
    });
  } catch (error) {
    console.log('Failed to track project view:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadCustomTheme();
  themeManager = new ThemeManager();
  initProgressBar();
  const yearElement = document.getElementById('year');
  if (yearElement) yearElement.textContent = new Date().getFullYear();
  boot();
});

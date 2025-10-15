// post.js

function q(s, r=document){ return r.querySelector(s); }
function param(n){ return new URL(location.href).searchParams.get(n); }
async function getJSON(url){ try{ const r=await fetch(url); return r.ok? r.json():null; }catch(e){ console.error(e); return null; } }
async function getText(url){ try{ const r=await fetch(url); return r.ok? r.text():null; }catch(e){ console.error(e); return null; } }

function formatTR(d){
  try{ return new Date(d).toLocaleDateString('tr-TR',{year:'numeric',month:'2-digit',day:'2-digit'}); }
  catch{ return d||''; }
}

function calculateReadingTime(content) {
  // Markdown işaretlerini temizle (ana sayfadaki gibi)
  const text = content
    .replace(/```[\s\S]*?```/g, " ") // Kod bloklarını kaldır
    .replace(/`[^`]*`/g, " ") // Inline kodları kaldır
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ") // Resim linklerini kaldır
    .replace(/\[[^\]]*]\([^)]+\)/g, " ") // Linkleri kaldır
    .replace(/[\*_>#~\-]/g, " "); // Markdown işaretlerini kaldır
  
  // Kelime sayısını hesapla
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(words / 300)); // En az 1 dakika
  
  return readingTime;
}

function renderError(msg){
  q('#postContent').innerHTML = `<p class="muted">${msg}</p>`;
}

// --- Theme manager will be initialized from theme-manager.js module ---
let themeManager;

// --- Okuma İlerleme Çubuğu Fonksiyonu ---
function initProgressBar() {
  const progressBar = document.getElementById('progressBar');
  if (!progressBar) return;
  
  window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = (scrollTop / scrollHeight) * 100;
    progressBar.style.width = scrollPercent + '%';
  });
}

function initShareButtons(post) {
  const shareButtons = document.querySelectorAll('.share-btn');
  
  shareButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const url = window.location.href;
      const title = post.title;
      const text = post.excerpt || '';
      
      if (btn.classList.contains('facebook')) {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
      } else if (btn.classList.contains('twitter')) {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank');
      } else if (btn.classList.contains('linkedin')) {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        window.open(linkedinUrl, '_blank');
      } else if (btn.classList.contains('whatsapp')) {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`;
        window.open(whatsappUrl, '_blank');
      } else if (btn.classList.contains('telegram')) {
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        window.open(telegramUrl, '_blank');
      } else if (btn.classList.contains('reddit')) {
        const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
        window.open(redditUrl, '_blank');
      } else if (btn.classList.contains('email')) {
        const emailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Bu yazıyı okumak istiyorum: ' + url)}`;
        window.open(emailUrl);
      } else if (btn.classList.contains('copy-link')) {
        navigator.clipboard.writeText(url).then(() => {
          const originalText = btn.innerHTML;
          btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
          setTimeout(() => {
            btn.innerHTML = originalText;
          }, 2000);
        }).catch(err => {
          console.error('Link kopyalanamadı:', err);
          // Fallback: prompt ile göster
          prompt('Linki kopyalamak için aşağıdaki metni seçin:', url);
        });
      }
    });
  });
}

async function boot(){
  const q = (s) => document.querySelector(s);
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  const isPreview = urlParams.get('preview') === 'true';
  
  if (!slug) {
    q('#postContent').innerHTML = '<p class="muted">Yazı bulunamadı.</p>';
    return;
  }

  // Preview modu için banner ve filigran ekle
  if (isPreview) {
    document.body.classList.add('preview-mode');
    
    // Preview banner
    const previewBanner = document.createElement('div');
    previewBanner.className = 'preview-banner';
    previewBanner.innerHTML = `
      <div class="preview-banner-content">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
        <span>📝 Önizleme</span>
        <button onclick="window.close()" class="preview-close">✕</button>
      </div>
    `;
    document.body.insertBefore(previewBanner, document.body.firstChild);
    
    // Draft watermark
    const draftWatermark = document.createElement('div');
    draftWatermark.className = 'draft-watermark';
    document.body.appendChild(draftWatermark);
  }

  try {
    const [postsResponse, siteResponse] = await Promise.all([
      fetch('content/posts.json'),
      fetch('content/site.json')
    ]);
    
    const posts = await postsResponse.json();
    const site = await siteResponse.json();
    
    const post = posts.find(p => p.slug === slug);
    
    if (!post) {
      q('#postContent').innerHTML = '<p class="muted">Yazı bulunamamadı.</p>';
      return;
    }

    // Markdown dosyasını yükle
    const mdResponse = await fetch(`content/posts/${post.slug}.md`);
    const md = await mdResponse.text();
    
    // Markdown'ı HTML'e çevir (önce normal, sonra özel image işleme)
    let html = marked.parse(md, {
      sanitize: false,
      gfm: true,
      breaks: true
    });
    
    // Sonradan image'ları özel şekilde işle
    html = html.replace(/<img src="([^"]*)" alt="([^"]*)"[^>]*>/g, function(match, src, alt) {
      const filename = src.split('/').pop().split('.')[0];
      
      // Her zaman figure yapısı kullan, alt'ta açıklama varsa göster
      if (alt && alt.trim() && alt !== filename) {
        // Açıklamalı görsel - figure yapısı
        return `<figure style="text-align: center; margin: 2em 0;">
          <img src="${src}" alt="" style="max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 0 auto;">
          <figcaption style="font-size: 14px; color: var(--muted); font-style: italic; text-align: center; margin-top: 8px;">${alt}</figcaption>
        </figure>`;
      } else {
        // Açıklamasız görsel - figure yapısı ama figcaption yok
        return `<figure style="text-align: center; margin: 2em 0;">
          <img src="${src}" alt="" style="max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 0 auto;">
        </figure>`;
      }
    });
    
    // İçeriği güncelle
    q('#postContent').innerHTML = html;
    
    // Markdown render sonrası stil düzeltmeleri
    applyMarkdownStyles();
    
    // HERO
    const heroImg = q('#heroImg');
    const heroCap = q('#heroCaption');
    
    if (post.cover) {
      heroImg.src = post.cover;
      heroImg.alt = post.title;
    }
    
    if (post.coverCaption) {
      heroCap.textContent = post.coverCaption;
    } else if (post.caption) {
      heroCap.textContent = post.caption;
    }
    
    // Post Header
    q('#postTitle').textContent = post.title || '';
    
    // Tarih
    if (post.date) {
      q('#postDate').textContent = formatTR(post.date);
    }
    
    // Etiketler
    const tagsContainer = q('#postTags');
    if (post.tags && post.tags.length > 0) {
      tagsContainer.innerHTML = post.tags.map(tag =>
        `<a href="blog.html" class="tag">${tag}</a>`
      ).join('');
    }
    
    // Okuma süresini hesapla
    const readingTime = calculateReadingTime(md);
    q('#readingTime').textContent = `${readingTime} dakika`;
    
    // Paylaşım butonlarını başlat
    initShareButtons(post);
    
    // Blog butonunu aktif yap
    const blogLink = q('a[href="blog.html"]');
    if (blogLink) {
      blogLink.classList.add('active');
    }
    
    // Track post view (preview modunda değil)
    if (!isPreview) {
      trackPostView(slug);
      // Load comments (preview modunda değil)
      loadComments(slug);
    }
    
  } catch (error) {
    console.error('Yazı yüklenirken hata:', error);
    q('#postContent').innerHTML = '<p class="muted">Yazı yüklenirken bir hata oluştu.</p>';
  }
}

// ====== Configuration Loader ======
let API_BASE_URL = 'http://localhost:3000'; // Default fallback

// Load configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      API_BASE_URL = config.domain;
      console.log(`🔧 Post page loaded in ${config.mode} mode`);
      console.log(`🌐 API URL: ${API_BASE_URL}`);
    } else {
      console.warn('⚠️ Failed to load config, using fallback URL');
    }
  } catch (error) {
    console.warn('⚠️ Config loading failed, using fallback URL:', error);
  }
}

// Initialize config on page load
loadConfig();

// ====== Statistics Tracking ======
async function trackPostView(slug) {
  try {
    await fetch(`${API_BASE_URL}/api/stats/postview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slug })
    });
  } catch (error) {
    console.log('Failed to track post view:', error);
  }
}

// ====== Comments System ======
async function loadComments(slug) {
  const commentsList = q('#commentsList');
  const commentsLoading = q('#commentsLoading');
  const commentCount = q('#commentCount');
  
  if (!commentsList || !commentsLoading || !commentCount) return;
  
  try {
    // Show loading
    commentsLoading.style.display = 'flex';
    commentsList.innerHTML = '';
    
    // Fetch comments
    const response = await fetch(`${API_BASE_URL}/api/comments/${slug}`);
    const data = await response.json();
    
    if (data.success) {
      const comments = data.comments;
      
      // Update comment count
      commentCount.textContent = `${comments.length} yorum`;
      
      // Render comments
      if (comments.length === 0) {
        commentsList.innerHTML = `
          <div class="comments-empty">
            <svg viewBox="0 0 24 24">
              <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
            <p>Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
          </div>
        `;
      } else {
        commentsList.innerHTML = comments.map(comment => `
          <div class="comment-item ${comment.approved === false ? 'comment-pending' : ''}">
            <div class="comment-header">
              <div class="comment-author">
                <div class="comment-name">${escapeHtml(comment.name)}</div>
                <div class="comment-date">${formatCommentDate(comment.date)}</div>
              </div>
              ${comment.approved === false ? '<div class="comment-status pending">Onay Bekliyor</div>' : ''}
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
          </div>
        `).join('');
      }
    } else {
      commentsList.innerHTML = '<p class="muted">Yorumlar yüklenirken bir hata oluştu.</p>';
    }
  } catch (error) {
    console.error('Error loading comments:', error);
    commentsList.innerHTML = '<p class="muted">Yorumlar yüklenirken bir hata oluştu.</p>';
  } finally {
    // Hide loading
    commentsLoading.style.display = 'none';
  }
}

function initCommentForm(slug) {
  const commentForm = q('#commentForm');
  if (!commentForm) return;
  
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(commentForm);
    const name = formData.get('name').trim();
    const email = formData.get('email').trim();
    const content = formData.get('content').trim();
    
    // Basic validation
    if (!name || !email || !content) {
      showCommentMessage('Lütfen tüm alanları doldurun.', 'error');
      return;
    }
    
    if (content.length < 3) {
      showCommentMessage('Yorum en az 3 karakter olmalıdır.', 'error');
      return;
    }
    
    try {
      // Disable form
      const submitBtn = commentForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" style="animation: spin 1s linear infinite;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Gönderiliyor...
      `;
      
      // Submit comment
      const response = await fetch(`${API_BASE_URL}/api/comments/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, content })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showCommentMessage('Yorumunuz başarıyla gönderildi! Yorumunuz hemen görünecek ve onaylandıktan sonra "Onay Bekliyor" etiketi kalkacak.', 'success');
        commentForm.reset();
        
        // Reload comments to show the new comment immediately
        loadComments(slug);
      } else {
        showCommentMessage(data.error || 'Yorum gönderilirken bir hata oluştu.', 'error');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      showCommentMessage('Yorum gönderilirken bir hata oluştu.', 'error');
    } finally {
      // Re-enable form
      const submitBtn = commentForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
        Yorumu Gönder
      `;
    }
  });
}

function showCommentMessage(message, type) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.comment-success, .comment-error');
  existingMessages.forEach(msg => msg.remove());
  
  // Create new message
  const messageDiv = document.createElement('div');
  messageDiv.className = `comment-${type}`;
  messageDiv.textContent = message;
  
  // Insert before form
  const commentFormContainer = q('.comment-form-container');
  if (commentFormContainer) {
    commentFormContainer.parentNode.insertBefore(messageDiv, commentFormContainer);
  }
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 5000);
}

function formatCommentDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Az önce';
  } else if (diffInHours < 24) {
    return `${diffInHours} saat önce`;
  } else if (diffInHours < 48) {
    return 'Dün';
  } else {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Markdown render sonrası stil düzeltmeleri
function applyMarkdownStyles() {
  const postContent = q('#postContent');
  if (!postContent) return;
  
  // Başlıklara blog-content sınıfı ekle
  const headings = postContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    heading.classList.add('blog-content');
  });
  
  // Paragraflara blog-content sınıfı ekle
  const paragraphs = postContent.querySelectorAll('p');
  paragraphs.forEach(p => {
    p.classList.add('blog-content');
  });
  
  // Listelere blog-content sınıfı ekle
  const lists = postContent.querySelectorAll('ul, ol');
  lists.forEach(list => {
    list.classList.add('blog-content');
  });
  
  // List item'lara blog-content sınıfı ekle
  const listItems = postContent.querySelectorAll('li');
  listItems.forEach(li => {
    li.classList.add('blog-content');
  });
  
  // Blockquote'lara blog-content sınıfı ekle
  const blockquotes = postContent.querySelectorAll('blockquote');
  blockquotes.forEach(blockquote => {
    blockquote.classList.add('blog-content');
  });
  
  // Code bloklarına blog-content sınıfı ekle
  const codeBlocks = postContent.querySelectorAll('pre');
  codeBlocks.forEach(pre => {
    pre.classList.add('blog-content');
  });
  
  // Inline code'lara blog-content sınıfı ekle
  const inlineCodes = postContent.querySelectorAll('code');
  inlineCodes.forEach(code => {
    code.classList.add('blog-content');
  });
  
  // Linklere blog-content sınıfı ekle
  const links = postContent.querySelectorAll('a');
  links.forEach(link => {
    link.classList.add('blog-content');
  });
  
  // Resimlere blog-content sınıfı ekle
  const images = postContent.querySelectorAll('img');
  images.forEach(img => {
    img.classList.add('blog-content');
  });
  
  // Tablolara blog-content sınıfı ekle
  const tables = postContent.querySelectorAll('table');
  tables.forEach(table => {
    table.classList.add('blog-content');
  });
  
  // Tablo hücrelerine blog-content sınıfı ekle
  const tableCells = postContent.querySelectorAll('th, td');
  tableCells.forEach(cell => {
    cell.classList.add('blog-content');
  });
  
  // HR'lara blog-content sınıfı ekle
  const hrElements = postContent.querySelectorAll('hr');
  hrElements.forEach(hr => {
    hr.classList.add('blog-content');
  });
  
  // Tüm içeriği blog-content container'ına sar
  if (!postContent.classList.contains('blog-content')) {
    postContent.classList.add('blog-content');
  }
}

// Yardımcı fonksiyonlar
function formatTR(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Sayfa yüklendiğinde çalıştır
document.addEventListener('DOMContentLoaded', async () => {
  // Load custom theme from server first (from theme-manager.js module)
  await loadCustomTheme();
  
  // Initialize theme manager (from theme-manager.js module)
  themeManager = new ThemeManager();
  
  // Okuma ilerleme çubuğu başlat
  initProgressBar();
  
  // Yıl güncellemesi
  const yearElement = document.getElementById('year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
  
  // Ana fonksiyonu çalıştır
  boot();
  
  // Yorum formunu başlat
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  if (slug) {
    initCommentForm(slug);
  }
});

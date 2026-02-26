// post.js

function q(s, r = document) { return r.querySelector(s); }
function param(n) { return new URL(location.href).searchParams.get(n); }
async function getJSON(url) { try { const r = await fetch(url); return r.ok ? r.json() : null; } catch (e) { console.error(e); return null; } }
async function getText(url) { try { const r = await fetch(url); return r.ok ? r.text() : null; } catch (e) { console.error(e); return null; } }

function formatTR(d) {
  try { return new Date(d).toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { return d || ''; }
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

function renderError(msg) {
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

// Wait for marked.js to load
function waitForMarked() {
  return new Promise((resolve) => {
    if (typeof marked !== 'undefined') {
      resolve();
      return;
    }

    // Check every 100ms if marked is loaded
    const checkInterval = setInterval(() => {
      if (typeof marked !== 'undefined') {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (typeof marked === 'undefined') {
        console.error('marked.js failed to load after 5 seconds');
        renderError('Markdown kütüphanesi yüklenemedi. Sayfayı yenileyin.');
      }
      resolve();
    }, 5000);
  });
}

async function boot() {
  // Wait for marked.js to be loaded
  await waitForMarked();

  if (typeof marked === 'undefined') {
    renderError('Markdown kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.');
    return;
  }
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
    // Pre-process: encode spaces and special chars in image URLs
    const sanitizedMd = md.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (match, alt, src) => {
      if (/[^a-zA-Z0-9\/._\-:]/.test(src)) {
        const encodedSrc = encodeURI(decodeURI(src));
        return `![${alt}](${encodedSrc})`;
      }
      return match;
    });
    let rawHtml = marked.parse(sanitizedMd, {
      sanitize: false,
      gfm: true,
      breaks: true
    });

    // Güvenlik: XSS koruması için DOMPurify ile temizle
    let html = DOMPurify.sanitize(rawHtml);

    // Sonradan image'ları özel şekilde işle — DOM tabanlı
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;

    const images = tempContainer.querySelectorAll('img');
    images.forEach(img => {
      // Skip if already inside a figure
      if (img.closest('figure')) return;

      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      const filename = src.split('/').pop().split('.')[0];

      // Create figure wrapper
      const figure = document.createElement('figure');
      figure.style.textAlign = 'center';
      figure.style.margin = '2em 0';

      // Create new img with proper styling
      const newImg = document.createElement('img');
      newImg.src = src;
      newImg.alt = '';
      newImg.style.maxWidth = '100%';
      newImg.style.height = 'auto';
      newImg.style.borderRadius = '6px';
      newImg.style.display = 'block';
      newImg.style.margin = '0 auto';
      figure.appendChild(newImg);

      // Add caption if alt text is meaningful (not just the filename)
      if (alt && alt.trim() && alt !== filename && alt !== filename + '.' + src.split('.').pop()) {
        const figcaption = document.createElement('figcaption');
        figcaption.style.fontSize = '14px';
        figcaption.style.color = 'var(--muted)';
        figcaption.style.fontStyle = 'italic';
        figcaption.style.textAlign = 'center';
        figcaption.style.marginTop = '8px';
        figcaption.textContent = alt;
        figure.appendChild(figcaption);
      }

      // Replace original img with figure
      img.parentNode.replaceChild(figure, img);
    });

    html = tempContainer.innerHTML;

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

// ====== Development Mode Configuration ======
// Auto-detect development mode based on current hostname
const DEVELOPMENT_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = window.location.origin;

// ====== Statistics Tracking ======
async function trackPostView(slug) {
  try {
    await fetch(`${API_BASE_URL}/api/analytics/track-post`, {
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

      // Update comment count (count all comments including replies and sub-replies)
      const totalComments = comments.reduce((total, comment) => {
        let count = 1; // Main comment
        if (comment.replies) {
          count += comment.replies.reduce((replyTotal, reply) => {
            let replyCount = 1; // Direct reply
            if (reply.replies) {
              replyCount += reply.replies.length; // Sub-replies
            }
            return replyTotal + replyCount;
          }, 0);
        }
        return total + count;
      }, 0);
      commentCount.textContent = `${totalComments} yorum`;

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
        commentsList.innerHTML = comments.map(comment => renderCommentWithReplies(comment, slug)).join('');
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

// Render comment with replies
function renderCommentWithReplies(comment, slug) {
  const repliesHtml = comment.replies ? comment.replies.map(reply => renderReply(reply, slug)).join('') : '';

  return `
    <div class="comment-item ${comment.approved === false ? 'comment-pending' : ''}" data-comment-id="${comment.id}">
      <div class="comment-header">
        <div class="comment-author">
          <div class="comment-name">${escapeHtml(comment.name)}</div>
          <div class="comment-date">${formatCommentDate(comment.date)}</div>
        </div>
        ${comment.approved === false ? '<div class="comment-status pending">Onay Bekliyor</div>' : ''}
      </div>
      <div class="comment-content">${escapeHtml(comment.content)}</div>
      <div class="comment-actions">
        <button class="reply-btn" onclick="showReplyForm('${comment.id}', '${escapeHtml(comment.name)}', '${slug}')">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
          </svg>
          Yanıtla
        </button>
      </div>
      ${repliesHtml}
    </div>
  `;
}

// Render reply
function renderReply(reply, slug) {
  const subRepliesHtml = reply.replies ? reply.replies.map(subReply => renderReply(subReply, slug)).join('') : '';

  return `
    <div class="comment-reply ${reply.approved === false ? 'comment-pending' : ''}" data-comment-id="${reply.id}">
      <div class="comment-header">
        <div class="comment-author">
          <div class="comment-name">${escapeHtml(reply.name)}</div>
          <div class="comment-date">${formatCommentDate(reply.date)}</div>
        </div>
        ${reply.approved === false ? '<div class="comment-status pending">Onay Bekliyor</div>' : ''}
      </div>
      <div class="comment-content">
        <span class="reply-to-user">@${escapeHtml(reply.reply_to_name)}</span> ${escapeHtml(reply.content)}
      </div>
      <div class="comment-actions">
        <button class="reply-btn" onclick="showReplyForm('${reply.id}', '${escapeHtml(reply.name)}', '${slug}')">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
          </svg>
          Yanıtla
        </button>
      </div>
      ${subRepliesHtml}
    </div>
  `;
}

// Show reply form
function showReplyForm(parentId, parentName, slug) {
  // Remove any existing reply forms
  const existingForms = document.querySelectorAll('.reply-form');
  existingForms.forEach(form => form.remove());

  // Find the comment element
  const commentElement = document.querySelector(`[data-comment-id="${parentId}"]`);
  if (!commentElement) return;

  // Create reply form
  const replyForm = document.createElement('div');
  replyForm.className = 'reply-form';
  replyForm.innerHTML = `
    <div class="reply-form-content">
      <h5>${parentName} kullanıcısına yanıt ver</h5>
      <form class="comment-form reply-comment-form">
        <div class="form-row">
          <div class="form-group">
            <label for="replyName">İsim *</label>
            <input type="text" id="replyName" name="name" required>
          </div>
          <div class="form-group">
            <label for="replyEmail">E-posta *</label>
            <input type="email" id="replyEmail" name="email" required>
          </div>
        </div>
        <div class="form-group">
          <label for="replyContent">Yanıtınız *</label>
          <textarea id="replyContent" name="content" rows="3" required 
                    placeholder="${parentName} kullanıcısına yanıt verin..."></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
            Yanıtı Gönder
          </button>
          <button type="button" class="btn btn-secondary" onclick="this.closest('.reply-form').remove()">
            İptal
          </button>
        </div>
      </form>
    </div>
  `;

  // Insert after the comment actions
  const commentActions = commentElement.querySelector('.comment-actions');
  commentActions.parentNode.insertBefore(replyForm, commentActions.nextSibling);

  // Initialize reply form
  initReplyForm(parentId, slug);
}

// Initialize reply form
function initReplyForm(parentId, slug) {
  const replyForm = document.querySelector('.reply-comment-form');
  if (!replyForm) return;

  replyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(replyForm);
    const name = formData.get('name').trim();
    const email = formData.get('email').trim();
    const content = formData.get('content').trim();

    // Basic validation
    if (!name || !email || !content) {
      showCommentMessage('Lütfen tüm alanları doldurun.', 'error');
      return;
    }

    if (content.length < 3) {
      showCommentMessage('Yanıt en az 3 karakter olmalıdır.', 'error');
      return;
    }

    try {
      // Disable form
      const submitBtn = replyForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" style="animation: spin 1s linear infinite;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Gönderiliyor...
      `;

      // Submit reply
      const response = await fetch(`${API_BASE_URL}/api/comments/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          content,
          parent_id: parentId
        })
      });

      const data = await response.json();

      if (data.success) {
        showCommentMessage('Yanıtınız başarıyla gönderildi! Yanıtınız onaylandıktan sonra görünecek.', 'success');
        replyForm.reset();

        // Remove reply form
        replyForm.closest('.reply-form').remove();

        // Reload comments to show the new reply
        loadComments(slug);
      } else {
        showCommentMessage(data.error || 'Yanıt gönderilirken bir hata oluştu.', 'error');
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      showCommentMessage('Yanıt gönderilirken bir hata oluştu.', 'error');
    } finally {
      // Re-enable form
      const submitBtn = replyForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
        Yanıtı Gönder
      `;
    }
  });
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

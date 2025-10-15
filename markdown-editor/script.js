// Global variables
let currentViewMode = 'edit';

// Initialize editor
document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== MARKDOWN EDITOR INITIALIZATION ===');
    
    // Initialize theme manager
    themeManager = new ThemeManager();
    
    // Check if we're in edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const editSlug = urlParams.get('edit');
    
    if (editSlug) {
        // Load existing post for editing
        await loadPostForEdit(editSlug);
    } else {
        // Load welcome content for new post
        loadWelcomeContent();
    }
    
    // Setup event listeners (theme manager hariç)
    setupEventListeners();
    
    // Update current date
    updateCurrentDate();
    
    // Update all stats
    updateAllStats();
    
    
    console.log('=== INITIALIZATION COMPLETE ===');
});

// Load welcome content
async function loadWelcomeContent() {
    try {
        console.log('Loading welcome content from file...');
        const response = await fetch('./welcome-content.md');
        const markdownText = await response.text();
        
        if (markdownText) {
            console.log('Welcome content loaded, length:', markdownText.length);
            
            // Convert markdown to HTML
            const htmlContent = marked.parse(markdownText);
            
            const editorContent = document.getElementById('editorContent');
            if (editorContent) {
                editorContent.innerHTML = htmlContent;
                console.log('Welcome content set to editor');
                
                // Update stats after loading content
                setTimeout(updateAllStats, 100);
            }
        }
    } catch (error) {
        console.error('Error loading welcome content:', error);
        // Fallback content
        const editorContent = document.getElementById('editorContent');
        if (editorContent) {
            editorContent.innerHTML = '<p>Buraya yazmaya başlayın...</p>';
        }
    }
}

// Load existing post for editing
async function loadPostForEdit(slug) {
    try {
        console.log('Loading post for edit:', slug);
        
        // Fetch post data (includes markdown content)
        const response = await fetch(`../api/posts/${slug}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Post not found');
            } else if (response.status === 401 || response.status === 403) {
                throw new Error('Authentication required');
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        }
        
        const post = await response.json();
        console.log('Post loaded:', post);
        
        // Set editor content from API response (which includes markdown content)
        const editorContent = document.getElementById('editorContent');
        if (editorContent && post.content) {
            const htmlContent = marked.parse(post.content);
            editorContent.innerHTML = htmlContent;
            console.log('Editor content set from API response');
        } else if (editorContent) {
            // If no content, set empty content
            editorContent.innerHTML = '<p>İçerik bulunamadı. Buraya yazmaya başlayın...</p>';
            console.log('No content found, set empty content');
        }
        
        // Set post title
        const postTitle = document.getElementById('postTitle');
        if (postTitle && post.title) {
            postTitle.textContent = post.title;
        }
        
        // Set cover image
        const heroImg = document.getElementById('heroImg');
        const heroCaption = document.getElementById('heroCaption');
        const container = document.getElementById('coverPhotoContainer');
        
        if (post.cover && heroImg) {
            heroImg.src = post.cover;
            heroImg.alt = post.title;
            
            if (container) {
                container.classList.add('has-image');
            }
        }
        
        // Set cover caption
        if (post.coverCaption && heroCaption) {
            heroCaption.textContent = post.coverCaption;
        }
        
        // Set document title
        document.title = `Düzenle: ${post.title}`;
        
        // Update stats
        setTimeout(updateAllStats, 100);
        
        console.log('Post loaded successfully for editing');
        
    } catch (error) {
        console.error('Error loading post for edit:', error);
        
        // Show user-friendly error message
        const editorContent = document.getElementById('editorContent');
        if (editorContent) {
            if (error.message === 'Authentication required') {
                editorContent.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 2rem;">🔒 Oturum süreniz dolmuş. Lütfen admin paneline giriş yapın.</p>';
            } else if (error.message === 'Post not found') {
                editorContent.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 2rem;">❌ Yazı bulunamadı. Lütfen admin panelinden tekrar deneyin.</p>';
            } else {
                editorContent.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 2rem;">⚠️ Yazı yüklenirken hata oluştu. Lütfen sayfayı yenileyin.</p>';
            }
        }
        
        // Don't fallback to welcome content for edit mode
        console.log('Edit mode - not loading welcome content');
    }
}


// Update character counters for form fields
function updateCharacterCounters() {
    const modalPostTitle = document.getElementById('modalPostTitle');
    const postExcerpt = document.getElementById('postExcerpt');
    const titleCounter = document.getElementById('titleCounter');
    const excerptCounter = document.getElementById('excerptCounter');
    
    if (modalPostTitle && titleCounter) {
        const titleLength = modalPostTitle.value.length;
        const titleMin = 3;
        const isValid = titleLength >= titleMin;
        titleCounter.innerHTML = `${titleLength} / ${titleMin} karakter ${isValid ? '✓' : '⚠️ Çok kısa!'}`;
        titleCounter.style.color = isValid ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)';
    }
    
    if (postExcerpt && excerptCounter) {
        const excerptLength = postExcerpt.value.length;
        const excerptMin = 10;
        const isValid = excerptLength >= excerptMin;
        excerptCounter.innerHTML = `${excerptLength} / ${excerptMin} karakter ${isValid ? '✓' : '⚠️ Çok kısa!'}`;
        excerptCounter.style.color = isValid ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)';
    }
}

// Setup event listeners
function setupEventListeners() {
    try {
        // Theme toggle handled by ThemeManager
        
        // Editor content changes
        const editorContent = document.getElementById('editorContent');
        if (editorContent) {
            editorContent.addEventListener('input', () => {
                updateAllStats();
                updateReadingTime();
            });
            editorContent.addEventListener('paste', () => {
                setTimeout(() => {
                    updateAllStats();
                    updateReadingTime();
                }, 100);
            });
            editorContent.addEventListener('keyup', () => {
                updateAllStats();
                updateReadingTime();
            });
            console.log('Editor event listeners added');
        }
        
        // Document title changes
        const documentTitle = document.getElementById('postTitle');
        if (documentTitle) {
            documentTitle.addEventListener('input', () => {
                updateAllStats();
                updateSlugFromTitle();
            });
            console.log('Document title listener added');
        }
        
        // Form field character counters
        const modalPostTitle = document.getElementById('modalPostTitle');
        const postExcerpt = document.getElementById('postExcerpt');
        
        if (modalPostTitle) {
            modalPostTitle.addEventListener('input', updateCharacterCounters);
            modalPostTitle.addEventListener('keyup', updateCharacterCounters);
        }
        
        if (postExcerpt) {
            postExcerpt.addEventListener('input', updateCharacterCounters);
            postExcerpt.addEventListener('keyup', updateCharacterCounters);
        }
        
        // Cover photo gallery folder change
        const coverGalleryFolderSelect = document.getElementById('coverGalleryFolderSelect');
        if (coverGalleryFolderSelect) {
            coverGalleryFolderSelect.addEventListener('change', loadCoverGallery);
        }
        
    } catch (error) {
        console.error('Event listener setup error:', error);
    }
}

// Theme Management System (blog.js'den adapte edildi)
class ThemeManager {
  constructor() {
    this.root = document.documentElement;
    this.themeToggle = document.getElementById('themeToggle');
    
    this.defaultTheme = {
      light: {
        bg: '#f8f8f6',
        panel: '#fafaf8',
        ink: '#0b0b0b',
        muted: '#6b7280',
        line: '#e5e7eb',
        accent: '#84CC16'
      },
      dark: {
        bg: '#0b0d0f',
        panel: '#14171a',
        ink: '#e8edf2',
        muted: '#9aa4b2',
        line: '#2a2f35',
        accent: '#84CC16'
      },
      borderRadius: 16,
      shadowIntensity: 60,
      fontFamily: 'Inter'
    };
    
    this.init();
  }
  
  init() {
    if (!this.themeToggle) {
      console.warn('Theme toggle button not found');
      return;
    }
    
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
    this.loadSavedTheme();
    console.log('ThemeManager initialized');
  }
  
  getCurrentTheme() {
    return localStorage.getItem('theme') || 
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  
  async loadSavedTheme() {
    try {
      // First try to load from server
      const response = await fetch('/api/theme');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.theme) {
          this.applyCustomTheme(data.theme);
          localStorage.setItem('customTheme', JSON.stringify(data.theme));
          console.log('Theme loaded from server');
        }
      }
    } catch (error) {
      console.error('Error loading theme from server:', error);
      // Apply default theme on error
      this.applyCustomTheme(this.defaultTheme);
    }
    
    // Apply saved theme mode
    const savedTheme = this.getCurrentTheme();
    this.setTheme(savedTheme);
  }
  
  applyCustomTheme(themeData) {
    // Apply light theme variables
    this.root.style.setProperty('--bg', themeData.light.bg);
    this.root.style.setProperty('--panel', themeData.light.panel);
    this.root.style.setProperty('--ink', themeData.light.ink);
    this.root.style.setProperty('--muted', themeData.light.muted);
    this.root.style.setProperty('--line', themeData.light.line);
    this.root.style.setProperty('--accent', themeData.light.accent);
    
    // Apply dark theme variables
    this.root.style.setProperty('--dark-bg', themeData.dark.bg);
    this.root.style.setProperty('--dark-panel', themeData.dark.panel);
    this.root.style.setProperty('--dark-ink', themeData.dark.ink);
    this.root.style.setProperty('--dark-muted', themeData.dark.muted);
    this.root.style.setProperty('--dark-line', themeData.dark.line);
    this.root.style.setProperty('--dark-accent', themeData.dark.accent);
    
    // Apply other settings
    this.root.style.setProperty('--radius', `${themeData.borderRadius}px`);
    this.root.style.setProperty('--shadow', `0 10px 24px rgba(0,0,0,${themeData.shadowIntensity / 100 * 0.06})`);
    this.root.style.setProperty('--shadow-lg', `0 20px 40px rgba(0,0,0,${themeData.shadowIntensity / 100 * 0.1})`);
    
    // Apply font family
    document.body.style.fontFamily = `'${themeData.fontFamily}', system-ui, -apple-system, sans-serif`;
  }
  
  setTheme(theme) {
    const isDark = theme === 'dark';
    
    // Apply theme colors
    const savedTheme = localStorage.getItem('customTheme');
    let themeData = this.defaultTheme; // Default fallback
    
    if (savedTheme) {
      try {
        themeData = JSON.parse(savedTheme);
      } catch (error) {
        console.error('Error parsing saved theme, using default:', error);
      }
    }
    
    // Apply theme variables safely
    try {
      if (isDark && themeData.dark) {
        this.root.style.setProperty('--bg', themeData.dark.bg || this.defaultTheme.dark.bg);
        this.root.style.setProperty('--panel', themeData.dark.panel || this.defaultTheme.dark.panel);
        this.root.style.setProperty('--ink', themeData.dark.ink || this.defaultTheme.dark.ink);
        this.root.style.setProperty('--muted', themeData.dark.muted || this.defaultTheme.dark.muted);
        this.root.style.setProperty('--line', themeData.dark.line || this.defaultTheme.dark.line);
        this.root.style.setProperty('--accent', themeData.dark.accent || this.defaultTheme.dark.accent);
      } else if (themeData.light) {
        this.root.style.setProperty('--bg', themeData.light.bg || this.defaultTheme.light.bg);
        this.root.style.setProperty('--panel', themeData.light.panel || this.defaultTheme.light.panel);
        this.root.style.setProperty('--ink', themeData.light.ink || this.defaultTheme.light.ink);
        this.root.style.setProperty('--muted', themeData.light.muted || this.defaultTheme.light.muted);
        this.root.style.setProperty('--line', themeData.light.line || this.defaultTheme.light.line);
        this.root.style.setProperty('--accent', themeData.light.accent || this.defaultTheme.light.accent);
      }
    } catch (error) {
      console.error('Error applying theme variables:', error);
    }
    
    // Toggle dark class
    this.root.classList.toggle('dark', isDark);
    
    // Update localStorage
    localStorage.setItem('theme', theme);
    
    // Force repaint
    this.root.offsetHeight;
    
    console.log(`Theme set to: ${theme}`);
  }
  
  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }
}

// Initialize theme manager
let themeManager;

// Theme toggle function (global)
function toggleTheme() {
    if (themeManager) {
        themeManager.toggleTheme();
    }
}

// Update current date
function updateCurrentDate() {
    try {
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            const today = new Date();
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            dateElement.textContent = today.toLocaleDateString('tr-TR', options);
        }
    } catch (error) {
        console.error('Date update error:', error);
    }
}

// Update reading time
function updateReadingTime() {
    try {
        const editorContent = document.getElementById('editorContent');
        const readingTimeElement = document.getElementById('readingTime');
        
        if (editorContent && readingTimeElement) {
            const text = editorContent.innerText || editorContent.textContent || '';
            const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
            const readingTime = Math.max(1, Math.ceil(wordCount / 300)); // 300 kelime/dakika
            
            readingTimeElement.textContent = `~${readingTime} dk okuma`;
        }
    } catch (error) {
        console.error('Reading time update error:', error);
    }
}

// Update all stats
function updateAllStats() {
    try {
        const editorContent = document.getElementById('editorContent');
        if (!editorContent) return;
        
        const text = editorContent.innerText || editorContent.textContent || '';
        const htmlContent = editorContent.innerHTML || '';
        
        // Word count
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        
        // Character counts
        const charCount = text.length;
        const charCountNoSpaces = text.replace(/\s/g, '').length;
        
        // Paragraph count
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const paragraphCount = paragraphs.length;
        
        // Reading time
        const readingTime = Math.max(1, Math.ceil(wordCount / 300));
        
        // Update UI elements
        updateElement('wordCount', `${wordCount} sözcük`);
        updateElement('charCount', `${charCount} karakter`);
        updateElement('charCountNoSpaces', `${charCountNoSpaces} karakter (boşluksuz)`);
        updateElement('paragraphCount', `${paragraphCount} paragraf`);
        updateElement('readingTime', `~${readingTime} dk okuma`);
        updateElement('readingTimeStats', `~${readingTime} dk okuma`);
        updateElement('fontInfo', `Font: Inter, 18px`);
        
    } catch (error) {
        console.error('Update all stats error:', error);
    }
}

// Helper function to update element
function updateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// Format text functions
function formatText(type) {
    try {
        const editor = document.getElementById('editorContent');
        const selection = window.getSelection();
        
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        switch(type) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'h1':
                document.execCommand('formatBlock', false, 'h1');
                break;
            case 'h2':
                document.execCommand('formatBlock', false, 'h2');
                break;
            case 'link':
                const url = prompt('Link URL:');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
                break;
            case 'image':
                // This case is now handled by openImageModal() function
                // Keeping for backward compatibility but redirecting to new modal
                openImageModal();
                break;
            case 'list':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'orderedList':
                document.execCommand('insertOrderedList', false, null);
                break;
            case 'underline':
                document.execCommand('underline', false, null);
                break;
            case 'strikethrough':
                document.execCommand('strikeThrough', false, null);
                break;
            case 'h3':
                document.execCommand('formatBlock', false, 'h3');
                break;
            case 'blockquote':
                document.execCommand('formatBlock', false, 'blockquote');
                break;
            case 'code':
                const code = document.createElement('pre');
                code.innerHTML = '<code>' + (selectedText || 'kod buraya') + '</code>';
                range.deleteContents();
                range.insertNode(code);
                break;
            case 'hr':
                const hr = document.createElement('hr');
                range.deleteContents();
                range.insertNode(hr);
                // HR'dan sonra yeni satır ekle
                const newLine = document.createElement('p');
                newLine.innerHTML = '<br>';
                hr.parentNode.insertBefore(newLine, hr.nextSibling);
                break;
        }
        
        updateAllStats();
    } catch (error) {
        console.error('Format text error:', error);
    }
}

// Set view mode
function setViewMode(mode) {
    try {
    currentViewMode = mode;

    const editMode = document.getElementById('editMode');
    const previewMode = document.getElementById('previewMode');
        const viewBtns = document.querySelectorAll('.view-btn');
        
        // Update button states
        viewBtns.forEach(btn => {
        btn.classList.remove('active');
            if (btn.getAttribute('data-mode') === mode) {
            btn.classList.add('active');
        }
    });
        
        // Show/hide sections
        if (mode === 'edit') {
            editMode.style.display = 'block';
            previewMode.style.display = 'none';
        } else if (mode === 'preview') {
            editMode.style.display = 'none';
            previewMode.style.display = 'block';
            updatePreview();
        }
        
        console.log('View mode changed to:', mode);
    } catch (error) {
        console.error('Set view mode error:', error);
    }
}

// Update preview
function updatePreview() {
    try {
        const editorContent = document.getElementById('editorContent');
        const previewContent = document.getElementById('livePreviewContent');
        
        if (editorContent && previewContent) {
            const htmlContent = editorContent.innerHTML;
            previewContent.innerHTML = htmlContent;
        }
    } catch (error) {
        console.error('Update preview error:', error);
    }
}

// Show blog save form
function showBlogSaveForm() {
    try {
        const modal = document.getElementById('postFormModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Set default date
            const dateInput = document.getElementById('postDate');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // Sync title from editor to modal
            const editorTitle = document.getElementById('postTitle');
            const modalTitle = document.getElementById('modalPostTitle');
            const modalSlug = document.getElementById('postSlug');
            
            if (editorTitle && modalTitle) {
                const currentTitle = editorTitle.textContent.trim();
                modalTitle.value = currentTitle;
                
                // Auto-generate slug from title
                if (modalSlug && currentTitle && currentTitle !== 'Yeni Blog Yazısı') {
                    const slug = generateSlug(currentTitle);
                    modalSlug.value = slug;
                }
            }
            
            // Update character counters when modal opens
            setTimeout(() => {
                updateCharacterCounters();
            }, 100);
        }
    } catch (error) {
        console.error('Show blog save form error:', error);
    }
}

// Close post form
function closePostForm() {
    try {
        const modal = document.getElementById('postFormModal');
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Close post form error:', error);
    }
}

// Show raw markdown preview
function showRawMarkdownPreview() {
    try {
        const modal = document.getElementById('previewModal');
        const textarea = document.getElementById('markdownOutput');
        const editorContent = document.getElementById('editorContent');
        
        if (modal && textarea && editorContent) {
            // Convert HTML to Markdown
            const markdownText = htmlToMarkdown(editorContent.innerHTML);
            textarea.value = markdownText;
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Show markdown preview error:', error);
    }
}

// Close preview modal
function closePreviewModal() {
    try {
        const modal = document.getElementById('previewModal');
        if (modal) {
            modal.style.display = 'none';
                }
            } catch (error) {
        console.error('Close preview modal error:', error);
    }
}

// Copy markdown
function copyMarkdown() {
    try {
        const textarea = document.getElementById('markdownOutput');
        if (textarea) {
            textarea.select();
            document.execCommand('copy');
            
            // Show success indicator
            const indicator = document.getElementById('saveIndicator');
            if (indicator) {
                indicator.innerHTML = '<span>📋 Kopyalandı!</span>';
                indicator.classList.add('show');
        setTimeout(() => {
                    indicator.classList.remove('show');
        }, 2000);
    }
}
    } catch (error) {
        console.error('Copy markdown error:', error);
    }
}

// HTML to Markdown conversion (simplified)
function htmlToMarkdown(html) {
    try {
        // Debug logs removed - system working correctly
        let markdown = html;
        
        // Convert headers
        markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
        markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
        markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
        
        // Convert bold and italic
        markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
        markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
        markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
        markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
        
        // Convert links
        markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
        
        // Convert div containers with images and captions
        markdown = markdown.replace(/<div[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<p[^>]*>(.*?)<\/p>[\s\S]*?<\/div>/gi, function(match, src, alt, caption) {
            // Debug: Converting image with caption
            // Caption varsa onu kullan, yoksa alt'ı kullan
            const imageText = caption && caption.trim() ? caption : alt;
            return `![${imageText}](${src})\n\n`;
        });
        
        // Convert div containers with images but no captions
        markdown = markdown.replace(/<div[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi, function(match, src, alt) {
            // Debug: Converting image without caption
            // Alt'ta dosya adı varsa, onu kullan
            return `![${alt}](${src})\n\n`;
        });
        
        // Convert simple images (without container)
        markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, function(match, src, alt) {
            const filename = src.split('/').pop().split('.')[0];
            return `![${filename}](${src})\n\n`;
        });
        
        // Convert paragraphs (but skip image captions - they're already processed)
        markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, function(match, content) {
            // Skip image caption paragraphs (they have specific styles)
            if (match.includes('font-size: 14px') || match.includes('color: var(--muted)') || match.includes('font-style: italic')) {
                return ''; // Remove caption paragraphs - they're already converted to markdown
            }
            return content + '\n\n';
        });
        
        // Convert lists
        markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, function(match, content) {
            // Convert each li to markdown list item
            const listItems = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
            return listItems + '\n';
        });
        
        markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, function(match, content) {
            // Convert each li to numbered markdown list item
            let counter = 1;
            const listItems = content.replace(/<li[^>]*>(.*?)<\/li>/gi, function(liMatch, liContent) {
                return `${counter++}. ${liContent}\n`;
            });
            return listItems + '\n';
        });
        
        // Convert horizontal rules
        markdown = markdown.replace(/<hr[^>]*>/gi, '\n---\n');
        
        // Convert line breaks
        markdown = markdown.replace(/<br[^>]*>/gi, '\n');
        
        // Remove remaining HTML tags
        markdown = markdown.replace(/<[^>]*>/g, '');
        
        // Clean up
        markdown = markdown
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .replace(/^\s+|\s+$/g, '')
            .trim();
        
        // Conversion complete
        
        return markdown;
    } catch (error) {
        console.error('HTML to Markdown conversion error:', error);
        return html;
    }
}

// Submit post
async function submitPost() {
    try {
    // Update character counters one last time before validation
    updateCharacterCounters();
    
    const postData = getPostData();
        const content = htmlToMarkdown(document.getElementById('editorContent').innerHTML);
    
    // Enhanced client-side validation with detailed messages
    if (!postData.title || !postData.slug || !content) {
        alert('Lütfen başlık, slug ve içerik alanlarını doldurun!');
        return;
    }
    
    // Validate minimum lengths
    if (postData.title.length < 3) {
        alert('❌ Başlık çok kısa!\n\nBaşlık en az 3 karakter olmalıdır.\n\nŞu anki uzunluk: ' + postData.title.length + ' karakter');
        return;
    }
    
    if (!postData.excerpt || postData.excerpt.length < 10) {
        alert('❌ Özet çok kısa!\n\nÖzet en az 10 karakter olmalıdır.\n\nŞu anki uzunluk: ' + (postData.excerpt?.length || 0) + ' karakter');
        return;
    }
    
    if (content.length < 50) {
        alert('❌ İçerik çok kısa!\n\nİçerik en az 50 karakter olmalıdır.\n\nŞu anki uzunluk: ' + content.length + ' karakter');
        return;
    }
    
    // Check if we have authentication token
    const token = localStorage.getItem('admin_token');
    if (!token) {
        alert('Oturum süreniz dolmuş. Lütfen admin paneline giriş yapın.');
        window.location.href = '../admin/login.html';
        return;
    }
    
    // Check if we're in edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const editSlug = urlParams.get('edit');
    
    const isEditMode = !!editSlug;
    const url = isEditMode ? `http://localhost:3000/api/posts/${editSlug}` : 'http://localhost:3000/api/posts';
    const method = isEditMode ? 'PUT' : 'POST';
    
    console.log('Token exists:', !!token);
    console.log('Submitting to:', url);
    console.log('Method:', method);
    console.log('Edit mode:', isEditMode);
    
    const requestBody = {
        ...postData,
        content: content,
        status: 'draft'
    };
    
    console.log('Request body:', requestBody);
    console.log('Title length:', requestBody.title?.length || 0);
    console.log('Excerpt length:', requestBody.excerpt?.length || 0);
    console.log('Content length:', requestBody.content?.length || 0);
    
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Post saved successfully:', result);
            alert(isEditMode ? 'Blog yazısı başarıyla güncellendi!' : 'Blog yazısı başarıyla taslak olarak kaydedildi!');
            window.location.href = '../admin/index.html';
        } else {
            let errorMessage = 'Kaydetme sırasında hata oluştu!';
            try {
                const errorData = await response.json();
                console.error('Server error:', response.status, errorData);
                
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
                if (errorData.details) {
                    console.error('Error details:', errorData.details);
                    if (errorData.details.missingFields) {
                        errorMessage += `\n\nEksik alanlar: ${errorData.details.missingFields.join(', ')}`;
                    }
                    if (errorData.details.field) {
                        errorMessage += `\n\nHatalı alan: ${errorData.details.field}`;
                    }
                }
            } catch (e) {
                const errorText = await response.text();
                console.error('Server error:', response.status, errorText);
                errorMessage = errorText || errorMessage;
            }
            
            if (response.status === 403) {
                alert('Yetkiniz yok. Lütfen admin paneline giriş yapın.');
                window.location.href = '../admin/login.html';
            } else if (response.status === 404) {
                alert('API endpoint bulunamadı. Sunucunun çalıştığından emin olun.');
            } else {
                alert(`${errorMessage}\n\nHata Kodu: ${response.status}`);
            }
        }
    } catch (error) {
        console.error('Submit post error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            alert('Sunucuya bağlanılamıyor. Sunucunun çalıştığından emin olun.');
        } else {
            alert('Kaydetme sırasında hata oluştu!');
        }
    }
}

// Generate slug from title with Turkish character support
function generateSlug(title) {
    // Turkish character mapping
    const turkishChars = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
    };
    
    return title
        .toLowerCase()
        .split('')
        .map(char => turkishChars[char] || char) // Replace Turkish chars
        .join('')
        .replace(/[^a-z0-9\s-]/g, '') // Remove remaining special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Update slug when title changes (if modal is open)
function updateSlugFromTitle() {
    try {
        const modal = document.getElementById('postFormModal');
        if (modal && modal.style.display === 'block') {
            const editorTitle = document.getElementById('postTitle');
            const modalSlug = document.getElementById('postSlug');
            
            if (editorTitle && modalSlug) {
                const currentTitle = editorTitle.textContent.trim();
                if (currentTitle && currentTitle !== 'Yeni Blog Yazısı') {
                    const slug = generateSlug(currentTitle);
                    modalSlug.value = slug;
                }
            }
        }
    } catch (error) {
        console.error('Error updating slug from title:', error);
    }
}

// Get post data from form
function getPostData() {
    // Get cover photo URL from the hero image
    const heroImg = document.getElementById('heroImg');
    const coverUrl = heroImg && heroImg.src && !heroImg.src.includes('placehold.co') ? heroImg.src : '';
    
    // Get cover photo caption
    const heroCaption = document.getElementById('heroCaption');
    const coverCaption = heroCaption ? heroCaption.textContent.trim() : '';
    
    return {
        title: document.getElementById('modalPostTitle').value,
        slug: document.getElementById('postSlug').value,
        excerpt: document.getElementById('postExcerpt').value,
        date: document.getElementById('postDate').value,
        cover: coverUrl || '',
        coverCaption: coverCaption,
        tags: document.getElementById('postTags').value ? 
            document.getElementById('postTags').value.split(',').map(tag => tag.trim()).join(',') : '',
        featured: false
    };
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('post-form-modal')) {
        closePostForm();
    }
    if (e.target.classList.contains('preview-modal')) {
        closePreviewModal();
    }
    if (e.target.classList.contains('cover-gallery-modal')) {
        closeCoverGallery();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch(e.key) {
            case 'b':
                e.preventDefault();
                formatText('bold');
                break;
            case 'i':
                e.preventDefault();
                formatText('italic');
                break;
            case '1':
                e.preventDefault();
                if (e.shiftKey) {
                    formatText('h1');
        } else {
                    setViewMode('edit');
                }
                break;
            case '2':
                e.preventDefault();
                if (e.shiftKey) {
                    formatText('h2');
                } else {
                    setViewMode('preview');
                }
                break;
            case 's':
                e.preventDefault();
                showBlogSaveForm();
                break;
        }
    }
});

// ========== COVER PHOTO FUNCTIONS ==========

// Gallery cache for uploaded images
let galleryCache = {};

// Add uploaded image to gallery cache
function addToGalleryCache(url, name, folder) {
    if (!galleryCache[folder]) {
        galleryCache[folder] = [];
    }
    
    // Check if image already exists in cache
    const exists = galleryCache[folder].some(img => img.url === url);
    
    if (!exists) {
        galleryCache[folder].unshift({
            name: name,
            url: url,
            folder: folder,
            isNew: true // Mark as new upload
        });
        console.log('Added to gallery cache:', name);
    }
}

// Open cover photo gallery
function openCoverGallery() {
    const modal = document.getElementById('coverGalleryModal');
    if (modal) {
        modal.style.display = 'block';
        loadCoverGallery();
    }
}

// Close cover photo gallery
function closeCoverGallery() {
    const modal = document.getElementById('coverGalleryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Load cover gallery images
function loadCoverGallery() {
    const folderSelect = document.getElementById('coverGalleryFolderSelect');
    const galleryGrid = document.getElementById('coverGalleryGrid');
    const selectedFolder = folderSelect.value;
    
    // Clear existing images
    galleryGrid.innerHTML = '<div class="gallery-loading">Galeri yükleniyor...</div>';
    
    // Get mock gallery images
    const mockImages = getMockGalleryImages(selectedFolder);
    
    // Get cached images (uploaded images)
    const cachedImages = galleryCache[selectedFolder] || [];
    
    // Combine mock and cached images (cached first for recent uploads)
    const allImages = [...cachedImages, ...mockImages];
    
    if (allImages.length === 0) {
        galleryGrid.innerHTML = '<div class="gallery-empty">Bu klasörde resim bulunamadı.</div>';
        return;
    }
    
    // Render gallery images
    galleryGrid.innerHTML = '';
    allImages.forEach(image => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        if (image.isNew) {
            galleryItem.classList.add('new-upload');
        }
        galleryItem.onclick = () => selectCoverImage(image);
        
        galleryItem.innerHTML = `
            <img src="${image.url}" alt="${image.name}" loading="lazy">
            <div class="item-name">${image.name}</div>
        `;
        
        galleryGrid.appendChild(galleryItem);
    });
}

// Select cover image from gallery
function selectCoverImage(image) {
    // Remove previous selection
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selection to clicked item
    event.currentTarget.classList.add('selected');
    
    // Set as cover photo
    setCoverPhoto(image);
    
    // Remove "new" tag from selected image
    if (image.isNew) {
        image.isNew = false;
        event.currentTarget.classList.remove('new-upload');
    }
    
    // Close modal
    closeCoverGallery();
}

// Open cover photo upload
function openCoverUpload() {
    const fileInput = document.getElementById('coverFileInput');
    if (fileInput) {
        fileInput.click();
    }
}

// Handle cover photo upload
function handleCoverUpload(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
        alert('Lütfen sadece resim dosyası seçin.');
        return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const image = {
            name: file.name,
            url: e.target.result,
            file: file
        };
        
        setCoverPhoto(image);
        
        // Upload to server
        uploadCoverPhotoToServer(file);
    };
    reader.readAsDataURL(file);
}

// Set cover photo
function setCoverPhoto(image) {
    const heroImg = document.getElementById('heroImg');
    const heroCaption = document.getElementById('heroCaption');
    const container = document.getElementById('coverPhotoContainer');
    
    if (heroImg) {
        // Fix URL path for markdown-editor subdirectory
        let fixedUrl = image.url;
        if (!image.url.startsWith('http') && !image.url.startsWith('data:')) {
            fixedUrl = image.url.startsWith('/') ? image.url : '/' + image.url;
        }
        
        heroImg.src = fixedUrl;
        heroImg.alt = image.name;
        
        // Update caption only if it's empty or contains default text
        if (heroCaption) {
            const currentText = heroCaption.textContent.trim();
            if (currentText === '' || currentText === 'Görsel açıklaması' || currentText === 'Kapak fotoğrafı açıklaması...') {
                heroCaption.textContent = image.name;
            }
        }
        
        // Mark as having image
        if (container) {
            container.classList.add('has-image');
        }
        
        console.log('Cover photo set:', image.name);
    }
}

// Upload cover photo to server
async function uploadCoverPhotoToServer(file) {
    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', 'blog-covers'); // Specify the folder for cover photos
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Cover photo uploaded successfully:', result);
            
            // Update image source to the uploaded URL
            const heroImg = document.getElementById('heroImg');
            if (heroImg && result.url) {
                // Fix URL path for markdown-editor subdirectory
                const fixedUrl = result.url.startsWith('/') ? result.url : '/' + result.url;
                heroImg.src = fixedUrl;
            }
            
            // Add to gallery cache for immediate availability
            addToGalleryCache(result.url, file.name, 'blog-covers');
            
        } else {
            console.error('Failed to upload cover photo:', response.status);
        }
    } catch (error) {
        console.error('Error uploading cover photo:', error);
    }
}

// ========== COVER PHOTO MODAL FUNCTIONS ==========

// Open cover photo modal
function openCoverPhotoModal() {
    try {
        console.log('=== OPEN COVER PHOTO MODAL DEBUG ===');
        console.log('openCoverPhotoModal function called');
        
        isCoverPhotoModal = true; // Set flag for cover photo selection
        console.log('isCoverPhotoModal set to:', isCoverPhotoModal);
        
        const modal = document.getElementById('imageInsertModal');
        console.log('Modal element:', modal);
        
        if (modal) {
            modal.style.display = 'block';
            console.log('Modal displayed');
            
            // Don't reset the cover photo modal flag
            selectedImage = null;
            uploadedImage = null;
            currentImageMode = 'gallery';
            
            // Reset UI elements
            document.getElementById('galleryModeBtn').classList.add('active');
            document.getElementById('uploadModeBtn').classList.remove('active');
            document.getElementById('galleryMode').classList.add('active');
            document.getElementById('uploadMode').classList.remove('active');
            
            // Hide sections
            const imagePreview = document.getElementById('imagePreview');
            const formatSelection = document.getElementById('formatSelection');
            const imageSettings = document.getElementById('imageSettings');
            const uploadSettings = document.getElementById('uploadSettings');
            
            if (imagePreview) imagePreview.style.display = 'none';
            if (formatSelection) formatSelection.style.display = 'none';
            if (imageSettings) imageSettings.style.display = 'none';
            if (uploadSettings) uploadSettings.style.display = 'none';
            
            // Disable insert button
            const insertImageBtn = document.getElementById('insertImageBtn');
            if (insertImageBtn) insertImageBtn.disabled = true;
            
            // Clear selections
            document.querySelectorAll('.gallery-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            loadGalleryImages();
            
            // Update modal title for cover photo selection
            const modalTitle = modal.querySelector('.modal-header h3');
            if (modalTitle) {
                modalTitle.textContent = '🖼️ Kapak Fotoğrafı Seç';
                console.log('Modal title updated');
            }
            
            // Update insert button text
            const insertBtn = document.getElementById('insertImageBtn');
            if (insertBtn) {
                insertBtn.textContent = 'Kapak Fotoğrafını Ayarla';
                console.log('Insert button text updated');
            }
            
            // Set default folder to blog-covers for cover photos
            const folderSelect = document.getElementById('galleryFolderSelect');
            if (folderSelect) {
                folderSelect.value = 'blog-covers';
                loadGalleryImages();
                console.log('Folder set to blog-covers');
            }
            
            console.log('Cover photo modal opened successfully');
        } else {
            console.error('Modal element not found!');
        }
    } catch (error) {
        console.error('Error opening cover photo modal:', error);
    }
}

// Insert selected cover photo
function insertCoverPhoto(image) {
    try {
        console.log('=== INSERT COVER PHOTO DEBUG ===');
        console.log('Image object:', image);
        console.log('Image URL:', image.url);
        
        const heroImg = document.getElementById('heroImg');
        const heroCaption = document.getElementById('heroCaption');
        const container = document.getElementById('coverPhotoContainer');
        
        console.log('HeroImg element:', heroImg);
        console.log('Container element:', container);
        
        if (heroImg) {
            console.log('Current heroImg src:', heroImg.src);
            
            // Force image to be visible
            heroImg.src = image.url;
            heroImg.alt = image.name;
            heroImg.style.display = 'block';
            heroImg.style.visibility = 'visible';
            heroImg.style.opacity = '1';
            
            console.log('New heroImg src:', heroImg.src);
            console.log('HeroImg styles:', {
                display: heroImg.style.display,
                visibility: heroImg.style.visibility,
                opacity: heroImg.style.opacity
            });
            
            // Update caption with image name
            if (heroCaption) {
                heroCaption.textContent = image.name;
                console.log('Caption updated to:', image.name);
            }
            
            // Mark container as having an image
            if (container) {
                container.classList.add('has-image');
                console.log('Added has-image class. Container classes:', container.className);
            }
            
            // If this is an uploaded image, save it to blog-covers folder
            if (image.file && isCoverPhotoModal) {
                uploadCoverPhoto(image.file);
            }
            
            console.log('Cover photo update completed');
        } else {
            console.error('heroImg element not found!');
        }
    } catch (error) {
        console.error('Error inserting cover photo:', error);
    }
}

// Upload cover photo to server
async function uploadCoverPhoto(file) {
    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', 'blog-covers');
        
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Cover photo uploaded successfully:', result);
            
            // Update image source to the uploaded URL
            const heroImg = document.getElementById('heroImg');
            if (heroImg && result.url) {
                heroImg.src = result.url;
            }
        } else {
            console.error('Failed to upload cover photo:', response.status);
        }
    } catch (error) {
        console.error('Error uploading cover photo:', error);
    }
}

// ========== IMAGE INSERT MODAL FUNCTIONS ==========

// Global variables for image modal
let currentImageMode = 'gallery';
let selectedImage = null;
let uploadedImage = null;
let isCoverPhotoModal = false; // Track if modal is opened for cover photo selection
let savedCursorElement = null; // Save cursor element when modal opens
let savedCursorOffset = null; // Save cursor offset when modal opens

// Open image insert modal
function openImageModal() {
    try {
        isCoverPhotoModal = false; // Set flag for regular image insertion
        
        // Save current cursor position before opening modal
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            savedCursorElement = range.startContainer;
            savedCursorOffset = range.startOffset;
            console.log('Cursor position saved:', savedCursorElement, 'offset:', savedCursorOffset);
        }
        
        const modal = document.getElementById('imageInsertModal');
        if (modal) {
            modal.style.display = 'block';
            resetImageModal();
            loadGalleryImages();
            
            // Reset modal title for regular image insertion
            const modalTitle = modal.querySelector('.modal-header h3');
            if (modalTitle) {
                modalTitle.textContent = '🖼️ Görsel Ekle';
            }
            
            // Reset insert button text
            const insertBtn = document.getElementById('insertImageBtn');
            if (insertBtn) {
                insertBtn.textContent = 'Görseli Ekle';
            }
        }
    } catch (error) {
        console.error('Error opening image modal:', error);
    }
}

// Close image insert modal
function closeImageModal() {
    try {
        const modal = document.getElementById('imageInsertModal');
        if (modal) {
            modal.style.display = 'none';
            resetImageModal();
        }
        // Clear saved cursor position when modal is closed
        savedCursorElement = null;
        savedCursorOffset = null;
        console.log('Modal closed, saved cursor position cleared');
    } catch (error) {
        console.error('Error closing image modal:', error);
    }
}

// Reset image modal to initial state
function resetImageModal() {
    selectedImage = null;
    uploadedImage = null;
    currentImageMode = 'gallery';
    
    // Reset UI elements
    document.getElementById('galleryModeBtn').classList.add('active');
    document.getElementById('uploadModeBtn').classList.remove('active');
    document.getElementById('galleryMode').classList.add('active');
    document.getElementById('uploadMode').classList.remove('active');
    
    // Hide sections
    document.getElementById('imagePreviewSection').style.display = 'none';
    
    // Disable insert button
    document.getElementById('insertImageBtn').disabled = true;
    
    // Clear selections
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Clear description input
    document.getElementById('imageDescription').value = '';
    
    // Reset cover photo modal flag
    isCoverPhotoModal = false;
    
    // Cursor position is cleared when modal is closed, not on reset
}

// Set image mode (gallery or upload)
function setImageMode(mode) {
    try {
        currentImageMode = mode;
        
        // Update button states
        document.getElementById('galleryModeBtn').classList.toggle('active', mode === 'gallery');
        document.getElementById('uploadModeBtn').classList.toggle('active', mode === 'upload');
        
        // Update mode visibility
        document.getElementById('galleryMode').classList.toggle('active', mode === 'gallery');
        document.getElementById('uploadMode').classList.toggle('active', mode === 'upload');
        
        // Reset selections when switching modes
        selectedImage = null;
        uploadedImage = null;
        document.getElementById('insertImageBtn').disabled = true;
        document.getElementById('imagePreviewSection').style.display = 'none';
        document.getElementById('imageDescription').value = '';
        
    } catch (error) {
        console.error('Error setting image mode:', error);
    }
}

// Load gallery images
async function loadGalleryImages() {
    try {
        const folderSelect = document.getElementById('galleryFolderSelect');
        const galleryGrid = document.getElementById('galleryGrid');
        const selectedFolder = folderSelect.value;
        
        // Clear existing images
        galleryGrid.innerHTML = '<div class="gallery-loading">Galeri yükleniyor...</div>';
        
        // Simulate loading gallery images (in real implementation, this would fetch from server)
        const mockImages = getMockGalleryImages(selectedFolder);
        
        if (mockImages.length === 0) {
            galleryGrid.innerHTML = '<div class="gallery-empty">Bu klasörde resim bulunamadı.</div>';
            return;
        }
        
        // Render gallery images
        galleryGrid.innerHTML = '';
        mockImages.forEach(image => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.onclick = () => selectGalleryImage(image);
            
            galleryItem.innerHTML = `
                <img src="${image.url}" alt="${image.name}" loading="lazy">
                <div class="item-name">${image.name}</div>
            `;
            
            galleryGrid.appendChild(galleryItem);
        });
        
    } catch (error) {
        console.error('Error loading gallery images:', error);
        document.getElementById('galleryGrid').innerHTML = '<div class="gallery-error">Galeri yüklenirken hata oluştu.</div>';
    }
}

// Get mock gallery images (replace with real API call)
function getMockGalleryImages(folder) {
    const mockImages = {
        'all': [
            { name: 'elektronikSema.png', url: '../images/blog-covers/elektronikSema.png', folder: 'blog-covers' },
            { name: 'avatar.jpg', url: '../images/profile/avatar.jpg', folder: 'profile' },
            { name: 'cedlogo.png', url: '../images/system/cedlogo.png', folder: 'system' }
        ],
        'blog-covers': [
            { name: 'elektronikSema.png', url: '../images/blog-covers/elektronikSema.png', folder: 'blog-covers' }
        ],
        'blog-content': [
            { name: 'cover-1.jpg', url: '../images/blog-content/cover-1 - Kopya - Kopya.jpg', folder: 'blog-content' },
            { name: 'espnow.jpg', url: '../images/blog-content/espnow - Kopya - Kopya.jpg', folder: 'blog-content' }
        ],
        'profile': [
            { name: 'avatar.jpg', url: '../images/profile/avatar.jpg', folder: 'profile' },
            { name: 'linkedinpoz.JPG', url: '../images/profile/linkedinpoz.JPG', folder: 'profile' }
        ],
        'system': [
            { name: 'cedlogo.png', url: '../images/system/cedlogo.png', folder: 'system' },
            { name: 'cedlogo (1).png', url: '../images/system/cedlogo (1).png', folder: 'system' },
            { name: 'cedlogo (2).png', url: '../images/system/cedlogo (2).png', folder: 'system' }
        ]
    };
    
    return mockImages[folder] || [];
}

// Select gallery image
function selectGalleryImage(image) {
    try {
        // Remove previous selection
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        event.currentTarget.classList.add('selected');
        
        selectedImage = image;
        showSimpleImagePreview(image);
        
        document.getElementById('insertImageBtn').disabled = false;
        
    } catch (error) {
        console.error('Error selecting gallery image:', error);
    }
}

// Show simple image preview
function showSimpleImagePreview(image) {
    try {
        const previewSection = document.getElementById('imagePreviewSection');
        const previewImg = document.getElementById('previewImage');
        const descriptionInput = document.getElementById('imageDescription');
        
        previewImg.src = image.url;
        previewImg.alt = image.name;
        
        // Set default description if empty
        if (!descriptionInput.value) {
            descriptionInput.value = image.name;
        }
        
        previewSection.style.display = 'block';
        
    } catch (error) {
        console.error('Error showing image preview:', error);
    }
}

// Show format selection
function showFormatSelection() {
    const formatSelection = document.getElementById('formatSelection');
    if (formatSelection) {
        formatSelection.style.display = 'block';
    }
}

// Show image settings
function showImageSettings() {
    const imageSettings = document.getElementById('imageSettings');
    if (imageSettings) {
        imageSettings.style.display = 'block';
    }
}

// Handle file upload
function handleFileUpload(files) {
    try {
        if (files.length === 0) return;
        
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            alert('Lütfen sadece resim dosyası seçin.');
            return;
        }
        
        // Show upload settings only for regular image insertion
        if (!isCoverPhotoModal) {
            const uploadSettings = document.getElementById('uploadSettings');
            if (uploadSettings) {
                uploadSettings.style.display = 'block';
            }
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage = {
                name: file.name,
                url: e.target.result,
                file: file,
                size: formatFileSize(file.size)
            };
            
            showUploadPreview(uploadedImage);
            
            // Only show format selection and settings for regular image insertion
            if (!isCoverPhotoModal) {
                showFormatSelection();
                showImageSettings();
            }
            
            document.getElementById('insertImageBtn').disabled = false;
        };
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('Error handling file upload:', error);
    }
}

// Show upload preview
function showUploadPreview(image) {
    try {
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImage');
        const fileName = document.getElementById('previewFileName');
        const fileSize = document.getElementById('previewFileSize');
        
        if (previewImg) {
            previewImg.src = image.url;
            previewImg.alt = image.name;
        }
        if (fileName) {
            fileName.textContent = image.name;
        }
        if (fileSize) {
            fileSize.textContent = image.size;
        }
        if (preview) {
            preview.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error showing upload preview:', error);
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Insert selected image
function insertSelectedImage() {
    try {
        console.log('=== INSERT IMAGE DEBUG ===');
        
        const image = selectedImage || uploadedImage;
        if (!image) {
            console.log('No image selected');
            alert('Lütfen bir görsel seçin!');
            return;
        }
        
        console.log('Selected image:', image);
        
        // Get description from input
        const descriptionInput = document.getElementById('imageDescription');
        if (!descriptionInput) {
            console.log('Description input not found');
            alert('Açıklama alanı bulunamadı!');
            return;
        }
        
        // Clean description - remove any problematic characters
        let description = descriptionInput.value ? descriptionInput.value.trim() : '';
        if (!description) {
            description = image.name;
        }
        
        console.log('Description input value:', descriptionInput.value);
        console.log('Description (cleaned):', description);
        console.log('Image name (fallback):', image.name);
        
        // Check if description input is focused (this might affect cursor position)
        console.log('Description input focused:', document.activeElement === descriptionInput);
        
        // Create simple image container (div instead of figure)
        const imageContainer = document.createElement('div');
        imageContainer.style.margin = '16px 0';
        imageContainer.style.textAlign = 'center';
        
        // Create image element
        const img = document.createElement('img');
        img.src = image.url;
        img.alt = image.name; // Alt'ta sadece dosya adı
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '6px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        
        // Add image to container
        imageContainer.appendChild(img);
        
        // Add caption if description is not just the filename
        if (description && description !== image.name) {
            const caption = document.createElement('p');
            caption.textContent = description;
            caption.style.fontSize = '14px';
            caption.style.color = 'var(--muted)';
            caption.style.fontStyle = 'italic';
            caption.style.marginTop = '8px';
            caption.style.marginBottom = '0';
            imageContainer.appendChild(caption);
        }
        
        // Insert image directly into editor
        const editor = document.getElementById('editorContent');
        console.log('Editor found:', editor);
        
        // Force focus back to editor before inserting
        editor.focus();
        console.log('Editor focused, active element:', document.activeElement);
        
        const selection = window.getSelection();
        console.log('Selection range count:', selection.rangeCount);
        
        // Use saved cursor position if available, otherwise use current selection
        let range;
        if (savedCursorElement && savedCursorOffset !== null) {
            // Create new range from saved position
            range = document.createRange();
            range.setStart(savedCursorElement, savedCursorOffset);
            range.setEnd(savedCursorElement, savedCursorOffset);
            console.log('Using saved cursor position');
            console.log('Saved element:', savedCursorElement);
            console.log('Saved offset:', savedCursorOffset);
            // Don't clear saved position - keep it for multiple images
        } else if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            console.log('Using current cursor position');
            console.log('Range start container:', range.startContainer);
            console.log('Range start offset:', range.startOffset);
        } else {
            console.log('No cursor position available, appending to end');
            editor.appendChild(imageContainer);
            return;
        }
        
        // Delete any selected content first
        range.deleteContents();
        
        // Insert the image container directly at the cursor position
        range.insertNode(imageContainer);
        console.log('Image container inserted at cursor position');
        console.log('Image container parent:', imageContainer.parentNode);
        
        // Move cursor after the inserted image container
        range.setStartAfter(imageContainer);
        range.setEndAfter(imageContainer);
        selection.removeAllRanges();
        selection.addRange(range);
        console.log('Cursor moved after image container');
        
        // Add line break after image container
        const br = document.createElement('br');
        if (imageContainer.parentNode) {
            imageContainer.parentNode.insertBefore(br, imageContainer.nextSibling);
            console.log('Line break added after image container');
        } else {
            console.log('Warning: Image container has no parent node');
        }
        
        // Verify image was added
        const imagesInEditor = editor.querySelectorAll('img');
        console.log('Total images in editor after insertion:', imagesInEditor.length);
        
        // Update stats
        updateAllStats();
        
        // Wait a bit before closing modal to ensure image is properly inserted
        setTimeout(() => {
            console.log('Closing modal after 100ms delay');
            closeImageModal();
        }, 100);
        
        console.log('Image inserted successfully');
        
    } catch (error) {
        console.error('Error inserting image:', error);
        alert('Görsel eklenirken hata oluştu: ' + error.message);
    }
}

// Insert text at cursor position
function insertTextAtCursor(text) {
    try {
        const editor = document.getElementById('editorContent');
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            
            // Move cursor to end of inserted text
            range.setStartAfter(range.endContainer);
            range.setEndAfter(range.endContainer);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // If no selection, append to end
            editor.focus();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            range.insertNode(document.createTextNode(text));
        }
        
        // Update stats
        updateAllStats();
        
    } catch (error) {
        console.error('Error inserting text:', error);
    }
}


// Setup image modal event listeners
function setupImageModalListeners() {
    try {
        // Gallery folder change
        const folderSelect = document.getElementById('galleryFolderSelect');
        if (folderSelect) {
            folderSelect.addEventListener('change', loadGalleryImages);
        }
        
        // File input change
        const fileInput = document.getElementById('imageFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                handleFileUpload(e.target.files);
            });
        }
        
        // Drag and drop
        const uploadArea = document.getElementById('imageUploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                handleFileUpload(e.dataTransfer.files);
            });
        }
        
        // Click outside to close modal
        const modal = document.getElementById('imageInsertModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeImageModal();
                }
            });
        }
        
    } catch (error) {
        console.error('Error setting up image modal listeners:', error);
    }
}

// Update the existing setupEventListeners function to include image modal
const originalSetupEventListeners = setupEventListeners;
setupEventListeners = function() {
    originalSetupEventListeners();
    setupImageModalListeners();
};

console.log('Script loaded successfully');

// Global variables
let currentViewMode = 'edit';
let editingPostStatus = null; // Track the status of the post being edited

// ====== Development Mode Configuration ======
// Auto-detect development mode based on current hostname
const DEVELOPMENT_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = `${window.location.origin}/api`;

// ====== Marked Configuration ======
// Configure marked with a custom renderer for images to support figure/figcaption
try {
    const renderer = new marked.Renderer();
    renderer.image = function (href, title, text) {
        // Return a structural figure with editable caption
        return `
<figure style="margin: 2em 0; text-align: center; display: block;">
  <img src="${href}" alt="${text}" style="max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 0 auto; box-shadow: var(--shadow);">
  <figcaption class="image-caption" contenteditable="true" placeholder="Görsel açıklaması girin...">${text || 'Görsel açıklaması'}</figcaption>
</figure>`.trim();
    };
    marked.setOptions({ renderer: renderer });
    console.log('Marked custom renderer initialized');
} catch (e) {
    console.error('Error configuring marked renderer:', e);
}

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
            // Pre-process: encode spaces and special chars in image URLs
            const sanitizedContent = post.content.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (match, alt, src) => {
                // Only encode if URL has spaces or special chars
                if (/[^a-zA-Z0-9\/._\-:]/.test(src)) {
                    const encodedSrc = encodeURI(decodeURI(src)); // decode first to avoid double-encoding
                    return `![${alt}](${encodedSrc})`;
                }
                return match;
            });
            const htmlContent = marked.parse(sanitizedContent);
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

        // Save post status for edit mode preservation
        editingPostStatus = post.status || 'draft';
        console.log('Post status saved for editing:', editingPostStatus);

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
                updateToolbarState();
            });
            editorContent.addEventListener('click', () => {
                updateToolbarState();
            });
            editorContent.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const selection = window.getSelection();
                    if (!selection.rangeCount) return;

                    let node = selection.anchorNode;
                    let inBlockquote = false;
                    let inPre = false;

                    while (node && node.id !== 'editorContent') {
                        if (node.nodeName === 'BLOCKQUOTE') {
                            inBlockquote = true;
                            break;
                        }
                        if (node.nodeName === 'PRE' || node.nodeName === 'CODE') {
                            inPre = true;
                            break;
                        }
                        node = node.parentNode;
                    }

                    if (inBlockquote) {
                        const range = selection.getRangeAt(0);
                        if (node.textContent.trim() === '' || node.textContent === '\n') {
                            e.preventDefault();
                            document.execCommand('formatBlock', false, 'p');
                        } else if (!e.shiftKey) {
                            e.preventDefault();
                            document.execCommand('insertLineBreak');
                        }
                    } else if (inPre) {
                        if (!e.shiftKey) {
                            e.preventDefault();
                            document.execCommand('insertText', false, '\n');
                        }
                    }
                }
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
// Function to update toolbar button states based on cursor position
function updateToolbarState() {
    try {
        const isBold = document.queryCommandState('bold');
        const isItalic = document.queryCommandState('italic');
        const isUnderline = document.queryCommandState('underline');
        const isStrikethrough = document.queryCommandState('strikeThrough');

        document.querySelector('button[onclick="formatText(\'bold\')"]').classList.toggle('active', isBold);
        document.querySelector('button[onclick="formatText(\'italic\')"]').classList.toggle('active', isItalic);
        document.querySelector('button[onclick="formatText(\'underline\')"]').classList.toggle('active', isUnderline);
        document.querySelector('button[onclick="formatText(\'strikethrough\')"]').classList.toggle('active', isStrikethrough);

        let formatBlock = document.queryCommandValue('formatBlock');
        if (formatBlock) {
            // Some browsers return the value with quotes, e.g. "h1"
            formatBlock = formatBlock.replace(/["']/g, '');
        }

        document.querySelector('button[onclick="formatText(\'h1\')"]').classList.toggle('active', formatBlock === 'h1' || formatBlock === 'H1');
        document.querySelector('button[onclick="formatText(\'h2\')"]').classList.toggle('active', formatBlock === 'h2' || formatBlock === 'H2');
        document.querySelector('button[onclick="formatText(\'h3\')"]').classList.toggle('active', formatBlock === 'h3' || formatBlock === 'H3');
        document.querySelector('button[onclick="formatText(\'blockquote\')"]').classList.toggle('active', formatBlock === 'blockquote' || formatBlock === 'BLOCKQUOTE');

    } catch (error) {
        // Ignore errors if queryCommandState is not supported
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

        // Helper to check what the current block format is
        const getActiveBlockFormat = () => {
            let node = selection.anchorNode;
            while (node && node.id !== 'editorContent') {
                const nodeName = node.nodeName.toLowerCase();
                if (['h1', 'h2', 'h3', 'blockquote', 'pre', 'p'].includes(nodeName)) {
                    return nodeName;
                }
                node = node.parentNode;
            }
            return 'p'; // Default
        };

        const currentBlock = getActiveBlockFormat();

        switch (type) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'underline':
                document.execCommand('underline', false, null);
                break;
            case 'strikethrough':
                document.execCommand('strikeThrough', false, null);
                break;
            case 'h1':
                document.execCommand('formatBlock', false, currentBlock === 'h1' ? 'p' : 'h1');
                break;
            case 'h2':
                document.execCommand('formatBlock', false, currentBlock === 'h2' ? 'p' : 'h2');
                break;
            case 'h3':
                document.execCommand('formatBlock', false, currentBlock === 'h3' ? 'p' : 'h3');
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
            case 'blockquote':
                if (currentBlock === 'blockquote') {
                    document.execCommand('formatBlock', false, 'p');
                    document.execCommand('outdent', false, null);
                } else {
                    document.execCommand('formatBlock', false, 'blockquote');
                }
                break;
            case 'code':
                let inPre = false;
                let inCode = false;
                let n = selection.anchorNode;
                while (n && n.id !== 'editorContent') {
                    if (n.nodeName === 'PRE') inPre = true;
                    if (n.nodeName === 'CODE') inCode = true;
                    n = n.parentNode;
                }

                if (inPre) {
                    // Exit block code
                    document.execCommand('formatBlock', false, 'p');
                } else if (inCode) {
                    // Try to remove inline code (removeFormat works reasonably well in modern browsers)
                    document.execCommand('removeFormat', false, null);
                } else {
                    if (selectedText.includes('\n')) {
                        document.execCommand('formatBlock', false, 'pre');
                    } else if (selectedText) {
                        const codeElem = document.createElement('code');
                        codeElem.textContent = selectedText;
                        range.deleteContents();
                        range.insertNode(codeElem);
                        // Move cursor after
                        range.setStartAfter(codeElem);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        // Insert zero width space to ensure typing after it isn't pink
                        const zws = document.createTextNode('\u200B');
                        range.insertNode(zws);
                        range.setStartAfter(zws);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        // Insert an empty code line and allow user to type
                        document.execCommand('formatBlock', false, 'pre');
                        document.execCommand('insertText', false, ' '); // add a space to avoid collapsing
                    }
                }
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
        updateToolbarState();
        editor.focus();
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
            // Get markdown first
            const markdownText = htmlToMarkdown(editorContent.innerHTML);

            // Parse with marked.js just like the post page
            let html = marked.parse(markdownText, {
                sanitize: false,
                gfm: true,
                breaks: true
            });

            // Apply custom image rendering logic from post.html
            html = html.replace(/<img src="([^"]*)" alt="([^"]*)"[^>]*>/g, function (match, src, alt) {
                const filename = src.split('/').pop().split('.')[0];
                if (alt && alt.trim() && alt !== filename) {
                    return `<figure style="text-align: center; margin: 2em 0;">
                        <img src="${src}" alt="" style="max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 0 auto;">
                        <figcaption style="font-size: 14px; color: var(--muted); font-style: italic; text-align: center; margin-top: 8px;">${alt}</figcaption>
                    </figure>`;
                } else {
                    return `<figure style="text-align: center; margin: 2em 0;">
                        <img src="${src}" alt="" style="max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 0 auto;">
                    </figure>`;
                }
            });

            previewContent.innerHTML = html;
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

// HTML to Markdown conversion — DOM-based for correct element ordering
function htmlToMarkdown(html) {
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // First: normalize — split block parents around any nested <figure>
        const figures = tempDiv.querySelectorAll('figure');
        figures.forEach(fig => {
            const blockTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'BLOCKQUOTE'];
            let parent = fig.parentNode;

            while (parent && parent !== tempDiv && blockTags.includes(parent.tagName)) {
                // Extract everything after the figure into a fragment
                const range = document.createRange();
                range.setStartAfter(fig);
                range.setEnd(parent, parent.childNodes.length);
                const afterFragment = range.extractContents();

                const grandParent = parent.parentNode;
                if (!grandParent) break;

                // Move figure out of parent, right after parent
                grandParent.insertBefore(fig, parent.nextSibling);

                // If there's content after the figure, wrap it in a clone of the parent tag
                if (afterFragment.textContent.trim() || afterFragment.querySelector('img, figure, br')) {
                    const afterClone = parent.cloneNode(false);
                    afterClone.appendChild(afterFragment);
                    grandParent.insertBefore(afterClone, fig.nextSibling);
                }

                // Remove original parent if it's now empty
                if (!parent.textContent.trim() && !parent.querySelector('img, figure')) {
                    parent.remove();
                }

                parent = fig.parentNode;
            }
        });

        function getInlineMarkdown(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return '';

            const tag = node.tagName;
            const inner = Array.from(node.childNodes).map(getInlineMarkdown).join('');

            // Helper: check if we need a leading space to separate from previous sibling
            function needsLeadingSpace() {
                const prev = node.previousSibling;
                if (!prev) return false;
                // If previous sibling is a text node ending with whitespace, no space needed
                if (prev.nodeType === Node.TEXT_NODE) {
                    return prev.textContent.length > 0 && !/\s$/.test(prev.textContent);
                }
                // If previous sibling is an inline element, we need space
                if (prev.nodeType === Node.ELEMENT_NODE) {
                    return true;
                }
                return false;
            }

            const prefix = needsLeadingSpace() ? ' ' : '';

            switch (tag) {
                case 'STRONG': case 'B': return inner.trim() ? `${prefix}**${inner.trim()}**` : '';
                case 'EM': case 'I': return inner.trim() ? `${prefix}*${inner.trim()}*` : '';
                case 'U': return inner.trim() ? `${prefix}<u>${inner.trim()}</u>` : '';
                case 'S': case 'STRIKE': case 'DEL': return inner.trim() ? `${prefix}~~${inner.trim()}~~` : '';
                case 'CODE': {
                    let code = node.textContent;
                    code = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                    return `${prefix}\`` + code + '`';
                }
                case 'A': {
                    const href = node.getAttribute('href') || '';
                    return `${prefix}[${inner}](${href})`;
                }
                case 'BR': return '\n';
                case 'IMG': {
                    const src = node.getAttribute('src') || '';
                    const alt = node.getAttribute('alt') || src.split('/').pop().split('.')[0];
                    return `![${alt}](${src})`;
                }
                default: return inner;
            }
        }

        // Inline tag set — these should never produce paragraph breaks
        const INLINE_TAGS = new Set(['STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'DEL', 'A', 'CODE', 'SPAN', 'SUB', 'SUP', 'MARK', 'SMALL', 'ABBR']);

        function processNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (!text) return '';
                // Check if this text node is adjacent to inline siblings
                const hasInlineSibling = (node.previousSibling && node.previousSibling.nodeType === Node.ELEMENT_NODE && INLINE_TAGS.has(node.previousSibling.tagName)) ||
                    (node.nextSibling && node.nextSibling.nodeType === Node.ELEMENT_NODE && INLINE_TAGS.has(node.nextSibling.tagName));
                if (hasInlineSibling) {
                    return node.textContent; // Keep raw text, no paragraph break
                }
                return text + '\n\n';
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return '';

            const tag = node.tagName;

            // Inline elements at top level — use getInlineMarkdown (no paragraph break)
            if (INLINE_TAGS.has(tag)) {
                const md = getInlineMarkdown(node);
                // Check if next sibling is also inline or text — if so, don't add paragraph break
                const next = node.nextSibling;
                const nextIsInline = next && ((next.nodeType === Node.TEXT_NODE && next.textContent.trim()) ||
                    (next.nodeType === Node.ELEMENT_NODE && INLINE_TAGS.has(next.tagName)));
                return nextIsInline ? md : (md ? md + '\n\n' : '');
            }

            // --- Block elements ---

            // Headings
            if (/^H[1-6]$/.test(tag)) {
                const level = tag[1];
                const prefix = '#'.repeat(parseInt(level));
                const inner = Array.from(node.childNodes).map(getInlineMarkdown).join('').trim();
                if (!inner) return '';
                return `${prefix} ${inner}\n\n`;
            }

            // Figure (image container)
            if (tag === 'FIGURE') {
                const img = node.querySelector('img');
                if (!img) return '';
                const src = img.getAttribute('src') || '';
                const alt = img.getAttribute('alt') || '';
                const figcaption = node.querySelector('figcaption');
                let caption = figcaption ? figcaption.textContent.trim() : '';
                // Skip placeholder captions
                const placeholders = ['görsel açıklaması', 'görsel açıklaması ekleyin', 'image caption', 'görsel açıklaması...'];
                if (caption && placeholders.includes(caption.toLowerCase())) {
                    caption = '';
                }
                // Use caption for alt text, fallback to alt, fallback to filename
                const imageText = caption || alt || src.split('/').pop().split('.')[0];
                return `![${imageText}](${src})\n\n`;
            }

            // Standalone image
            if (tag === 'IMG') {
                const src = node.getAttribute('src') || '';
                const alt = node.getAttribute('alt') || src.split('/').pop().split('.')[0];
                return `![${alt}](${src})\n\n`;
            }

            // Horizontal rule
            if (tag === 'HR') return '---\n\n';

            // Code blocks
            if (tag === 'PRE') {
                const codeEl = node.querySelector('code');
                let code = codeEl ? codeEl.textContent : node.textContent;
                code = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                return '```\n' + code + '\n```\n\n';
            }

            // Blockquote
            if (tag === 'BLOCKQUOTE') {
                const inner = Array.from(node.childNodes).map(processNode).join('').trim();
                const lines = inner.split('\n');
                return lines.map(line => '> ' + line).join('\n') + '\n\n';
            }

            // Unordered list
            if (tag === 'UL') {
                const items = node.querySelectorAll(':scope > li');
                let result = '';
                items.forEach(li => {
                    const inner = Array.from(li.childNodes).map(getInlineMarkdown).join('').trim();
                    result += `- ${inner}\n\n`;
                });
                return result;
            }

            // Ordered list
            if (tag === 'OL') {
                const items = node.querySelectorAll(':scope > li');
                let result = '';
                let counter = 1;
                items.forEach(li => {
                    const inner = Array.from(li.childNodes).map(getInlineMarkdown).join('').trim();
                    result += `${counter++}. ${inner}\n\n`;
                });
                return result;
            }

            // Paragraph
            if (tag === 'P') {
                const inner = Array.from(node.childNodes).map(getInlineMarkdown).join('').trim();
                if (!inner) return '';
                return inner + '\n\n';
            }

            // Table
            if (tag === 'TABLE') {
                let result = '';
                const rows = node.querySelectorAll('tr');
                rows.forEach((row, ri) => {
                    const cells = row.querySelectorAll('th, td');
                    const cellTexts = Array.from(cells).map(c => c.textContent.trim());
                    result += '| ' + cellTexts.join(' | ') + ' |\n';
                    if (ri === 0) {
                        result += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
                    }
                });
                return result + '\n';
            }

            // DIV — treat as a container, process children  
            if (tag === 'DIV') {
                // Check if it's an image container div
                const img = node.querySelector('img');
                if (img && node.style.textAlign === 'center') {
                    const src = img.getAttribute('src') || '';
                    const alt = img.getAttribute('alt') || '';
                    const pCaption = node.querySelector('p');
                    const caption = pCaption ? pCaption.textContent.trim() : '';
                    const imageText = caption || alt || src.split('/').pop().split('.')[0];
                    return `![${imageText}](${src})\n\n`;
                }
                return Array.from(node.childNodes).map(processNode).join('');
            }

            // FIGCAPTION — skip (handled by FIGURE)
            if (tag === 'FIGCAPTION') return '';

            // BR
            if (tag === 'BR') return '\n';

            // Default: process children
            return Array.from(node.childNodes).map(processNode).join('');
        }

        // Process all top-level children in order
        let markdown = Array.from(tempDiv.childNodes).map(processNode).join('');

        // Decode remaining HTML entities
        markdown = markdown
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // Clean up excessive newlines
        markdown = markdown
            .replace(/\n{3,}/g, '\n\n')
            .trim();

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
        const url = isEditMode ? `${API_BASE_URL}/posts/${editSlug}` : `${API_BASE_URL}/posts`;
        const method = isEditMode ? 'PUT' : 'POST';

        console.log('Token exists:', !!token);
        console.log('Submitting to:', url);
        console.log('Method:', method);
        console.log('Edit mode:', isEditMode);

        // In edit mode, preserve the existing post status; for new posts, default to draft
        const postStatus = isEditMode && editingPostStatus ? editingPostStatus : 'draft';

        const requestBody = {
            ...postData,
            content: content,
            status: postStatus
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

            // Trigger auto-tagging for images in this post
            const savedSlug = editSlug || (result.post && result.post.slug);
            if (savedSlug) {
                try {
                    await fetch(`${API_BASE_URL}/posts/${savedSlug}/tag-images`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                        }
                    });
                    console.log('Images tagged successfully for post:', savedSlug);
                } catch (tagErr) {
                    console.error('Failed to tag images, but post was saved:', tagErr);
                }
            }

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
    // Get cover photo URL from the hero image — extract relative path only
    const heroImg = document.getElementById('heroImg');
    let coverUrl = '';
    if (heroImg && heroImg.src && !heroImg.src.includes('placehold.co')) {
        try {
            // heroImg.src returns full URL (e.g. http://localhost:3000/images/blog-covers/photo.jpg)
            // We need only the relative path: images/blog-covers/photo.jpg
            const url = new URL(heroImg.src);
            coverUrl = url.pathname.replace(/^\//, ''); // Remove leading slash
        } catch (e) {
            // If URL parsing fails, try getAttribute which returns the raw value
            coverUrl = heroImg.getAttribute('src') || '';
            if (coverUrl.startsWith('/')) coverUrl = coverUrl.substring(1);
        }
    }

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
        switch (e.key) {
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
async function loadCoverGallery() {
    const folderSelect = document.getElementById('coverGalleryFolderSelect');
    const galleryGrid = document.getElementById('coverGalleryGrid');
    const selectedFolder = folderSelect.value;

    // Clear existing images
    galleryGrid.innerHTML = '<div class="gallery-loading">Galeri yükleniyor...</div>';

    try {
        // Fetch from API
        const response = await fetch(`/api/gallery/${selectedFolder === 'all' ? 'blog-covers' : selectedFolder}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Galeriyi yüklerken hata oluştu: ' + response.status);
        }

        const data = await response.json();
        const apiImages = data.images || [];

        // Also get cached images for newly uploaded ones that might not be available from API immediately (though usually they are)
        const cachedImages = galleryCache[selectedFolder] || [];

        // Merge API logic with cache logic securely
        const allImages = [...apiImages.map(imgData => ({
            name: imgData.originalName || imgData.filename,
            url: `../${imgData.url}`,
            folder: imgData.folder,
            isNew: false
        }))];

        // Add cached images that aren't already in the API response (based on URL)
        cachedImages.forEach(cachedImg => {
            if (!allImages.some(img => img.url === cachedImg.url)) {
                allImages.unshift(cachedImg); // Put new ones at the beginning
            }
        });

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
            galleryItem.onclick = (e) => selectCoverImage(image, e);

            galleryItem.innerHTML = `
                <img src="${image.url}" alt="${image.name}" loading="lazy">
                <div class="item-name">${image.name}</div>
            `;

            galleryGrid.appendChild(galleryItem);
        });

    } catch (error) {
        console.error('Error loading cover gallery:', error);
        galleryGrid.innerHTML = '<div class="gallery-error">Galeri yüklenirken hata oluştu.</div>';
    }
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
    reader.onload = function (e) {
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

        // Send post title for meaningful filename generation
        const postTitleEl = document.getElementById('postTitle');
        if (postTitleEl && postTitleEl.textContent.trim()) {
            formData.append('postTitle', postTitleEl.textContent.trim());
        }

        // Send postSlug for automatic image tagging
        const { slug } = getPostData();
        const editSlug = new URLSearchParams(window.location.search).get('edit');
        const activeSlug = editSlug || slug;
        if (activeSlug) {
            formData.append('postSlug', activeSlug);
        }

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
            modal.classList.add('active');
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
let currentProFolder = 'blog-content'; // New global state for selected folder
let selectedImage = null;
let uploadedImage = null;
let isCoverPhotoModal = false; // Track if modal is opened for cover photo selection
let savedCursorElement = null; // Save cursor element when modal opens
let savedCursorOffset = null; // Save cursor offset when modal opens

// Open image insert modal
function openImageModal() {
    try {
        isCoverPhotoModal = false;

        // Reset saved cursor
        savedCursorElement = null;
        savedCursorOffset = null;

        // Only save cursor if it's actually inside the editor
        const editor = document.getElementById('editorContent');
        const selection = window.getSelection();
        if (editor && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let node = range.startContainer;
            let insideEditor = false;
            while (node) {
                if (node === editor) { insideEditor = true; break; }
                node = node.parentNode;
            }
            if (insideEditor) {
                savedCursorElement = range.startContainer;
                savedCursorOffset = range.startOffset;
                console.log('Cursor saved inside editor');
            } else {
                console.log('Cursor was NOT inside editor, will append to end');
            }
        }

        const modal = document.getElementById('imageInsertModal');
        if (modal) {
            modal.classList.add('active');
            resetImageModal();
            setProMode('gallery', 'blog-content'); // Default Mode
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
            modal.classList.remove('active');
            resetImageModal();
        }
        savedCursorElement = null;
        savedCursorOffset = null;
    } catch (error) {
        console.error('Error closing image modal:', error);
    }
}

// Reset image modal to initial state
function resetImageModal() {
    selectedImage = null;
    uploadedImage = null;

    // Reset right sidebar details
    const emptyState = document.getElementById('proEmptyDetails');
    const contentState = document.getElementById('proImageDetails');
    if (emptyState) emptyState.classList.add('active');
    if (contentState) contentState.classList.remove('active');

    // Disable insert button
    const insertBtn = document.getElementById('insertImageBtn');
    if (insertBtn) insertBtn.disabled = true;

    // Clear description input
    const descInput = document.getElementById('imageDescription');
    if (descInput) descInput.value = '';

    // Clear selections in grid
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.classList.remove('selected');
    });

    isCoverPhotoModal = false;
}

// Set Pro Mode (Grid vs Upload & Folder Selection)
function setProMode(mode, folder) {
    try {
        currentImageMode = mode;
        if (folder) currentProFolder = folder;

        // 1. Update Navigation Button Active States
        document.querySelectorAll('.pro-nav-btn').forEach(btn => btn.classList.remove('active'));

        if (mode === 'upload') {
            document.getElementById('navUploadBtn').classList.add('active');
            document.getElementById('proGalleryGrid').classList.remove('active');
            document.getElementById('proUploadArea').classList.add('active');
        } else if (mode === 'gallery') {
            document.getElementById('proUploadArea').classList.remove('active');
            document.getElementById('proGalleryGrid').classList.add('active');

            // Activate specific folder button
            if (folder === 'blog-content') document.getElementById('navBlogContentBtn').classList.add('active');
            if (folder === 'blog-covers') document.getElementById('navBlogCoversBtn').classList.add('active');
            if (folder === 'profile') document.getElementById('navProfileBtn').classList.add('active');
            if (folder === 'system') document.getElementById('navSystemBtn').classList.add('active');

            // Load gallery
            loadProGallery(folder);
        }

    } catch (error) {
        console.error('Error setting pro mode:', error);
    }
}

// Load Gallery Images (Pro)
async function loadProGallery(folder) {
    try {
        const galleryGrid = document.getElementById('proGalleryGrid');
        if (!galleryGrid) return;

        galleryGrid.innerHTML = '<div style="padding: 20px; color: var(--muted); text-align: center; grid-column: 1 / -1;">Yükleniyor...</div>';

        const response = await fetch(`/api/gallery/${folder}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });

        if (!response.ok) throw new Error('Hata: ' + response.status);

        const data = await response.json();
        const images = data.images || [];

        if (images.length === 0) {
            galleryGrid.innerHTML = '<div style="padding: 20px; color: var(--muted); text-align: center; grid-column: 1 / -1;">Bu klasörde resim bulunamadı.</div>';
            return;
        }

        galleryGrid.innerHTML = '';
        images.forEach(imgData => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';

            const url = `../${imgData.url}`;
            const image = {
                name: imgData.originalName || imgData.filename,
                url: url,
                folder: imgData.folder
            };

            galleryItem.onclick = (e) => selectGalleryImage(image, e);

            galleryItem.innerHTML = `<img src="${url}" alt="${image.name}" loading="lazy">`;
            galleryGrid.appendChild(galleryItem);
        });

    } catch (error) {
        console.error('Error loading gallery images:', error);
        if (document.getElementById('proGalleryGrid')) {
            document.getElementById('proGalleryGrid').innerHTML = '<div style="padding: 20px; color: var(--red); grid-column: 1 / -1;">Galeri yüklenirken hata oluştu.</div>';
        }
    }
}

// Deprecated/Replaced SetImageMode for backwards compatibility (in case anything else calls it)
function setImageMode(mode) {
    setProMode(mode, currentProFolder);
}

function loadGalleryImages() {
    // Deprecated. Do nothing, handled by setProMode.
}

// Select gallery image
function selectGalleryImage(image, event) {
    try {
        // Clear all selections
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.classList.remove('selected');
        });

        if (event && event.currentTarget) {
            event.currentTarget.classList.add('selected');
        }

        // Set state
        selectedImage = image;
        uploadedImage = null; // Clear any pending upload

        showSimpleImagePreview(image);
        document.getElementById('insertImageBtn').disabled = false;
    } catch (error) {
        console.error('Error selecting gallery image:', error);
    }
}

// Show Image Details in Right Sidebar
function showSimpleImagePreview(image) {
    try {
        const emptyState = document.getElementById('proEmptyDetails');
        const contentState = document.getElementById('proImageDetails');

        const previewImg = document.getElementById('previewImage');
        const previewBlur = document.getElementById('previewImageBlur');
        const metaName = document.getElementById('proMetaName');
        const descInput = document.getElementById('imageDescription');

        // Setup Right Sidebar Data
        if (previewImg) previewImg.src = image.url;
        if (previewBlur) previewBlur.src = image.url;
        if (metaName) metaName.textContent = image.name;
        if (descInput) descInput.value = image.name;

        // Toggle Views
        if (emptyState) emptyState.classList.remove('active');
        if (contentState) contentState.classList.add('active');

    } catch (error) {
        console.error('Error showing image details:', error);
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

// Handle file upload selection
async function handleFileUpload(files) {
    try {
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!file.type.startsWith('image/')) {
            alert('Lütfen sadece resim dosyası seçin.');
            return;
        }

        // Clear previous gallery selection
        selectedImage = null;
        document.querySelectorAll('.gallery-item').forEach(item => item.classList.remove('selected'));

        // Use FileReader for preview to be more robust than blob URLs in some contexts
        const reader = new FileReader();
        reader.onload = function (e) {
            uploadedImage = {
                name: file.name,
                url: e.target.result,
                file: file,
                size: formatFileSize(file.size),
                isPendingUpload: true
            };

            showSimpleImagePreview(uploadedImage);

            const insertBtn = document.getElementById('insertImageBtn');
            if (insertBtn) {
                insertBtn.disabled = false;
                insertBtn.textContent = 'Görseli Ekle';
            }
        };
        reader.readAsDataURL(file);

    } catch (error) {
        console.error('Error handling file selection:', error);
        alert('Görsel seçilirken bir sorun oluştu. Lütfen tekrar deneyin.');
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
async function insertSelectedImage() {
    try {
        console.log('=== INSERT IMAGE DEBUG ===');

        let image = selectedImage || uploadedImage;
        if (!image) {
            console.log('No image selected');
            alert('Lütfen bir görsel seçin!');
            return;
        }

        const insertBtn = document.getElementById('insertImageBtn');
        const originalBtnText = insertBtn ? insertBtn.textContent : 'Görseli Ekle';

        // Check if the image needs to be uploaded first
        if (image.isPendingUpload) {
            if (insertBtn) {
                insertBtn.disabled = true;
                insertBtn.textContent = 'Sunucuya Yükleniyor...';
            }

            try {
                const formData = new FormData();
                formData.append('image', image.file);

                const targetFolder = currentProFolder;
                formData.append('folder', targetFolder);

                // Send post title for meaningful filename generation
                const postTitleEl = document.getElementById('postTitle');
                if (postTitleEl && postTitleEl.textContent.trim()) {
                    formData.append('postTitle', postTitleEl.textContent.trim());
                }

                // Send postSlug for automatic image tagging
                const { slug } = getPostData();
                const editSlug = new URLSearchParams(window.location.search).get('edit');
                const activeSlug = editSlug || slug;
                if (activeSlug) {
                    formData.append('postSlug', activeSlug);
                }

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error('Yükleme başarısız: ' + response.status + ' ' + errorText);
                }

                const result = await response.json();

                // Update image object with server URL
                image.url = `../${result.url}`;
                image.isPendingUpload = false;

            } catch (error) {
                console.error('Error during delayed file upload:', error);
                alert('Görsel sunucuya yüklenirken hata oluştu. Lütfen tekrar deneyin.');
                if (insertBtn) {
                    insertBtn.disabled = false;
                    insertBtn.textContent = originalBtnText;
                }
                return;
            }
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

        // Create simple image container (figure instead of div)
        const imageContainer = document.createElement('figure');
        imageContainer.style.margin = '2em 0';
        imageContainer.style.textAlign = 'center';
        imageContainer.style.display = 'block';

        // Create image element
        const img = document.createElement('img');
        img.src = image.url;
        img.alt = image.name; // Alt'ta sadece dosya adı
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = 'var(--radius, 6px)';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        img.style.boxShadow = 'var(--shadow, none)';

        // Add image to container
        imageContainer.appendChild(img);

        // ALWAYS add caption for blog content images
        const caption = document.createElement('figcaption');
        caption.textContent = description; // Uses user input or fallback name
        caption.className = 'image-caption'; // Use a specific class for styling
        caption.contentEditable = "true"; // Allow editing caption directly
        caption.setAttribute('placeholder', 'Görsel açıklaması girin...');

        // Focus the caption if it's just the default name
        caption.onclick = function () {
            if (this.textContent === image.name) {
                // Optional: clear on first click if desired
            }
        };

        imageContainer.appendChild(caption);

        // Insert image directly into editor - SAFE INSERTION
        const editor = document.getElementById('editorContent');
        if (!editor) {
            console.error('CRITICAL: Editor element not found!');
            alert('Editör bulunamadı!');
            return;
        }

        // Helper: check if a node is inside the editor
        function isInsideEditor(node) {
            let current = node;
            while (current) {
                if (current === editor) return true;
                current = current.parentNode;
            }
            return false;
        }

        // Helper: Promote figure out of any inline/block parent so it's a direct child of editor
        // This prevents <figure> from being nested inside <h1>, <p>, <li>, etc.
        function promoteFigure(figure) {
            const blockTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'BLOCKQUOTE', 'SPAN', 'A', 'STRONG', 'EM', 'B', 'I', 'U'];
            let parent = figure.parentNode;

            // Keep promoting until parent is the editor itself
            while (parent && parent !== editor && blockTags.includes(parent.tagName)) {
                // Split: move everything after figure into a clone of the parent
                const afterContent = document.createRange();
                afterContent.setStartAfter(figure);
                afterContent.setEnd(parent, parent.childNodes.length);
                const afterFragment = afterContent.extractContents();

                // Only create the "after" clone if it has real content
                const afterText = afterFragment.textContent.trim();
                let afterClone = null;
                if (afterText || afterFragment.querySelector('img, figure, br')) {
                    afterClone = parent.cloneNode(false);
                    afterClone.appendChild(afterFragment);
                }

                // Remove figure from parent
                parent.removeChild(figure);

                // Insert figure after parent
                const grandParent = parent.parentNode;
                if (grandParent) {
                    grandParent.insertBefore(figure, parent.nextSibling);
                    // Insert afterClone after figure
                    if (afterClone) {
                        grandParent.insertBefore(afterClone, figure.nextSibling);
                    }
                }

                // Remove empty parent if it has no meaningful text
                if (parent.textContent.trim() === '' && !parent.querySelector('img, figure')) {
                    if (parent.parentNode) parent.parentNode.removeChild(parent);
                }

                parent = figure.parentNode;
            }
        }

        // Determine a safe insertion point
        let inserted = false;

        // Strategy 1: Use saved cursor position IF it's inside the editor
        if (savedCursorElement && savedCursorOffset !== null && isInsideEditor(savedCursorElement)) {
            try {
                const range = document.createRange();
                range.setStart(savedCursorElement, savedCursorOffset);
                range.setEnd(savedCursorElement, savedCursorOffset);
                range.deleteContents();
                range.insertNode(imageContainer);

                // Promote figure out of any block parent
                promoteFigure(imageContainer);

                // Move cursor after
                const newRange = document.createRange();
                newRange.setStartAfter(imageContainer);
                newRange.collapse(true);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(newRange);
                inserted = true;
                console.log('Image inserted at saved cursor position (inside editor)');
            } catch (e) {
                console.warn('Saved cursor insertion failed:', e);
            }
        }

        // Strategy 2: Try current selection if it's inside the editor
        if (!inserted) {
            editor.focus();
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (isInsideEditor(range.startContainer)) {
                    try {
                        range.deleteContents();
                        range.insertNode(imageContainer);

                        // Promote figure out of any block parent
                        promoteFigure(imageContainer);

                        const newRange = document.createRange();
                        newRange.setStartAfter(imageContainer);
                        newRange.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                        inserted = true;
                        console.log('Image inserted at current cursor position (inside editor)');
                    } catch (e) {
                        console.warn('Current selection insertion failed:', e);
                    }
                }
            }
        }

        // Strategy 3: SAFE FALLBACK - always append to end of editor
        if (!inserted) {
            editor.appendChild(imageContainer);
            inserted = true;
            console.log('Image appended to end of editor (safe fallback)');
        }

        // Add spacing after the image
        const spacer = document.createElement('p');
        spacer.innerHTML = '<br>';
        if (imageContainer.nextSibling) {
            imageContainer.parentNode.insertBefore(spacer, imageContainer.nextSibling);
        } else if (imageContainer.parentNode) {
            imageContainer.parentNode.appendChild(spacer);
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
        // File input change
        const fileInput = document.getElementById('imageFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                handleFileUpload(e.target.files);
            });
        }

        // Drag and drop for Pro Media Modal
        const uploadArea = document.getElementById('proUploadArea'); // Fix ID
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

        // Click outside backdrop to close
        const modal = document.getElementById('imageInsertModal');
        const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;
        if (backdrop) {
            backdrop.addEventListener('click', closeImageModal);
        }

        // Ensure direct click on modal (not content) also closes it
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
setupEventListeners = function () {
    originalSetupEventListeners();
    setupImageModalListeners();
};

console.log('Script loaded successfully');

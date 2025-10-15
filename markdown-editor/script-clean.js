// Global variables
let currentViewMode = 'edit';

// Initialize editor
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== MARKDOWN EDITOR INITIALIZATION ===');
    
    const editorContent = document.getElementById('editorContent');
    
    // Focus on editor
    if (editorContent) {
        editorContent.focus();
        console.log('Editor focused successfully');
    }
    
    // Initialize theme
    initializeTheme();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update current date
    updateCurrentDate();
    
    // Update reading time
    updateReadingTime();
    
    // Set year
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    console.log('=== INITIALIZATION COMPLETE ===');
});

// Initialize theme
function initializeTheme() {
    try {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        console.log('Theme initialized:', savedTheme);
    } catch (error) {
        console.error('Theme initialization error:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    try {
        // Theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
            console.log('Theme toggle listener added');
        }
        
        // Editor content changes
        const editorContent = document.getElementById('editorContent');
        if (editorContent) {
            editorContent.addEventListener('input', updateReadingTime);
            editorContent.addEventListener('paste', () => {
                setTimeout(updateReadingTime, 100);
            });
            console.log('Editor event listeners added');
        }
        
        // Document title changes
        const documentTitle = document.getElementById('documentTitle');
        if (documentTitle) {
            documentTitle.addEventListener('input', updateReadingTime);
            console.log('Document title listener added');
        }
        
    } catch (error) {
        console.error('Event listener setup error:', error);
    }
}

// Theme toggle function
function toggleTheme() {
    try {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        console.log('Theme changed to:', newTheme);
    } catch (error) {
        console.error('Theme toggle error:', error);
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
                const imgUrl = prompt('Resim URL:');
                if (imgUrl) {
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.alt = 'Resim';
                    img.style.maxWidth = '100%';
                    range.insertNode(img);
                }
                break;
            case 'list':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'code':
                const code = document.createElement('pre');
                code.innerHTML = '<code>' + (selectedText || 'kod buraya') + '</code>';
                range.deleteContents();
                range.insertNode(code);
                break;
        }
        
        updateReadingTime();
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
            
            // Sync title
            const documentTitle = document.getElementById('documentTitle');
            const postTitle = document.getElementById('postTitle');
            if (documentTitle && postTitle) {
                const currentTitle = documentTitle.textContent.trim();
                if (currentTitle && currentTitle !== 'Yeni Blog Yazısı') {
                    postTitle.value = currentTitle;
                }
            }
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
        // HTML to Markdown conversion
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
            // Converting image with caption
            // Caption varsa onu kullan, yoksa alt'ı kullan
            const imageText = caption && caption.trim() ? caption : alt;
            return `![${imageText}](${src})\n\n`;
        });
        
        // Convert div containers with images but no captions
        markdown = markdown.replace(/<div[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi, function(match, src, alt) {
            // Converting image without caption
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
        const postData = getPostData();
        const content = htmlToMarkdown(document.getElementById('editorContent').innerHTML);
        
        if (!postData.title || !postData.slug || !content) {
            alert('Lütfen başlık, slug ve içerik alanlarını doldurun!');
            return;
        }
        
        const response = await fetch('http://localhost:3000/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({
                ...postData,
                content: content,
                status: 'draft'
            })
        });
        
        if (response.ok) {
            alert('Blog yazısı başarıyla taslak olarak kaydedildi!');
            window.location.href = '../admin/index.html';
        } else {
            alert('Kaydetme sırasında hata oluştu!');
        }
    } catch (error) {
        console.error('Submit post error:', error);
        alert('Kaydetme sırasında hata oluştu!');
    }
}

// Get post data from form
function getPostData() {
    return {
        title: document.getElementById('postTitle').value,
        slug: document.getElementById('postSlug').value,
        excerpt: document.getElementById('postExcerpt').value,
        date: document.getElementById('postDate').value,
        cover: document.getElementById('postCover').value,
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

console.log('Script loaded successfully');

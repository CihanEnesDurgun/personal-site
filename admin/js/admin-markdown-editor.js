/* ====== Admin Markdown Editor Module ====== */

// ====== Markdown Editor Functions ======
function formatText(type) {
  // Get the active editor (new post or edit post)
  let editor = document.getElementById('markdownEditor');
  if (!editor || !editor.contains(document.activeElement)) {
    editor = document.getElementById('editMarkdownEditor');
  }
  
  if (!editor) return;
  
  const selection = window.getSelection();
  
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const selectedText = range.toString();
  
  if (!selectedText && type !== 'list' && type !== 'orderedList' && type !== 'taskList' && type !== 'code' && type !== 'horizontalRule' && type !== 'table') {
    // If no text selected, insert placeholder
    let placeholder = '';
    switch(type) {
      case 'bold': placeholder = '**kalÄ±n metin**'; break;
      case 'italic': placeholder = '*italik metin*'; break;
      case 'h1': placeholder = '# BaÅŸlÄ±k 1'; break;
      case 'h2': placeholder = '## BaÅŸlÄ±k 2'; break;
      case 'h3': placeholder = '### BaÅŸlÄ±k 3'; break;
      case 'link': placeholder = '[link metni](URL)'; break;
      case 'image': placeholder = '![resim aÃ§Ä±klamasÄ±](resim-url)'; break;
      case 'code': placeholder = '```\nkod bloÄŸu\n```'; break;
      case 'list': placeholder = '- liste Ã¶ÄŸesi'; break;
      case 'blockquote': placeholder = '> alÄ±ntÄ± metni'; break;
    }
    
    const textNode = document.createTextNode(placeholder);
    range.insertNode(textNode);
    range.selectNodeContents(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }
  
  switch(type) {
    case 'bold':
      insertMarkdown(editor, '**', '**', selectedText);
      break;
    case 'italic':
      insertMarkdown(editor, '*', '*', selectedText);
      break;
    case 'h1':
      insertMarkdown(editor, '# ', '', selectedText);
      break;
    case 'h2':
      insertMarkdown(editor, '## ', '', selectedText);
      break;
    case 'h3':
      insertMarkdown(editor, '### ', '', selectedText);
      break;
    case 'link':
      const url = prompt('Link URL\'sini girin:');
      if (url) {
        insertMarkdown(editor, '[', `](${url})`, selectedText);
      }
      break;
    case 'image':
      const imgUrl = prompt('Resim URL\'sini girin:');
      if (imgUrl) {
        insertMarkdown(editor, '![', `](${imgUrl})`, selectedText);
      }
      break;
    case 'code':
      insertMarkdown(editor, '```\n', '\n```', selectedText);
      break;
    case 'list':
      insertMarkdown(editor, '- ', '', selectedText);
      break;
    case 'blockquote':
      insertMarkdown(editor, '> ', '', selectedText);
      break;
  }
}

function insertMarkdown(editor, before, after, selectedText) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  
  const markdownText = before + selectedText + after;
  const textNode = document.createTextNode(markdownText);
  
  range.deleteContents();
  range.insertNode(textNode);
  
  // Update hidden textarea
  updateHiddenTextarea(editor);
}

function updateHiddenTextarea(editor) {
  const editorId = editor.id;
  const textareaId = editorId === 'markdownEditor' ? 'postContent' : 'editPostContent';
  const textarea = document.getElementById(textareaId);
  
  if (textarea) {
    textarea.value = editor.innerText;
  }
}

// Initialize markdown editors
function initMarkdownEditors() {
  // Get all markdown editors
  const editors = document.querySelectorAll('#markdownEditor, #editMarkdownEditor');
  
  editors.forEach(editor => {
    // Add input event listeners
    editor.addEventListener('input', () => {
      const editorId = editor.id;
      updateHiddenTextarea(editorId);
    });
    
    // Add paste event listener
    editor.addEventListener('paste', (e) => {
      setTimeout(() => {
        const editorId = editor.id;
        updateHiddenTextarea(editorId);
      }, 10);
    });
  });
  
  console.log('✅ Markdown editors initialized');
}

// Make functions globally available
if (typeof window !== 'undefined') {
  window.formatText = formatText;
  window.insertMarkdown = insertMarkdown;
  window.updateHiddenTextarea = updateHiddenTextarea;
  window.initMarkdownEditors = initMarkdownEditors;
}

console.log('📦 Admin Markdown Editor Module loaded');

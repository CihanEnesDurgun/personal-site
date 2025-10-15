/* ====== Admin Modal Manager Module ====== */

// ====== Modal Management ======
class ModalManager {
  constructor() {
    this.activeModal = null;
    this.init();
  }
  
  init() {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target.id);
      }
    });
    
    // Close modals with close button
    window.$$('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) this.closeModal(modal.id);
      });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModal(this.activeModal);
      }
    });
  }
  
  openModal(modalId) {
    const modal = window.$(`#${modalId}`);
    if (modal) {
      // Store the element that had focus before opening modal
      this.previousFocus = document.activeElement;
      
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      this.activeModal = modalId;
      document.body.style.overflow = 'hidden';
      
      // Focus the first focusable element in the modal
      const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }
  
  closeModal(modalId) {
    const modal = window.$(`#${modalId}`);
    if (modal) {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      this.activeModal = null;
      document.body.style.overflow = '';
      
      // Return focus to the previous element
      if (this.previousFocus && this.previousFocus.focus) {
        this.previousFocus.focus();
      }
    }
  }
}

// Make ModalManager globally available
if (typeof window !== 'undefined') {
  window.ModalManager = ModalManager;
}

console.log('📦 Admin Modal Manager Module loaded');

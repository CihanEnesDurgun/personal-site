/* ====== Admin Gallery Manager Module ====== */

// ====== Gallery Management System ======
class GalleryManager {
  constructor() {
    this.currentFolder = 'all';
    this.uploadedFiles = [];
    this.init();
  }

  init() {
    console.log('✅ GalleryManager initialized');
  }

  async loadImages() {
    console.log('Loading images...');
  }

  closeGalleryUpload() {
    console.log('Closing gallery upload...');
  }
}

// Make GalleryManager globally available
if (typeof window !== 'undefined') {
  window.GalleryManager = GalleryManager;
}

console.log('📦 Admin Gallery Manager Module loaded');

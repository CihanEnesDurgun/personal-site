// meta-tags.js
//
// Yazi ve proje sayfalarinin icerigi JS ile dolduruluyor; sekme basligi ve meta
// etiketleri de bu yuzden calisma aninda yazilmali. Yapilmazsa tum yazilar ayni
// statik basligi ("Yazı • Cihan Enes Durgun") paylasir; yer imleri, tarayici gecmisi
// ve arama sonuclari hangi yazi oldugunu gostermez.
//
// SINIR: Sosyal medya kazicilari (LinkedIn, X, Facebook) sayfayi JS calistirmadan
// okur, dolayisiyla buradaki og:/twitter: etiketlerini GORMEZ. Zengin paylasim
// onizlemesi icin sunucu tarafinda render (veya paylasim icin ozel bir endpoint)
// gerekir. Bu dosya tarayici ve JS calistiran arama motorlari icin dogru veriyi saglar.

(function (window) {
  'use strict';

  function setMetaTag(selector, value) {
    if (!value) return;
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      const match = selector.match(/meta\[(name|property)="([^"]+)"\]/);
      if (!match) return;
      el.setAttribute(match[1], match[2]);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }

  /**
   * Sekme basligini ve paylasim meta etiketlerini gunceller.
   * @param {{title: string, excerpt?: string, summary?: string, cover?: string}} item
   * @param {'article'|'website'} ogType
   */
  function applyPageMeta(item, ogType) {
    if (!item || !item.title) return;

    const ozet = item.excerpt || item.summary || '';
    const url = window.location.href;
    const gorsel = item.cover ? new URL(item.cover, window.location.origin).href : null;

    document.title = `${item.title} • Cihan Enes Durgun`;

    setMetaTag('meta[name="description"]', ozet);
    setMetaTag('meta[property="og:title"]', item.title);
    setMetaTag('meta[property="og:description"]', ozet);
    setMetaTag('meta[property="og:type"]', ogType || 'article');
    setMetaTag('meta[property="og:url"]', url);
    setMetaTag('meta[property="og:image"]', gorsel);
    setMetaTag('meta[name="twitter:card"]', gorsel ? 'summary_large_image' : 'summary');
    setMetaTag('meta[name="twitter:title"]', item.title);
    setMetaTag('meta[name="twitter:description"]', ozet);
    setMetaTag('meta[name="twitter:image"]', gorsel);
  }

  window.applyPageMeta = applyPageMeta;
})(window);

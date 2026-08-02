// Mobil menü: dar ekranlarda pill-nav'ı hamburger düğmesiyle açılan menüye çevirir.
// JS yüklenmezse topbar mevcut haliyle kalır (aşamalı iyileştirme).
(function () {
  'use strict';

  function init() {
    var topbar = document.querySelector('.topbar');
    var row = topbar && topbar.querySelector('.topbar-row');
    var nav = topbar && topbar.querySelector('.pill-nav');
    if (!topbar || !row || !nav) return;

    if (!nav.id) nav.id = 'pillNav';

    var btn = document.createElement('button');
    btn.className = 'menu-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Menüyü aç');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', nav.id);
    btn.innerHTML =
      '<svg class="icon-menu" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
      '<svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg>';
    row.insertBefore(btn, nav);
    topbar.classList.add('js-nav');

    function isOpen() {
      return topbar.classList.contains('nav-open');
    }

    function setOpen(open) {
      topbar.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!isOpen());
    });

    // Menüdeki bir linke dokununca menüyü kapat
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // Menü dışına dokununca kapat
    document.addEventListener('click', function (e) {
      if (isOpen() && !topbar.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        setOpen(false);
        btn.focus();
      }
    });

    // Masaüstü genişliğine dönülürse menüyü sıfırla
    var mq = window.matchMedia('(min-width: 680px)');
    var onChange = function (m) {
      if (m.matches) setOpen(false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

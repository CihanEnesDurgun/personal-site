/**
 * Merkezi Versiyon Yönetimi
 * Versiyonu değiştirmek için sadece aşağıdaki satırı düzenleyin.
 * Bu dosya hem server.js (Node.js) hem de tarayıcı tarafından kullanılır.
 */
const APP_VERSION = 'v0.1.10.cla';

// ====== Node.js Export ======
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_VERSION };
}

// ====== Tarayıcı: Otomatik Versiyon Güncelleme ======
if (typeof window !== 'undefined') {
    (function () {
        'use strict';

        function updateVersionElements(version) {
            const selectors = ['.version-info', '.version-badge'];
            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.textContent = version;
                });
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => updateVersionElements(APP_VERSION));
        } else {
            updateVersionElements(APP_VERSION);
        }
    })();
}

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');

console.log('🧹 Başlatılıyor: Log dosyası temizleme işlemi...');

if (!fs.existsSync(logsDir)) {
    console.log('✅ logs/ klasörü bulunamadı. Temizlenecek bir şey yok.');
    process.exit(0);
}

try {
    const files = fs.readdirSync(logsDir);
    let deletedCount = 0;

    for (const file of files) {
        // Sadece .log ve eski .json uzantılı log dosyalarını sil (klasörleri veya readmeleri elleme)
        if (file.endsWith('.log') || (file.startsWith('console-') && file.endsWith('.json'))) {
            const filePath = path.join(logsDir, file);
            fs.unlinkSync(filePath);
            console.log(`🗑️  Silindi: ${file}`);
            deletedCount++;
        }
    }

    if (deletedCount === 0) {
        console.log('✅ Temizlenecek log dosyası bulunamadı.');
    } else {
        console.log(`✨ BİTTİ: Toplam ${deletedCount} adet log dosyası başarıyla temizlendi!`);
    }
} catch (error) {
    console.error('❌ HATA: Log dosyaları temizlenirken bekleyemeyen sorun oluştu:', error.message);
    process.exit(1);
}

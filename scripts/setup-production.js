#!/usr/bin/env node

/**
 * Production Setup Script
 * Bu script production ortamı için gerekli güvenlik kontrollerini yapar
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT_DIR = path.join(__dirname, '..');

console.log('🚀 Production Setup Script Başlatılıyor...\n');

// 1. Environment dosyası kontrolü
function checkEnvironmentFile() {
    console.log('📋 Environment dosyası kontrol ediliyor...');

    if (!fs.existsSync(path.join(ROOT_DIR, '.env'))) {
        console.log('❌ .env dosyası bulunamadı!');
        console.log('📝 .env.example dosyasını .env olarak kopyalayın ve güvenlik ayarlarını yapın.');
        return false;
    }

    const envContent = fs.readFileSync(path.join(ROOT_DIR, '.env'), 'utf8');

    // JWT Secret kontrolü
    if (envContent.includes('your-super-secret-jwt-key-here-minimum-32-characters-long')) {
        console.log('❌ JWT_SECRET değiştirilmemiş!');
        console.log('🔑 Güçlü bir JWT secret key oluşturun (32+ karakter)');
        return false;
    }

    // Default password kontrolü
    if (envContent.includes('your-secure-password-here')) {
        console.log('❌ DEFAULT_ADMIN_PASSWORD değiştirilmemiş!');
        console.log('🔐 Güçlü bir admin şifresi belirleyin');
        return false;
    }

    // CORS Origin kontrolü
    if (envContent.includes('http://localhost:3000')) {
        console.log('⚠️  CORS_ORIGIN localhost olarak ayarlanmış');
        console.log('🌐 Production domain\'inizi ekleyin');
    }

    console.log('✅ Environment dosyası kontrol edildi');
    return true;
}

// 2. Config dosyası kontrolü
function checkConfigFile() {
    console.log('📋 Config dosyası kontrol ediliyor...');

    if (!fs.existsSync(path.join(ROOT_DIR, 'config.json'))) {
        console.log('❌ config.json dosyası bulunamadı!');
        return false;
    }

    const config = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'config.json'), 'utf8'));

    if (config.development_mode === 'on') {
        console.log('❌ Development mode aktif!');
        console.log('🔧 config.json dosyasında development_mode: "off" yapın');
        return false;
    }

    if (config.production.domain.includes('yourdomain.com')) {
        console.log('❌ Production domain değiştirilmemiş!');
        console.log('🌐 config.json dosyasında production domain\'inizi güncelleyin');
        return false;
    }

    console.log('✅ Config dosyası kontrol edildi');
    return true;
}

// 3. Hassas dosyalar kontrolü
function checkSensitiveFiles() {
    console.log('📋 Hassas dosyalar kontrol ediliyor...');

    const sensitiveFiles = [
        path.join(ROOT_DIR, 'data', 'sessions.json'),
        path.join(ROOT_DIR, 'data', 'users.json'),
        path.join(ROOT_DIR, 'logs'),
        path.join(ROOT_DIR, 'admin-backup-manuel')
    ];

    let hasSensitiveData = false;

    sensitiveFiles.forEach(file => {
        if (fs.existsSync(file)) {
            if (file === 'data/sessions.json') {
                const sessions = JSON.parse(fs.readFileSync(file, 'utf8'));
                if (sessions.activeSessions.length > 0) {
                    console.log('❌ Aktif session\'lar bulundu!');
                    hasSensitiveData = true;
                }
            }
            if (file === 'data/users.json') {
                const users = JSON.parse(fs.readFileSync(file, 'utf8'));
                const userKeys = Object.keys(users);
                if (userKeys.length > 0 && !userKeys.includes('admin')) {
                    console.log('❌ Gerçek kullanıcı verileri bulundu!');
                    hasSensitiveData = true;
                }
            }
            if (file === 'logs/' || file === 'admin-backup-manuel/') {
                console.log('❌ Hassas log/backup dosyaları bulundu!');
                hasSensitiveData = true;
            }
        }
    });

    if (!hasSensitiveData) {
        console.log('✅ Hassas dosyalar temizlendi');
        return true;
    }

    return false;
}

// 4. Güvenli JWT Secret oluşturucu
function generateSecureJWTSecret() {
    return crypto.randomBytes(32).toString('hex');
}

// 5. Güvenli password oluşturucu
function generateSecurePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Ana kontrol fonksiyonu
function runSecurityChecks() {
    console.log('🔍 Güvenlik kontrolleri başlatılıyor...\n');

    const checks = [
        { name: 'Environment File', fn: checkEnvironmentFile },
        { name: 'Config File', fn: checkConfigFile },
        { name: 'Sensitive Files', fn: checkSensitiveFiles }
    ];

    let allPassed = true;

    checks.forEach(check => {
        if (!check.fn()) {
            allPassed = false;
        }
        console.log('');
    });

    if (allPassed) {
        console.log('🎉 Tüm güvenlik kontrolleri başarılı!');
        console.log('✅ Proje production için hazır');
        console.log('\n📋 Sonraki adımlar:');
        console.log('1. npm install');
        console.log('2. NODE_ENV=production npm start');
        console.log('3. /admin/login sayfasından giriş yapın');
        console.log('4. Admin şifresini değiştirin');
    } else {
        console.log('❌ Güvenlik kontrolleri başarısız!');
        console.log('🔧 Yukarıdaki sorunları çözün ve tekrar çalıştırın');
        console.log('\n💡 Yardımcı komutlar:');
        console.log('JWT Secret: ' + generateSecureJWTSecret());
        console.log('Güvenli Şifre: ' + generateSecurePassword());
    }

    return allPassed;
}

// Script'i çalıştır
if (require.main === module) {
    runSecurityChecks();
}

module.exports = {
    checkEnvironmentFile,
    checkConfigFile,
    checkSensitiveFiles,
    generateSecureJWTSecret,
    generateSecurePassword,
    runSecurityChecks
};



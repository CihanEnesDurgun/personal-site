#!/usr/bin/env node

/**
 * Production Setup Script
 * Bu script production ortamı için gerekli güvenlik kontrollerini yapar
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
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

// 2. Production ortam ayarları kontrolü
function checkProductionEnv() {
    console.log('📋 Production ortam ayarları kontrol ediliyor...');

    if (process.env.NODE_ENV !== 'production') {
        console.log(`❌ NODE_ENV "${process.env.NODE_ENV || 'tanımsız'}" — production olmalı!`);
        console.log('🔧 Sunucudaki .env dosyasında NODE_ENV=production yapın.');
        console.log('   Aksi halde rate limiting kapalı ve CSP gevşek modda çalışır.');
        return false;
    }

    console.log('✅ Production ortam ayarları kontrol edildi');
    return true;
}

// 3. Hassas dosyalar git'e sızmış mı?
// Repo public; git'e giren her sır kalıcı olarak açığa çıkar. Asıl kontrol edilmesi
// gereken şey dosyaların varlığı değil, git tarafından izlenip izlenmedikleridir.
function checkSensitiveFiles() {
    console.log('📋 Hassas dosyalar git\'e karşı kontrol ediliyor...');

    const mustNotBeTracked = [
        '.env',
        'deploy.config',
        'data/users.json',
        'data/sessions.json'
    ];

    let leaked = [];

    for (const file of mustNotBeTracked) {
        try {
            const out = execFileSync('git', ['ls-files', '--error-unmatch', file], {
                cwd: ROOT_DIR,
                stdio: ['ignore', 'pipe', 'ignore']
            }).toString().trim();
            if (out) leaked.push(file);
        } catch (e) {
            // git ls-files --error-unmatch, dosya izlenmiyorsa hata verir: istediğimiz durum.
        }
    }

    if (leaked.length > 0) {
        console.log('❌ Bu dosyalar git tarafından İZLENİYOR (sır sızıntısı riski):');
        leaked.forEach(f => console.log(`   - ${f}`));
        console.log('🔧 Çözüm: git rm --cached <dosya> ve .gitignore\'a ekleyin.');
        console.log('⚠️  Zaten push edildiyse değerleri ROTATE edin — geçmişten silmek yetmez.');
        return false;
    }

    console.log('✅ Hassas dosyaların hiçbiri git\'te izlenmiyor');
    return true;
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
        { name: 'Production Env', fn: checkProductionEnv },
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
    checkProductionEnv,
    checkSensitiveFiles,
    generateSecureJWTSecret,
    generateSecurePassword,
    runSecurityChecks
};



require('dotenv').config();

const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..');

async function setup() {
    // Şifre asla koda gömülmez: git'e sızarsa admin paneli herkese açılır.
    const password = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!password || password.length < 12) {
        console.error('❌ DEFAULT_ADMIN_PASSWORD tanımlı değil veya 12 karakterden kısa.');
        console.error('💡 .env dosyanıza güçlü bir DEFAULT_ADMIN_PASSWORD ekleyip tekrar çalıştırın.');
        console.error('💡 Üretmek için: node -e "console.log(require(\'crypto\').randomBytes(18).toString(\'base64url\'))"');
        process.exit(1);
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const users = {
        admin: {
            username: 'admin',
            password: hashedPassword,
            lastUpdated: new Date().toISOString(),
            isHashed: true
        }
    };

    await fs.ensureDir(path.join(ROOT_DIR, 'data'));
    await fs.writeJson(path.join(ROOT_DIR, 'data', 'users.json'), users, { spaces: 2 });
    console.log('✅ data/users.json created successfully');
}

setup().catch(console.error);

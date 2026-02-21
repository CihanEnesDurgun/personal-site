const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..');

async function setup() {
    const password = 't0KmYrPH!C7fQmLH';
    const saltRounds = 12;
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

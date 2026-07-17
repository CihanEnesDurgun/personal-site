#!/usr/bin/env node
/**
 * content-pull — canli sitedeki icerigi bu bilgisayara indirir.
 *
 * NEDEN HTTPS: Paylasimli hosting'de SSH yok (yalnizca cPanel Terminal var), bu yuzden
 * senkron sitenin kendi HTTP arayuzu uzerinden yapilir.
 *
 * NE INDIRIR: content/posts.json, projects.json, site.json, yazi/proje markdown'lari ve
 * bunlarin referans verdigi gorseller.
 *
 * TASLAKLAR: Yayinlanmamis icerik sunucuda korunuyor (bkz. server.js icerik rotalari).
 * Taslaklari da indirmek icin admin sifresi sorulur; bos gecersen yalnizca yayinda
 * olanlar iner.
 *
 * Kullanim:
 *   npm run content:pull                 # SITE_URL .env'den okunur
 *   npm run content:pull -- --site https://ornek.com
 *   npm run content:pull -- --published # sifre sorma, sadece yayindakiler
 */

require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);

const siteArg = args.indexOf('--site');
const SITE = (siteArg !== -1 ? args[siteArg + 1] : process.env.SITE_URL || 'https://cihanenesdurgun.com')
  .replace(/\/$/, '');
const SADECE_YAYINDA = args.includes('--published');

function sor(soru, gizli = false) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!gizli) return rl.question(soru, a => { rl.close(); resolve(a); });

    // Sifreyi ekrana basma
    const onData = char => {
      if (['\n', '\r', ''].includes(char.toString())) return;
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(soru);
    };
    process.stdin.on('data', onData);
    rl.question(soru, a => {
      process.stdin.removeListener('data', onData);
      rl.close();
      process.stdout.write('\n');
      resolve(a);
    });
  });
}

async function girisYap() {
  if (SADECE_YAYINDA) return null;

  console.log('Taslaklari da indirmek icin admin girisi gerekir.');
  console.log('(Bos birakip Enter\'a basarsan yalnizca yayindaki icerik iner.)\n');

  const kullanici = (await sor('Kullanici adi [admin]: ')) || 'admin';
  const sifre = await sor('Sifre: ', true);
  if (!sifre) {
    console.log('-> Sifre girilmedi: yalnizca yayindaki icerik indirilecek.\n');
    return null;
  }

  const r = await fetch(`${SITE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: kullanici, password: sifre })
  });

  if (!r.ok) {
    console.error(`HATA: giris basarisiz (${r.status}). Yalnizca yayindaki icerik indirilecek.\n`);
    return null;
  }

  const { token } = await r.json();
  console.log('-> Giris basarili: taslaklar da indirilecek.\n');
  return token;
}

async function indir(yol, token) {
  const r = await fetch(`${SITE}${yol}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: 'follow'
  });
  if (!r.ok) return null;
  return r;
}

async function dosyayaYaz(yol, token, hedefGoreli) {
  const r = await indir(yol, token);
  if (!r) return false;
  const buf = Buffer.from(await r.arrayBuffer());
  const hedef = path.join(ROOT, hedefGoreli);
  await fs.ensureDir(path.dirname(hedef));
  await fs.writeFile(hedef, buf);
  return true;
}

/**
 * Indeks dosyasini (posts.json/projects.json) guvenli sekilde yazar.
 *
 * KRITIK: Yetkisiz istekte sunucu yalnizca YAYINDAKI kayitlari dondurur. Gelen listeyi
 * oldugu gibi yazarsak yereldeki taslaklar SILINIR. Bu yuzden yetkisiz cekimde yerelde
 * olup uzakta gorunmeyen kayitlar korunur (markdown dosyalarina zaten dokunulmuyor).
 */
async function indeksYaz(dosya, uzak, token) {
  const yerelYol = path.join(ROOT, 'content', dosya);

  let yerel = [];
  try {
    const okunan = await fs.readJson(yerelYol);
    if (Array.isArray(okunan)) yerel = okunan;
  } catch (e) { /* yerel dosya yok: ilk cekim */ }

  const uzakSluglar = new Set(uzak.map(u => u.slug));
  const yereldeKalan = yerel.filter(y => y.slug && !uzakSluglar.has(y.slug));

  if (token) {
    // Yetkili: sunucu tam resmi verdi, dogruluk kaynagi o.
    await fs.writeJson(yerelYol, uzak, { spaces: 2 });
    return yereldeKalan.length
      ? `${yereldeKalan.length} yerel kayit sunucuda YOK (silinmis olabilir): ${yereldeKalan.map(k => k.slug).join(', ')}`
      : null;
  }

  // Yetkisiz: eksik resim. Yereldeki (muhtemelen taslak) kayitlari koru.
  await fs.writeJson(yerelYol, [...uzak, ...yereldeKalan], { spaces: 2 });
  return yereldeKalan.length
    ? `${yereldeKalan.length} yerel kayit korundu (sunucu yayinlanmamislari gostermiyor)`
    : null;
}

// Markdown icindeki gorsel yollarini toplar: ![](images/...) ve <img src="images/...">
function gorselleriBul(markdown) {
  const bulunan = new Set();
  const desenler = [/!\[[^\]]*\]\(([^)\s]+)/g, /<img[^>]+src=["']([^"']+)["']/g];
  for (const desen of desenler) {
    let m;
    while ((m = desen.exec(markdown)) !== null) {
      const src = decodeURI(m[1].trim());
      if (src.startsWith('images/') || src.startsWith('/images/')) {
        bulunan.add(src.replace(/^\//, ''));
      }
    }
  }
  return [...bulunan];
}

async function main() {
  console.log(`Kaynak: ${SITE}\nHedef : ${ROOT}\n`);

  const token = await girisYap();
  const sayac = { json: 0, markdown: 0, gorsel: 0, atlanan: 0 };
  const gorseller = new Set();

  for (const [dosya, klasor] of [['posts.json', 'posts'], ['projects.json', 'projects']]) {
    const r = await indir(`/content/${dosya}`, token);
    if (!r) { console.error(`HATA: /content/${dosya} indirilemedi`); continue; }

    const liste = await r.json();
    const uyari = await indeksYaz(dosya, liste, token);
    sayac.json++;
    console.log(`${dosya}: ${liste.length} kayit indirildi`);
    if (uyari) console.log(`  ! ${uyari}`);

    for (const kayit of liste) {
      if (!kayit.slug) continue;
      const mdYolu = `/content/${klasor}/${kayit.slug}.md`;
      const md = await indir(mdYolu, token);
      if (!md) { sayac.atlanan++; console.log(`  ! ${kayit.slug}.md alinamadi`); continue; }

      const metin = await md.text();
      await fs.outputFile(path.join(ROOT, 'content', klasor, `${kayit.slug}.md`), metin);
      sayac.markdown++;

      gorselleriBul(metin).forEach(g => gorseller.add(g));
      if (kayit.cover) gorseller.add(kayit.cover.replace(/^\//, ''));
      (kayit.gallery || []).forEach(g => typeof g === 'string' && gorseller.add(g.replace(/^\//, '')));
    }
  }

  const site = await indir('/content/site.json', token);
  if (site) {
    await fs.writeJson(path.join(ROOT, 'content', 'site.json'), await site.json(), { spaces: 2 });
    sayac.json++;
    console.log('site.json: indirildi');
  }

  console.log(`\nGorseller (${gorseller.size} adet):`);
  for (const g of gorseller) {
    const ok = await dosyayaYaz(`/${g}`, token, g);
    if (ok) sayac.gorsel++; else { sayac.atlanan++; console.log(`  ! ${g} alinamadi`); }
  }

  console.log(`\nTamamlandi: ${sayac.json} json, ${sayac.markdown} markdown, ${sayac.gorsel} gorsel` +
    (sayac.atlanan ? `, ${sayac.atlanan} atlandi` : ''));
  console.log('\nDegisiklikleri gor : git status');
  console.log('Git\'e yedekle      : git add content images && git commit -m "content: sunucudan senkron"');
}

main().catch(err => {
  console.error('HATA:', err.message);
  process.exit(1);
});

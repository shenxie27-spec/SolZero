const sharp = require('sharp');
const dir = 'D:/sol/solzero/app/assets/logos';
(async () => {
  for (let i = 1; i <= 5; i++) {
    const n = 'logo-0' + i;
    await sharp(dir + '/' + n + '.svg').png().resize(1024, 1024).toFile(dir + '/' + n + '.png');
    console.log('ok', n);
  }
})().catch(e => { console.error(e); process.exit(1); });

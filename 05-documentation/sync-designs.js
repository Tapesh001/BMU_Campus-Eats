// Export the current website implementation, without inventing static page content.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, '02-frontend');
const destination = path.join(root, '01-designs');
const groups = [['pages', 'html'], ['styles', 'css'], ['scripts', 'scripts'], ['assets', 'assets']];
let count = 0;
for (const [from, to] of groups) {
  const output = path.join(destination, to);
  fs.mkdirSync(output, { recursive: true });
  for (const entry of fs.readdirSync(path.join(source, from), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const inputFile = path.join(source, from, entry.name);
    const outputFile = path.join(output, entry.name);
    if (from === 'pages') {
      const html = fs.readFileSync(inputFile, 'utf8')
        .replaceAll('href="/styles/', 'href="/designs/css/')
        .replaceAll('src="/scripts/', 'src="/designs/scripts/');
      fs.writeFileSync(outputFile, html);
    } else {
      fs.copyFileSync(inputFile, outputFile);
    }
    count++;
  }
}
console.log(`Synced ${count} design source files into 01-designs.`);

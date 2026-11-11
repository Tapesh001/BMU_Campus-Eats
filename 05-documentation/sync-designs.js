// Build standalone HTML/CSS design previews. This generator never runs in a browser.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, '02-frontend');
const destination = path.join(root, '01-designs');
const groups = [['pages', 'html'], ['styles', 'css'], ['assets', 'assets']];
const catalog = JSON.parse(fs.readFileSync(path.join(root, '04-data', 'menu-data.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function staticPage(name, html) {
  // Show useful static states in sections normally filled by API calls.
  // Only the public seed catalog and clearly labelled placeholder values are used.
  if (name === 'profile.html') {
    html = html.replace('>Guest</h2>', '>Student name</h2>')
      .replace('<dl id="summary"></dl>', '<dl id="summary">' + [
        ['Full name', 'Student name'], ['BMU email', 'student@bmu.edu.in'],
        ['Student ID', 'Your student ID'], ['Hostel / residence', 'Your hostel'], ['Pickup preference', 'Shop counter']
      ].map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('') + '</dl>')
      .replace('id="edit" hidden', 'id="edit"').replace('id="member-links" hidden', 'id="member-links"')
      .replace('Loading profile…', 'Static profile design · placeholder details');
  }
  if (name === 'menu.html') {
    const menu = catalog.find(entry => entry.items.length);
    const cards = menu.items.map(item => {
      const options = (item.options || []).map(group => typeof group === 'string' ? menu.optionGroups[group] : group);
      return `<form class="menu-item"><small>${escape(item.category || '')}</small><h2>${escape(item.dish)}</h2>` +
        `<small>${item.price == null ? 'Price awaiting confirmation' : '₹' + item.price}</small>` +
        options.map(group => `<label>${escape(group.label)}<select>${group.choices.map(([label,extra]) => `<option>${escape(label)}${extra ? ' · +₹' + extra : ''}</option>`).join('')}</select></label>`).join('') +
        `<label>Quantity<input type="number" min="1" value="1"></label><button type="button">${item.stock === 0 ? 'Out of stock' : 'Add to cart'}</button></form>`;
    }).join('');
    html = html.replace('id="shop-title">Shop menu', `id="shop-title">${escape(menu.shop)}`)
      .replace('<div id="items"></div>', `<div id="items">${cards}</div>`)
      .replace('<p id="feedback" role="status"></p>', '<p id="feedback" role="status">Static menu design · search and ordering are inactive.</p>');
  }
  if (name === 'favourites.html') html = html.replace('<div id="favourites-grid" class="feature-grid"></div>', '<div id="favourites-grid" class="feature-grid"><p>Save restaurants or food using the heart button, then find them here.</p></div>');
  if (name === 'offers.html') html = html.replace('<div id="offers-grid" class="feature-grid"></div>', '<div id="offers-grid" class="feature-grid"><p>Student offers will appear here when configured. No active coupons yet.</p></div>');
  if (name === 'checkout.html') html = html.replace('Loading your account…', 'Student name · student@bmu.edu.in · Design preview')
    .replace('<div id="checkout-items"></div>', '<div id="checkout-items"><p>Your selected items appear here.</p></div>')
    .replace('<dl id="totals"></dl>', '<dl id="totals"><dt>Subtotal</dt><dd>₹0</dd><dt>Total</dt><dd>₹0</dd></dl>');
  if (name === 'tracking.html') html = html.replace('Loading order…', 'Static tracking design · no live order')
    .replace('id="order-detail" hidden', 'id="order-detail"')
    .replace('<h2 id="order-number"></h2>', '<h2 id="order-number">Order reference</h2>')
    .replace('<ol id="order-progress" aria-label="Order progress"></ol>', '<ol id="order-progress" aria-label="Order progress">' + ['Order Placed','Accepted by Restaurant','Preparing Your Food','Ready for Pickup','Delivered'].map((label,index) => `<li${index===0?' class="completed"':''}>${label}</li>`).join('') + '</ol>');
  if (name === 'admin.html') html = html.replace('id="admin-dashboard" hidden', 'id="admin-dashboard"')
    .replace('<div id="metrics"></div>', '<div id="metrics"><div><strong>0</strong><p>Orders</p></div><div><strong>₹0</strong><p>Order total</p></div><div><strong>' + catalog.length + '</strong><p>Restaurants</p></div></div>')
    .replace('Project demonstration data', 'Static administration design · no live data');
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replaceAll('href="/styles/', 'href="../css/')
    .replaceAll('src="assets/', 'src="../assets/')
    .replace(/<form\b/g, '<form inert')
    .replace(/<button\b([^>]*)>/g, (_, attrs) => '<button' + attrs.replace(/\s+type="[^"]*"/g, '') + ' type="button">');
}
let count = 0;
for (const [from, to] of groups) {
  const output = path.join(destination, to);
  fs.mkdirSync(output, { recursive: true });
  for (const entry of fs.readdirSync(path.join(source, from), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const inputFile = path.join(source, from, entry.name);
    const outputFile = path.join(output, entry.name);
    if (from === 'pages') {
      const html = staticPage(entry.name, fs.readFileSync(inputFile, 'utf8'));
      fs.writeFileSync(outputFile, html);
    } else {
      fs.copyFileSync(inputFile, outputFile);
    }
    count++;
  }
}
console.log(`Synced ${count} design source files into 01-designs.`);

const adminStatus = document.querySelector('#admin-status');
const make = (tag, text) => { const node = document.createElement(tag); node.textContent = text || ''; return node; };
async function adminRequest(url, method = 'GET', body) {
  const response = await fetch('/api/admin/' + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
async function change(url, method, body) {
  try { await adminRequest(url, method, body); adminStatus.textContent = 'Saved.'; await loadDashboard(); }
  catch (error) { adminStatus.textContent = error.message; }
}
async function loadDashboard() {
  const data = await adminRequest('overview');
  document.querySelector('#admin-login').hidden = true;
  document.querySelector('#admin-dashboard').hidden = false;
  const metrics = document.querySelector('#metrics'); metrics.replaceChildren();
  for (const [label, value] of [['Demo orders', data.orders.length], ['Demo order value', '₹' + (data.total / 100).toLocaleString('en-IN')], ['Registered accounts', data.students], ['Available restaurants', data.restaurants.filter(shop => !shop.closed).length]]) {
    const card = make('div', label); card.append(make('strong', value)); metrics.append(card);
  }
  const totals = {}, popular = {};
  for (const order of data.orders) {
    const day = order.created.slice(0, 10); totals[day] = (totals[day] || 0) + order.total;
    for (const item of order.items) popular[item.baseDish] = (popular[item.baseDish] || 0) + item.qty;
  }
  const chart = document.querySelector('#sales-chart'); chart.replaceChildren();
  for (const [day, value] of Object.entries(totals).sort().slice(-7)) {
    const row = make('div'); const meter = make('meter'); meter.max = Math.max(...Object.values(totals), 1); meter.value = value; meter.setAttribute('aria-label', day + ' demo order total');
    row.append(make('span', day), meter, make('span', '₹' + value / 100)); chart.append(row);
  }
  if (!data.orders.length) chart.append(make('p', 'No demo orders yet.'));
  const items = document.querySelector('#popular-items'); items.replaceChildren();
  Object.entries(popular).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([name, count]) => items.append(make('li', name + ' · ' + count)));
  const orders = document.querySelector('#order-management'); orders.replaceChildren();
  for (const order of data.orders) {
    const row = make('article'); const select = make('select'); select.setAttribute('aria-label', 'Status for ' + order.id);
    for (const status of ['Order Placed', 'Accepted by Restaurant', 'Preparing Your Food', 'Ready for Pickup', 'Delivered']) select.add(new Option(status));
    select.value = order.status;
    const button = make('button', 'Update'); button.onclick = () => change('orders/' + order.id, 'PATCH', { status: select.value });
    row.append(make('p', order.id + ' · ₹' + order.total / 100), select, button); orders.append(row);
  }
  const shops = document.querySelector('#restaurant-management'); shops.replaceChildren();
  for (const shop of data.restaurants) {
    const row = make('article'); const button = make('button', shop.closed ? 'Enable ordering' : 'Close ordering');
    button.onclick = () => change('restaurants/' + encodeURIComponent(shop.shop), 'PATCH', { closed: !shop.closed });
    row.append(make('p', shop.shop + ' · ' + (shop.closed ? 'Closed' : 'Available')), button); shops.append(row);
  }
  for (const select of [document.querySelector('#add-item select'), document.querySelector('#manage-shop')]) {
    const current = select.value; select.replaceChildren(); data.restaurants.forEach(shop => select.add(new Option(shop.shop))); if (current) select.value = current;
  }
  function renderMenu() {
    const shop = data.restaurants.find(shop => shop.shop === document.querySelector('#manage-shop').value);
    const list = document.querySelector('#admin-menu'); list.replaceChildren();
    for (const item of shop.items) {
      const row = make('article');
      const price = make('input'); price.type = 'number'; price.min = 0; price.max = 10000; price.step = .01; price.value = item.price ?? ''; price.setAttribute('aria-label', item.dish + ' price');
      const stock = make('input'); stock.type = 'number'; stock.min = 0; stock.max = 10000; stock.placeholder = 'Stock'; stock.value = item.stock ?? ''; stock.setAttribute('aria-label', item.dish + ' stock');
      const update = make('button', 'Save'); update.onclick = () => { if (price.value === '' || stock.value === '') { adminStatus.textContent = 'Enter a price and stock quantity.'; return; } change('menu', 'PATCH', { shop: shop.shop, dish: item.dish, price: Number(price.value), stock: Number(stock.value) }); };
      const remove = make('button', 'Delete'); remove.onclick = () => { if (confirm('Delete ' + item.dish + '?')) change('menu', 'DELETE', { shop: shop.shop, dish: item.dish }); };
      row.append(make('p', item.dish), price, stock, update, remove); list.append(row);
    }
  }
  document.querySelector('#manage-shop').onchange = renderMenu; renderMenu();
  const offers = document.querySelector('#admin-offers'); offers.replaceChildren();
  for (const offer of data.offers) {
    const row = make('article'); const remove = make('button', 'Delete'); remove.onclick = () => change('offers/' + offer.id, 'DELETE');
    row.append(make('p', offer.title + ' · ' + offer.code + ' · ' + offer.percent + '%'), remove); offers.append(row);
  }
}
document.querySelector('#admin-login').onsubmit = async event => {
  event.preventDefault();
  try { await adminRequest('login', 'POST', { password: event.target.elements.password.value }); await loadDashboard(); adminStatus.textContent = ''; }
  catch (error) { adminStatus.textContent = error.message; }
};
document.querySelector('#add-item').onsubmit = event => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.target)); body.price = Number(body.price); change('menu', 'POST', body); };
document.querySelector('#add-offer').onsubmit = event => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.target)); body.percent = Number(body.percent); change('offers', 'POST', body); };
loadDashboard().catch(() => {});

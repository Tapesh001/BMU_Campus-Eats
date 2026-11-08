const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

module.exports = function installCommerce(app, directory, students) {
  const file = path.join(directory, 'commerce.json');
  let data = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : { orders: [], favourites: {}, addresses: {} };
  data.offers ||= [];
  const catalogFile = path.join(directory, 'catalog.json');
  const catalog = () => JSON.parse(fs.readFileSync(fs.existsSync(catalogFile) ? catalogFile : path.join(__dirname, 'menu-data.json'), 'utf8'));
  function saveCatalog(next) {
    fs.writeFileSync(catalogFile + '.tmp', JSON.stringify(next, null, 2), { mode: 0o600 });
    fs.renameSync(catalogFile + '.tmp', catalogFile);
  }
  function save(next) {
    fs.writeFileSync(file + '.tmp', JSON.stringify(next, null, 2), { mode: 0o600 });
    fs.renameSync(file + '.tmp', file);
    data = next;
  }
  function fail(message) { throw Object.assign(new Error(message), { status: 400 }); }
  function quote(lines, coupon) {
    if (!Array.isArray(lines) || !lines.length || lines.length > 100) fail('Choose between 1 and 100 cart items.');
    const menus = catalog();
    const items = lines.map(line => {
      const menu = menus.find(entry => entry.shop === line.shop);
      const legacyParts = typeof line.dish === 'string' ? line.dish.split(' · ') : [];
      const item = menu?.items.find(entry => entry.dish === (line.baseDish || line.dish))
        || menu?.items.find(entry => legacyParts.includes(entry.dish));
      if (!item || menu.closed || item.stock === 0 || item.price == null) fail('An item is unavailable. Add it again from its menu.');
      if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99) fail('Quantity must be between 1 and 99.');
      const groups = (item.options || []).map(group => typeof group === 'string' ? menu.optionGroups[group] : group);
      const selections = line.selections || groups.map(group => group.choices.findIndex(choice => legacyParts.includes(choice[0])));
      if (selections.length !== groups.length) fail('Choose the item options again from its menu.');
      let price = item.price;
      const labels = [];
      groups.forEach((group, index) => {
        const choiceIndex = selections[index];
        if (!Number.isInteger(choiceIndex) || !group.choices[choiceIndex]) fail('Invalid menu option.');
        const [label, extra] = group.choices[choiceIndex];
        labels.push(label);
        price += extra;
      });
      const subtotal = Math.round(price * line.qty * 100);
      const tax = Math.round(subtotal * (menu.taxPercent || 0) / 100);
      return { shop: menu.shop, baseDish: item.dish, dish: [item.dish, ...labels].join(' · '), selections,
        price, qty: line.qty, subtotal, tax, stock: item.stock, taxPercent: menu.taxPercent || 0 };
    });
    for (const item of items) {
      const quantity = items.filter(other => other.shop === item.shop && other.baseDish === item.baseDish).reduce((sum, other) => sum + other.qty, 0);
      if (item.stock != null && quantity > item.stock) fail('The requested quantity exceeds available stock.');
    }
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = items.reduce((sum, item) => sum + item.tax, 0);
    const code = typeof coupon === 'string' ? coupon.trim().toUpperCase() : '';
    const offer = code ? data.offers.find(offer => offer.code === code) : null;
    if (code && !offer) fail('That coupon is invalid or no longer available.');
    const discount = offer ? Math.round(subtotal * offer.percent / 100) : 0;
    return { items, subtotal, tax, discount, coupon: code, delivery: 0, total: subtotal + tax - discount };
  }
  app.use(['/api/checkout', '/api/orders', '/api/favourites', '/api/addresses'], (req, res, next) => {
    if (!req.student) return res.status(401).json({ error: 'Sign in to continue.' });
    next();
  });
  app.post('/api/checkout/quote', (req, res) => res.json(quote(req.body.items, req.body.coupon)));
  app.post('/api/orders', (req, res) => {
    const key = req.body.requestId;
    if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(key)) fail('Missing checkout request identifier.');
    const existing = data.orders.find(order => order.studentId === req.student.id && order.requestId === key);
    if (existing) return res.json(existing);
    const address = req.body.address;
    if (!address || typeof address.hostel !== 'string' || !address.hostel.trim() || address.hostel.length > 80) fail('Enter your hostel or residence.');
    for (const field of ['block', 'room', 'instructions']) {
      if (typeof address[field] !== 'string' || address[field].length > 300) fail('Enter valid address details.');
    }
    if (req.body.fulfilment !== 'pickup') fail('Only shop pickup is currently supported.');
    if (req.body.payment !== 'pickup') fail('Select pay at pickup.');
    const summary = quote(req.body.items, req.body.coupon);
    const order = { ...summary, id: 'BMU-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
      studentId: req.student.id, requestId: key, created: new Date().toISOString(), status: 'Order Placed',
      address, fulfilment: 'pickup', payment: 'Unpaid · Pay at pickup', demo: true };
    save({ ...data, orders: [order, ...data.orders] });
    res.status(201).json(order);
  });
  app.get('/api/orders', (req, res) => res.json(data.orders.filter(order => order.studentId === req.student.id)));
  app.get('/api/orders/:id', (req, res) => {
    const order = data.orders.find(order => order.id === req.params.id && order.studentId === req.student.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json(order);
  });
  app.get('/api/favourites', (req, res) => res.json(data.favourites[req.student.id] || []));
  app.put('/api/favourites', (req, res) => {
    const entries = req.body.items;
    if (!Array.isArray(entries) || entries.length > 200 || entries.some(item => typeof item !== 'string' || item.length > 250)) fail('Invalid favourites.');
    const favourites = { ...data.favourites, [req.student.id]: [...new Set(entries)] };
    save({ ...data, favourites });
    res.json(favourites[req.student.id]);
  });
  app.get('/api/addresses', (req, res) => res.json(data.addresses[req.student.id] || []));
  app.put('/api/addresses', (req, res) => {
    const entries = req.body.items;
    if (!Array.isArray(entries) || entries.length > 5 || entries.some(item => typeof item !== 'string' || !item.trim() || item.length > 300)) fail('Save up to five addresses of 300 characters each.');
    const addresses = { ...data.addresses, [req.student.id]: entries };
    save({ ...data, addresses });
    res.json(addresses[req.student.id]);
  });
  app.get('/api/offers', (req, res) => res.json(data.offers));
  const adminSessions = new Map();
  app.post('/api/admin/login', (req, res) => {
    const password = process.env.BMU_ADMIN_PASSWORD;
    if (!password) return res.status(503).json({ error: 'Set BMU_ADMIN_PASSWORD on the server to enable administration.' });
    const supplied = typeof req.body.password === 'string' ? req.body.password : '';
    const expectedHash = crypto.createHash('sha256').update(password).digest();
    const suppliedHash = crypto.createHash('sha256').update(supplied).digest();
    if (!crypto.timingSafeEqual(expectedHash, suppliedHash)) return res.status(401).json({ error: 'Incorrect admin password.' });
    const token = crypto.randomBytes(32).toString('hex');
    adminSessions.set(token, Date.now() + 3600000);
    res.cookie('bmu_admin', token, { httpOnly: true, sameSite: 'strict', maxAge: 3600000, path: '/api/admin' });
    res.json({ ok: true });
  });
  app.use('/api/admin', (req, res, next) => {
    const token = (req.headers.cookie || '').match(/(?:^|;\s*)bmu_admin=([0-9a-f]{64})(?:;|$)/)?.[1];
    if ((adminSessions.get(token) || 0) < Date.now()) return res.status(401).json({ error: 'Sign in as an administrator.' });
    next();
  });
  app.get('/api/admin/overview', (req, res) => res.json({
    demo: true, students: students.length, orders: data.orders,
    total: data.orders.reduce((sum, order) => sum + order.total, 0), restaurants: catalog(), offers: data.offers
  }));
  app.patch('/api/admin/orders/:id', (req, res) => {
    const steps = ['Order Placed', 'Accepted by Restaurant', 'Preparing Your Food', 'Ready for Pickup', 'Delivered'];
    const order = data.orders.find(entry => entry.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (!steps.includes(req.body.status)) fail('Choose a valid order status.');
    const updated = { ...order, status: req.body.status };
    save({ ...data, orders: data.orders.map(entry => entry.id === order.id ? updated : entry) });
    res.json(updated);
  });
  app.patch('/api/admin/restaurants/:shop', (req, res) => {
    const menus = catalog();
    const menu = menus.find(entry => entry.shop === req.params.shop);
    if (!menu) return res.status(404).json({ error: 'Restaurant not found.' });
    if (typeof req.body.closed !== 'boolean') fail('Choose an availability status.');
    menu.closed = req.body.closed;
    saveCatalog(menus);
    res.json(menu);
  });
  app.post('/api/admin/menu', (req, res) => {
    const menus = catalog();
    const menu = menus.find(entry => entry.shop === req.body.shop);
    if (!menu) fail('Choose a restaurant.');
    const { dish, category, price } = req.body;
    if (typeof dish !== 'string' || !dish.trim() || dish.length > 120 || typeof category !== 'string' || category.length > 80 || !Number.isFinite(price) || price < 0 || price > 10000) fail('Enter a name, category and valid price.');
    if (menu.items.some(item => item.dish === dish.trim())) fail('That item already exists.');
    menu.items.push({ dish: dish.trim(), category, price });
    saveCatalog(menus);
    res.status(201).json(menu);
  });
  app.patch('/api/admin/menu', (req, res) => {
    const menus = catalog();
    const item = menus.find(entry => entry.shop === req.body.shop)?.items.find(entry => entry.dish === req.body.dish);
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    if (!Number.isFinite(req.body.price) || req.body.price < 0 || req.body.price > 10000 || !Number.isInteger(req.body.stock) || req.body.stock < 0 || req.body.stock > 10000) fail('Enter a valid price and stock quantity.');
    item.price = req.body.price;
    item.stock = req.body.stock;
    saveCatalog(menus);
    res.json(item);
  });
  app.delete('/api/admin/menu', (req, res) => {
    const menus = catalog();
    const menu = menus.find(entry => entry.shop === req.body.shop);
    if (!menu) return res.status(404).json({ error: 'Restaurant not found.' });
    menu.items = menu.items.filter(item => item.dish !== req.body.dish);
    saveCatalog(menus);
    res.json({ ok: true });
  });
  app.post('/api/admin/offers', (req, res) => {
    const { title, code, percent } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.length > 120 || typeof code !== 'string' || !/^[A-Z0-9]{3,20}$/.test(code) || !Number.isFinite(percent) || percent <= 0 || percent > 100) fail('Enter a title, uppercase coupon code and discount from 1 to 100.');
    if (data.offers.some(offer => offer.code === code)) fail('Coupon code already exists.');
    const offer = { id: crypto.randomUUID(), title, code, percent, demo: true };
    save({ ...data, offers: [...data.offers, offer] });
    res.status(201).json(offer);
  });
  app.delete('/api/admin/offers/:id', (req, res) => {
    save({ ...data, offers: data.offers.filter(offer => offer.id !== req.params.id) });
    res.json({ ok: true });
  });
  return { catalog };
};

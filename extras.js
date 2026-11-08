async function enhanceCampus() {
  await window.campusReady;
  const profileResponse = await fetch('/api/profile');
  const student = profileResponse.ok ? await profileResponse.json() : null;
  const catalog = await (await fetch('/api/menus')).json();
  let favourites = student ? await (await fetch('/api/favourites')).json() : [];
  const page = document.body.dataset.page;
  const main = document.querySelector('main');
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const link = (label, href) => {
    const node = element('a', label);
    node.href = href;
    return node;
  };
  const feedback = element('p', '', 'feature-feedback');
  feedback.setAttribute('role', 'status');
  main.append(feedback);
  async function saveFavourite(key, button) {
    if (!student) { location.assign('login.html'); return; }
    button.disabled = true;
    const next = favourites.includes(key) ? favourites.filter(value => value !== key) : [...favourites, key];
    try {
      const response = await fetch('/api/favourites', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      favourites = result;
      button.textContent = favourites.includes(key) ? '♥ Saved' : '♡ Save';
      button.setAttribute('aria-pressed', String(favourites.includes(key)));
      feedback.textContent = favourites.includes(key) ? 'Saved to favourites.' : 'Removed from favourites.';
    } catch (error) { feedback.textContent = error.message; }
    finally { button.disabled = false; }
  }
  function heart(key) {
    const button = element('button', favourites.includes(key) ? '♥ Saved' : '♡ Save', 'favourite-button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(favourites.includes(key)));
    button.onclick = () => saveFavourite(key, button);
    return button;
  }
  const navigation = document.querySelector('.navigation-links, .campus-bar nav');
  if (navigation) {
    for (const [label, href] of [['Offers', 'offers.html'], ['Favourites', 'favourites.html']]) {
      if (!navigation.querySelector('[href="' + href + '"]')) navigation.append(link(label, href));
    }
    if (!student && !navigation.querySelector('[href="register.html"]')) navigation.append(link('Sign Up', 'register.html'));
    navigation.id = 'campus-navigation';
    const toggle = element('button', 'Menu', 'mobile-menu');
    toggle.setAttribute('aria-controls', navigation.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.onclick = () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      navigation.classList.toggle('navigation-open', open);
    };
    navigation.before(toggle);
  }
  const cuisines = { 'Kathi Junction': 'Rolls · North Indian', 'Domino’s': 'Pizza · Sides', "Domino's": 'Pizza · Sides', 'Burger Singh': 'Burgers · Snacks', 'Greenox': 'Salads · Wraps · Beverages', 'Maggie Point': 'Maggi · Beverages', 'Tuck Shop': 'Campus essentials' };
  function restaurantCard(menu) {
    const card = element('article', '', 'feature-card');
    const brands = { 'Kathi Junction':'d2629.png', 'Greenox':'c2e0c.png', "Domino's":'a9c50.png', 'Burger Singh':'138f3.png', 'Maggie Point':'16761.png', 'Tuck Shop':'0ede3.png' };
    if (brands[menu.shop]) {
      const image = element('img'); image.src = 'assets/' + brands[menu.shop]; image.alt = menu.shop; image.loading = 'lazy'; image.className = 'restaurant-brand'; card.append(image);
    }
    card.append(element('h3', menu.shop), element('p', cuisines[menu.shop] || 'Campus food'));
    card.append(element('small', 'Rating and preparation time awaiting confirmation'));
    card.append(element('p', menu.closed ? 'Closed' : 'Ordering available · Confirm hours with shop'));
    card.append(link('Explore Menu →', 'menu.html?shop=' + encodeURIComponent(menu.shop)), heart('shop:' + menu.shop));
    return card;
  }
  function section(title) {
    const node = element('section', '', 'feature-section');
    node.append(element('h2', title));
    return node;
  }
  if (page === 'home') {
    const hero = document.querySelector('.hero-copy');
    const search = element('form', '', 'campus-search');
    search.action = 'shops.html';
    const input = element('input');
    input.type = 'search'; input.name = 'q'; input.placeholder = 'What are you craving today?';
    input.setAttribute('aria-label', 'Search campus food');
    search.append(input, element('button', 'Search'));
    hero.append(search, link('View today’s offers', 'offers.html'));
    const content = document.querySelector('.home-content');
    const categories = section('What are you craving?');
    const chips = element('div', '', 'category-chips');
    for (const name of ['Pizza', 'Burgers', 'Chinese', 'Rolls', 'North Indian', 'Beverages', 'Snacks', 'Desserts']) chips.append(link(name, 'shops.html?q=' + encodeURIComponent(name)));
    categories.append(chips);
    const featured = section('Explore campus restaurants');
    const grid = element('div', '', 'feature-grid');
    catalog.filter(menu => menu.items.length).forEach(menu => grid.append(restaurantCard(menu)));
    featured.append(grid);
    const budget = section('Under ₹99');
    const foodGrid = element('div', '', 'feature-grid');
    for (const menu of catalog) {
      const item = menu.items.find(item => item.price != null && item.price < 99 && item.stock !== 0);
      if (!item) continue;
      const card = element('article', '', 'feature-card');
      card.append(element('h3', item.dish), element('p', menu.shop + ' · ₹' + item.price), link('Choose options →', 'menu.html?shop=' + encodeURIComponent(menu.shop) + '&q=' + encodeURIComponent(item.dish)));
      foodGrid.append(card);
    }
    budget.append(foodGrid);
    const dashboard = content.querySelector('.dashboard-sections');
    content.insertBefore(categories, dashboard); content.insertBefore(featured, dashboard); content.insertBefore(budget, dashboard);
    const proposed = section('More ways to order together');
    proposed.append(element('p', 'Group orders and late-night ordering are proposed campus features. Shop hours will appear when confirmed.'));
    content.append(proposed);
  }
  if (page === 'shops') {
    const content = document.querySelector('.shops-content');
    const toolbar = element('div', '', 'discovery-tools');
    const search = element('input'); search.type = 'search'; search.placeholder = 'Search restaurants, cuisines or food'; search.setAttribute('aria-label', search.placeholder);
    search.value = new URLSearchParams(location.search).get('q') || '';
    const sort = element('select'); sort.setAttribute('aria-label', 'Sort restaurants');
    sort.add(new Option('Restaurant name', 'name')); sort.add(new Option('Lowest menu price', 'price'));
    const openLabel = element('label', 'Ordering available ');
    const openOnly = element('input'); openOnly.type = 'checkbox'; openLabel.append(openOnly);
    const dietary = element('select'); dietary.setAttribute('aria-label', 'Food preference');
    for (const value of ['All food', 'Vegetarian', 'Non-vegetarian']) dietary.add(new Option(value));
    toolbar.append(search, dietary, openLabel, sort);
    const grid = document.querySelector('.detailed-shop-grid');
    grid.before(toolbar);
    const cards = [...grid.children];
    for (const card of cards) {
      const shop = card.querySelector('.shop-heading p')?.textContent.trim();
      if (shop) card.append(heart('shop:' + shop));
      const menu = catalog.find(menu => menu.shop === shop);
      const status = card.querySelector('.shop-heading [data-name="Status"]');
      if (status && menu) status.textContent = menu.closed ? 'CLOSED' : 'AVAILABLE';
    }
    function filter() {
      let visible = 0;
      const query = search.value.trim().toLowerCase().replace(/burgers/g, 'burger');
      for (const card of cards) {
        const shop = card.querySelector('.shop-heading p')?.textContent.trim();
        const menu = catalog.find(menu => menu.shop === shop);
        const text = [shop, cuisines[shop], ...(menu?.items || []).map(item => item.dish + ' ' + item.category)].join(' ').toLowerCase();
        const dietMatch = dietary.value === 'All food' || (menu?.items || []).some(item => dietary.value === 'Non-vegetarian' ? /chicken|mutton|egg|fish|non.?veg/i.test(item.dish + ' ' + item.category) : /veg|paneer|aloo|corn|soya/i.test(item.dish + ' ' + item.category) && !/non.?veg|chicken|mutton/i.test(item.dish + ' ' + item.category));
        card.hidden = !text.includes(query) || (openOnly.checked && (!menu || menu.closed)) || !dietMatch;
        if (!card.hidden) visible++;
      }
      const minimum = card => {
        const shop = card.querySelector('.shop-heading p')?.textContent.trim();
        return Math.min(...(catalog.find(menu => menu.shop === shop)?.items || []).filter(item => item.price != null).map(item => item.price));
      };
      cards.sort((a, b) => sort.value === 'price' ? minimum(a) - minimum(b) : a.querySelector('.shop-heading').textContent.localeCompare(b.querySelector('.shop-heading').textContent)).forEach(card => grid.append(card));
      feedback.textContent = visible ? visible + ' restaurants found.' : 'No matching restaurants. Try another food or clear the filters.';
    }
    search.oninput = filter; sort.onchange = filter; dietary.onchange = filter; openOnly.onchange = filter; filter();
  }
  if (page === 'menu') {
    const menu = catalog.find(menu => menu.shop === new URLSearchParams(location.search).get('shop'));
    if (menu) document.querySelector('#shop-title').after(heart('shop:' + menu.shop));
    function decorate() {
      for (const card of document.querySelectorAll('.menu-item')) {
        if (card.querySelector('.favourite-button')) continue;
        card.append(heart('food:' + menu.shop + ':' + card.querySelector('h2').textContent));
      }
    }
    if (menu) {
      decorate();
      const observer = new MutationObserver(decorate);
      observer.observe(document.querySelector('#items'), { childList: true });
    }
    const query = new URLSearchParams(location.search).get('q');
    if (query) { const search = document.querySelector('#search'); search.value = query; search.dispatchEvent(new Event('input')); }
  }
  if (page === 'favourites') {
    const grid = document.querySelector('#favourites-grid');
    if (!student) { grid.append(link('Sign in to see your favourites', 'login.html')); }
    else if (!favourites.length) grid.append(element('p', 'Save restaurants or food using the heart button, then find them here.'));
    for (const key of favourites) {
      if (key.startsWith('shop:')) {
        const menu = catalog.find(menu => menu.shop === key.slice(5));
        if (menu) grid.append(restaurantCard(menu));
      } else {
        const [, shop, ...dish] = key.split(':');
        const card = element('article', '', 'feature-card');
        card.append(element('h3', dish.join(':')), element('p', shop), link('View menu →', 'menu.html?shop=' + encodeURIComponent(shop)), heart(key));
        grid.append(card);
      }
    }
  }
  if (page === 'offers') {
    const offers = await (await fetch('/api/offers')).json();
    const grid = document.querySelector('#offers-grid');
    if (!offers.length) grid.append(element('p', 'Student offers will appear here when configured. No active coupons yet.'));
    for (const offer of offers) {
      const card = element('article', '', 'feature-card');
      card.append(element('small', 'DEMO OFFER'), element('h2', offer.title), element('p', offer.percent + '% off · Code ' + offer.code));
      grid.append(card);
    }
  }
  const footer = element('footer', '', 'feature-footer');
  if (document.querySelector('.profile-page') && student) {
    const saved = section('Saved addresses');
    const form = element('form');
    const label = element('label', 'One address per line, up to five');
    const input = element('textarea'); input.rows = 5;
    const addresses = await (await fetch('/api/addresses')).json();
    input.value = addresses.join('\n'); label.append(input);
    form.append(label, element('button', 'Save addresses'));
    form.onsubmit = async event => {
      event.preventDefault();
      const response = await fetch('/api/addresses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: input.value.split('\n').map(value => value.trim()).filter(Boolean) }) });
      const result = await response.json();
      feedback.textContent = response.ok ? 'Addresses saved.' : result.error;
    };
    saved.append(form, link('View favourite restaurants and food →', 'favourites.html'));
    main.append(saved);
  }
  if (page === 'cart' && student) {
    const items = JSON.parse(localStorage.getItem('bmu.' + student.id + '.cart') || '[]');
    const key = 'bmu.' + student.id + '.cart-revealed';
    if (items.length && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      const bag = element('div', '', 'cart-reveal');
      bag.setAttribute('aria-hidden', 'true');
      bag.innerHTML = '<svg viewBox="0 0 100 100"><path d="M20 30H80L85 85H15Z" fill="#e9cbaa"/><path d="M35 32V24a15 15 0 0 1 30 0v8" fill="none" stroke="#321c18" stroke-width="4"/><path d="m35 56 12 12 22-26" fill="none" stroke="#b94b32" stroke-width="5"/></svg>';
      document.body.append(bag);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        bag.animate([{ opacity: 0, transform: 'translateY(8px) scale(.9)' }, { opacity: 1, transform: 'none', offset: .4 }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 600 }).finished.then(() => bag.remove());
      } else bag.remove();
    }
  }
  for (const label of ['About Us', 'Contact', 'Help & Support', 'FAQs', 'Terms and Conditions']) footer.append(link(label, 'help.html#' + label.toLowerCase().replace(/[^a-z]+/g, '-')));
  footer.append(element('small', 'BMU Campus Eats · Student project'));
  document.body.append(footer);
}
enhanceCampus().catch(error => {
  const status = document.querySelector('.feature-feedback');
  if (status) status.textContent = 'Some features could not load. Please reload.';
  console.error(error);
});

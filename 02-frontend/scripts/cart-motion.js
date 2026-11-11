// Compact, non-blocking feedback for successful cart actions.
window.campusCartFeedback = function (source, dish, count) {
  let feedback = document.querySelector('#cart-announcement');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'cart-announcement';
    feedback.className = 'cart-announcement';
    feedback.setAttribute('role', 'status');
    document.body.append(feedback);
  }
  feedback.textContent = dish + ' added to cart';
  clearTimeout(window.campusCartFeedbackTimer);
  window.campusCartFeedbackTimer = setTimeout(() => { feedback.textContent = ''; }, 2400);
  const cartLink = document.querySelector('nav a[href="cart.html"], .navigation-links a[href="cart.html"]');
  if (cartLink) {
    cartLink.setAttribute('aria-label', 'Cart, ' + count + ' items');
    let badge = cartLink.querySelector('.cart-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cart-count';
      cartLink.append(badge);
    }
    badge.textContent = count;
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelector('.food-flight')?.remove();
  const animation = document.createElement('div');
  animation.className = 'food-flight';
  animation.setAttribute('aria-hidden', 'true');
  const isWrap = /roll|wrap/i.test(dish);
  animation.innerHTML = isWrap
    ? '<svg viewBox="0 0 100 100"><g fill="#64813f"><rect x="34" y="20" width="10" height="60" rx="5"/><rect x="51" y="16" width="10" height="65" rx="5"/></g><path d="M45 23L55 74M60 27L42 70" stroke="#b94b32" stroke-width="8"/><path class="wrap-left" d="M17 25Q33 12 51 24L56 82Q33 89 24 72Z" fill="#e9cbaa" stroke="#b88d61"/><path class="wrap-right" d="M83 25Q67 12 49 24L44 82Q67 89 76 72Z" fill="#f2dbb8" stroke="#b88d61"/></svg>'
    : '<svg viewBox="0 0 100 100"><path d="M25 32H75L82 83H18Z" fill="#e9cbaa" stroke="#b94b32" stroke-width="3"/><path d="M36 34V25a14 14 0 0 1 28 0v9" fill="none" stroke="#321c18" stroke-width="4"/><path d="m36 58 10 10 20-23" fill="none" stroke="#b94b32" stroke-width="5"/></svg>';
  const start = source.getBoundingClientRect();
  const end = cartLink?.getBoundingClientRect();
  animation.style.left = Math.min(innerWidth - 90, Math.max(0, start.left)) + 'px';
  animation.style.top = Math.min(innerHeight - 90, Math.max(0, start.top - 60)) + 'px';
  document.body.append(animation);
  const deltaX = end ? end.left - parseFloat(animation.style.left) : 0;
  const deltaY = end ? end.top - parseFloat(animation.style.top) : -40;
  animation.animate([
    { opacity: 0, transform: 'scale(.8)' },
    { opacity: 1, transform: 'scale(1)', offset: .15 },
    { opacity: 1, transform: 'scale(1)', offset: .65 },
    { opacity: 0, transform: `translate(${deltaX}px, ${deltaY}px) scale(.2)` }
  ], { duration: 720, easing: 'ease-in-out' }).finished.then(() => animation.remove());
  cartLink?.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 220 });
};

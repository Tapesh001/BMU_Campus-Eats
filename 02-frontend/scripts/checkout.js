async function startCheckout() {
  const form = document.querySelector('#checkout-form');
  const status = document.querySelector('#checkout-status');
  const button = document.querySelector('#place-order');
  const money = paise => '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  async function request(url, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/' + url, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to complete the request. Please retry.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The server took too long to respond. Retry to check or complete your order safely.');
      if (error instanceof TypeError) throw new Error('Cannot reach the server. Check your connection and retry.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  // Prevent native form navigation even if checkout initialization fails.
  form.onsubmit = event => event.preventDefault();

  try {
    const student = await request('profile');
    document.querySelector('#student-details').textContent = student.name + ' · ' + student.email;
    form.elements.hostel.value = student.hostel;
    form.elements.fulfilment.value = student.pickup === 'Hostel gate' ? 'hostel-gate' : 'pickup';
    const cartKey = 'bmu.' + student.id + '.cart';
    const items = JSON.parse(localStorage.getItem(cartKey) || '[]');
    let quote = await request('checkout/quote', { items });
    let appliedCoupon = ''; 
    for (const item of quote.items) {
      const row = document.createElement('article');
      const heading = document.createElement('strong');
      heading.textContent = item.qty + ' × ' + item.dish;
      const detail = document.createElement('p');
      detail.textContent = item.shop + ' · ' + money(item.subtotal);
      row.append(heading, detail);
      document.querySelector('#checkout-items').append(row);
    }
    function showTotals() {
      const totals = document.querySelector('#totals');
      totals.replaceChildren();
      for (const [label, value] of [['Subtotal', quote.subtotal], ['GST', quote.tax], ['Discount', -quote.discount], ['Pickup', 0], ['Total', quote.total]]) {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const amount = document.createElement('dd');
        term.textContent = label;
        amount.textContent = money(value);
        row.append(term, amount); totals.append(row);
      }
    }
    showTotals();
    document.querySelector('#apply-coupon').onclick = async event => {
      event.target.disabled = true; button.disabled = true;
      try {
        const code = document.querySelector('#coupon-code').value.trim();
        quote = await request('checkout/quote', { items, coupon: code });
        appliedCoupon = code; showTotals();
        document.querySelector('#coupon-status').textContent = code ? 'Coupon applied. Saved ' + money(quote.discount) : 'Coupon removed.';
      } catch (error) { document.querySelector('#coupon-status').textContent = error.message; }
      finally { event.target.disabled = false; button.disabled = false; }
    };
    // Preserve this identifier on retry so a lost response cannot create two orders.
    const pendingKey = 'bmu.' + student.id + '.checkout-request';
    const fingerprint = JSON.stringify(items);
    let pending;
    try { pending = JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); } catch { pending = null; }
    if (!pending || !/^[a-zA-Z0-9-]{16,80}$/.test(pending.id || '') || pending.fingerprint !== fingerprint) {
      pending = { id: Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join(''), fingerprint };
      sessionStorage.setItem(pendingKey, JSON.stringify(pending));
    }
    form.onsubmit = async event => {
      event.preventDefault();
      if (button.disabled) return;
      button.disabled = true;
      document.querySelector('#apply-coupon').disabled = true;
      button.textContent = 'Placing order...';
      status.textContent = 'Saving your order…';
      try {
        const fields = Object.fromEntries(new FormData(form));
        const order = await request('orders', {
          requestId: pending.id, items, coupon: appliedCoupon, fulfilment: fields.fulfilment, payment: fields.payment,
          address: { hostel: fields.hostel, block: fields.block, room: fields.room, instructions: fields.instructions }
        });
        localStorage.setItem(cartKey, '[]');
        sessionStorage.removeItem(pendingKey);
        location.assign('tracking.html?id=' + encodeURIComponent(order.id) + '&confirmed=1');
      } catch (error) {
        status.textContent = error.message;
        button.disabled = false;
        document.querySelector('#apply-coupon').disabled = false;
        button.textContent = 'Place order';
      }
    };
    button.disabled = false;
  } catch (error) {
    button.disabled = true;
    status.textContent = error.message + ' Return to your cart or sign in to continue.';
  }
}
startCheckout();

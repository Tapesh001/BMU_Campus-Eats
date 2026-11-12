const orderId = new URLSearchParams(location.search).get('id');
const steps = ['Order Placed', 'Accepted by Restaurant', 'Preparing Your Food', 'Ready for Pickup', 'Delivered'];
let previousStatus;
async function refreshOrder() {
  const feedback = document.querySelector('#order-feedback');
  try {
    if (!orderId) throw new Error('Choose an order from My Orders.');
    const response = await fetch('/api/orders/' + encodeURIComponent(orderId));
    const order = await response.json();
    if (!response.ok) throw new Error(order.error);
    feedback.textContent = order.status;
    document.querySelector('#order-detail').hidden = false;
    document.querySelector('#order-number').textContent = order.id;
    document.querySelector('#order-meta').textContent = new Date(order.created).toLocaleString();
    const progress = document.querySelector('#order-progress');
    progress.replaceChildren();
    steps.forEach((label, index) => {
      const item = document.createElement('li');
      item.textContent = label;
      if (index <= steps.indexOf(order.status)) item.className = 'completed';
      if (label === order.status) item.setAttribute('aria-current', 'step');
      progress.append(item);
    });
    if (previousStatus && previousStatus !== order.status && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      progress.animate([{ opacity: .5 }, { opacity: 1 }], { duration: 200 });
    }
    previousStatus = order.status;
    const items = document.querySelector('#ordered-items');
    items.replaceChildren();
    for (const item of order.items) {
      const row = document.createElement('article');
      row.textContent = item.qty + ' × ' + item.dish + ' · ' + item.shop;
      items.append(row);
    }
    document.querySelector('#order-total').textContent = 'Total ₹' + (order.total / 100).toLocaleString('en-IN');
    document.querySelector('#payment-status').textContent = order.payment;
    const destination = order.fulfilment === 'hostel-gate'
      ? 'Hostel gate: ' + order.address.hostel + (order.address.block ? ' - Block ' + order.address.block : '')
      : 'Shop counter';
    document.querySelector('#collection-location').textContent = 'Collection location: ' + destination;
    if (new URLSearchParams(location.search).has('confirmed') && !document.querySelector('#order-confirmation')) {
      const confirmation = document.createElement('p');
      confirmation.id = 'order-confirmation';
      confirmation.setAttribute('role', 'status');
      confirmation.textContent = '✓ Order placed. Await acceptance before collecting. Payment is due at pickup.';
      document.querySelector('#order-detail').prepend(confirmation);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        confirmation.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 450 });
      }
    }
    if (!document.querySelector('#reorder')) {
      const button = document.createElement('button');
      button.id = 'reorder'; button.textContent = 'Reorder';
      button.onclick = async () => {
        const response = await fetch('/api/profile');
        if (!response.ok) { location.assign('login.html'); return; }
        const student = await response.json();
        const key = 'bmu.' + student.id + '.cart';
        const cart = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify([...cart, ...order.items]));
        location.assign('cart.html');
      };
      document.querySelector('#order-detail').append(button);
    }
  } catch (error) { feedback.textContent = error.message; }
}
refreshOrder();
setInterval(() => { if (!document.hidden) refreshOrder(); }, 15000);

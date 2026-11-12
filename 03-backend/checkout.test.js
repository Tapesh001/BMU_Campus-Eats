const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto');
const source = fs.readFileSync(require('node:path').join(__dirname, '../02-frontend/scripts/checkout.js'), 'utf8');
async function setup({ failFirst = false, noProfile = false, corruptPending = false } = {}) {
  const node = () => ({disabled:true, value:'', textContent:'', append(){}, replaceChildren(){}});
  const nodes = Object.fromEntries(['checkout-form','checkout-status','place-order','student-details','checkout-items','totals','apply-coupon','coupon-code','coupon-status'].map(id=>['#'+id,node()]));
  nodes['#checkout-form'].elements = {hostel:{value:''}};
  const cart = new Map([['bmu.student.cart', '[{"dish":"Test","qty":1}]']]);
  const pending = new Map();
  if (corruptPending) pending.set('bmu.student.checkout-request','broken-json');
  const storage = map => ({getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
  const requests=[]; let destination;
  const context = { document:{querySelector:s=>nodes[s],createElement:node},
    crypto:{getRandomValues:bytes=>crypto.randomFillSync(bytes)}, Uint8Array, AbortController, setTimeout,clearTimeout,
    localStorage:storage(cart),sessionStorage:storage(pending),location:{assign:url=>destination=url},
    FormData:class { *[Symbol.iterator](){yield* Object.entries({hostel:'BSH',block:'B',room:'418',instructions:'',fulfilment:'pickup',payment:'pickup'});} },
    fetch:async (url,opts)=>{
      if (url==='/api/profile') return {ok:!noProfile,json:async()=>noProfile?{error:'Sign in to continue.'}:{id:'student',name:'Test',email:'test@bmu.edu.in',hostel:'BSH'}};
      if(url==='/api/checkout/quote') return {ok:true,json:async()=>({items:[],subtotal:100,tax:0,discount:0,total:100})};
      requests.push(JSON.parse(opts.body));
      if(failFirst && requests.length===1) throw Object.assign(new Error('aborted'),{name:'AbortError'});
      return {ok:true,json:async()=>({id:'BMU-TEST'})};
    }
  };
  await vm.runInNewContext(source,context);
  return {nodes,cart,pending,requests,get destination(){return destination;},submit:()=>nodes['#checkout-form'].onsubmit({preventDefault(){}})};
}
test('HTTP browser without randomUUID submits, clears cart and opens tracking',async()=>{
  const s=await setup();assert.equal(s.nodes['#place-order'].disabled,false);
  await s.submit();assert.match(s.requests[0].requestId,/^[a-f0-9]{32}$/);
  assert.equal(s.cart.get('bmu.student.cart'),'[]');assert.equal(s.pending.size,0);
  assert.equal(s.destination,'tracking.html?id=BMU-TEST&confirmed=1');
});
test('timeout preserves cart and retries with same idempotency key',async()=>{
  const s=await setup({failFirst:true});await s.submit();
  assert.match(s.nodes['#checkout-status'].textContent,/too long/);
  assert.equal(s.nodes['#place-order'].disabled,false);assert.notEqual(s.cart.get('bmu.student.cart'),'[]');
  await s.submit();assert.equal(s.requests[0].requestId,s.requests[1].requestId);assert.ok(s.destination);
});
test('initialization failure prevents submission and leaves button disabled',async()=>{
  const s=await setup({noProfile:true});await s.submit();assert.equal(s.requests.length,0);assert.equal(s.nodes['#place-order'].disabled,true);
});
test('malformed saved checkout request recovers',async()=>{
  const s=await setup({corruptPending:true});await s.submit();assert.ok(s.destination);
});

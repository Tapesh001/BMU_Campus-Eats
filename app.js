async function startCampusPage() {
const response = await fetch("/api/profile");
const student = response.ok ? await response.json() : null;
const storagePrefix = student ? "bmu."+student.id+"." : "bmu.";
const page = document.body.dataset.page;
const named = name => '[data-name="' + name + '"]';
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const title = node => node.textContent.trim();
const pages = { Home:"index.html", Shops:"shops.html", Cart:"cart.html", Orders:"orders.html", Login:"login.html", Profile:"profile.html" };
const go = path => location.assign(path);
const sampleCart = [
  {shop:"Kathi Junction", dish:"Paneer kathi roll", price:120, qty:2},
  {shop:"Greenox", dish:"Protein power bowl", price:210, qty:1, unavailable:true}
];
const menu = {
  "Kathi Junction":["Paneer kathi roll",120], Greenox:["Protein power bowl",210],
  "Domino's":["Margherita pizza",199], "Burger Singh":["Veg burger",99],
  "Maggie Point":["Masala noodles",60], "Tuck Shop":["Campus snack box",75]
};
const load = (key, fallback) => JSON.parse(localStorage.getItem(storagePrefix+key) || "null") ?? fallback;
const save = (key, value) => localStorage.setItem(storagePrefix+key, JSON.stringify(value));
const cart = load("cart", student ? [] : sampleCart);
const orders = load("orders", []);

function control(node, action, href) {
  const el = document.createElement(href ? "a" : "button");
  el.className = node.className + " action";
  if (node.hasAttribute("data-water-box")) el.setAttribute("data-water-box","");
  if (href) el.href = href;
  else { el.type = "button"; el.addEventListener("click", action); }
  if (node.firstElementChild) {
    const label = document.createElement("span");
    label.className = node.firstElementChild.className;
    label.textContent = title(node);
    el.append(label);
  } else el.textContent = title(node);
  node.replaceWith(el);
  return el;
}
function modal(heading, message, actions = []) {
  const dialog = document.createElement("dialog");
  const h = document.createElement("h2");
  h.textContent = heading; h.id = "dialog-heading";
  dialog.setAttribute("aria-labelledby", h.id);
  const p = document.createElement("p"); p.textContent = message;
  dialog.append(h,p);
  for (const [label,run] of [...actions,["Close",()=>{}]]) {
    const btn = document.createElement("button"); btn.textContent = label;
    btn.onclick = () => { dialog.close(); run(); };
    dialog.append(btn);
  }
  dialog.onclose = () => dialog.remove();
  document.body.append(dialog); dialog.showModal();
}
for (const node of all('.navigation-links > p,.footer-links > p')) {
  const label = title(node);
  control(node, () => modal(label,"This preview supports student ordering only."), pages[label]);
}
if (page === "login") {
  const form = document.createElement("form");
  const card = document.querySelector(".login-modal");
  form.className = card.className; form.append(...card.childNodes); card.replaceWith(form);
  const fields = all(".form-field",form).map((field,i) => {
    const input = document.createElement("input");
    input.type = i ? "password" : "text"; input.required = true;
    input.id = i ? "passphrase" : "student";
    input.autocomplete = "off";
    input.placeholder = title(field.querySelector(".input"));
    const label = document.createElement("label");
    label.className = field.firstElementChild.className;
    label.textContent = title(field.firstElementChild); label.htmlFor = input.id;
    field.firstElementChild.replaceWith(label); field.querySelector(".input").replaceChildren(input);
    return input;
  });
  const status = document.createElement("small");
  status.setAttribute("role","status");
  form.insertBefore(status,form.querySelector(".primary-action"));
  fields[0].autocomplete="username"; fields[1].autocomplete="current-password";
  const submit = control(form.querySelector(named("Button")),()=>{}); submit.type="submit";
  form.onsubmit = async event => {
    event.preventDefault(); submit.disabled=true;
    try {
      const res=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({login:fields[0].value,password:fields[1].value})});
      if (!res.ok) throw new Error((await res.json()).error);
      location.assign("profile.html");
    } catch(e){status.textContent=e.message;} finally {submit.disabled=false;}
  };
  control(form.lastElementChild,null,"register.html");
}
if (page === "home") control(document.querySelector(named("Button")),null,pages.Shops);
if (page === "shops") {
  for (const card of all(named("Detailed shop card"))) {
    const shop = title(card.querySelector(named("Shop heading")+" > p"));
    const [dish,price] = menu[shop];
    const closed = card.querySelector(named("Shop heading")).textContent.includes("CLOSED");
    control(card.querySelector(named("Button")),()=>modal(shop, dish+" · ₹"+price+(closed?" · Closed":""),closed?[]:[
      ["Add to cart",()=>{
        const item = cart.find(row=>row.shop===shop && !row.unavailable);
        if (item) item.qty++; else cart.push({shop,dish,price,qty:1});
        save("cart",cart); go(pages.Cart);
      }]
    ]));
  }
}
if (page === "cart") {
  const table = document.querySelector(named("Cart table"));
  const rows = all(named("Table row"),table);
  const templates = rows.map(row=>row.cloneNode(true));
  rows.forEach(row=>row.remove());
  cart.forEach((item,index)=>{
    const row = templates[Number(!!item.unavailable)].cloneNode(true);
    const cells = all(named("Table cell")+" p",row);
    [item.shop,item.dish,item.qty,"₹"+item.price*item.qty].forEach((v,i)=>{cells[i].textContent=v;});
    const edit = control(cells[2],()=>modal(item.dish,"Quantity: "+item.qty,[
      ["Add one",()=>{item.qty++;save("cart",cart);location.reload();}],
      ["Remove one",()=>{if (--item.qty===0) cart.splice(index,1);save("cart",cart);location.reload();}]
    ]));
    edit.style.background = "transparent"; edit.setAttribute("aria-label","Change quantity for "+item.dish);
    table.append(row);
  });
  const buttons = all(named("Button"));
  control(buttons[0],null,pages.Shops);
  document.querySelector(".checkout-summary > p").textContent = "Total ₹"+cart.reduce((sum,i)=>sum+i.qty*i.price,0);
  const available = cart.filter(i=>!i.unavailable);
  const amount = available.reduce((sum,i)=>sum+i.price*i.qty,0);
  control(buttons[1],()=>modal("Demo checkout",available.length ?
    "Place a local pickup order for ₹"+amount+"? Unavailable items stay in your cart." :
    "Your cart has no available items.",available.length?[["Place demo order",()=>{
      for (const item of available) orders.unshift({...item,id:"#BMU-"+(1049+orders.length),date:new Date().toLocaleDateString()});
      save("orders",orders); save("cart",cart.filter(i=>i.unavailable)); go(pages.Orders);
    }]]:[]));
}
if (page === "orders") {
  const table = document.querySelector(named("Orders table"));
  const first = table.querySelector(named("Order row"));
  for (const item of orders) {
    const row = first.cloneNode(true);
    const cells = all(named("Table cell")+" p",row);
    [item.id,item.shop,item.date].forEach((v,i)=>{cells[i].textContent=v;});
    row.dataset.details = item.qty+" × "+item.dish+" · ₹"+item.qty*item.price;
    table.insertBefore(row,first);
  }
  for (const row of all(named("Order row"),table)) {
    const [id,shop,date,status] = all(named("Table cell")+" p",row).map(title);
    control(row.querySelector(named("Button")),()=>modal(id,[shop,date,status,row.dataset.details].filter(Boolean).join(" · ")));
  }
}
}
startCampusPage().catch(()=>{const error=document.createElement("p");error.setAttribute("role","alert");error.textContent="Campus Eats could not connect. Start the Express server and reload.";document.body.prepend(error);});

async function api(path, method = "GET", body) {
  const response = await fetch("/api/" + path, {method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)});
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Open this page through the Campus Eats Express server.");
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error), {status:response.status});
  return result;
}
const accountForm = document.querySelector("#register, #profile");
if (accountForm) {
  const status = document.querySelector("[role=status]");
  const registration = accountForm.id === "register";
  if (registration) accountForm.oninput = () => {
    const {password, confirm} = accountForm.elements;
    confirm.setCustomValidity(password.value === confirm.value ? "" : "Passwords must match.");
  };
  else {
    api("profile").then(student=>{
      for (const input of accountForm.querySelectorAll("[name]")) input.value = student[input.name];
      document.querySelector("#membership").textContent = "Member since " + new Date(student.joined).toLocaleDateString();
      accountForm.hidden = false;
      document.querySelector("#member-links").hidden = false;
    }).catch(error=>{
      status.textContent = error.message;
      document.querySelector("#guest-links").hidden = false;
    });
    document.querySelector("#logout").onclick = async()=>{
      try {await api("logout","POST",{});location.assign("login.html");} catch(e){status.textContent=e.message;}
    };
  }
  accountForm.onsubmit = async event=>{
    event.preventDefault();
    const data = Object.fromEntries(new FormData(accountForm));
    delete data.confirm;
    const button = accountForm.querySelector("button"); button.disabled = true;
    try {
      await api(registration ? "register" : "profile", registration ? "POST" : "PUT", data);
      if (registration) location.assign("profile.html");
      else status.textContent = "Profile saved.";
    } catch(error) {status.textContent = error.message;}
    finally {button.disabled = false;}
  };
}

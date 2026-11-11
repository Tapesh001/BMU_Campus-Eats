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
  let showProfile;
  if (registration) accountForm.oninput = () => {
    const {password, confirm} = accountForm.elements;
    confirm.setCustomValidity(password.value === confirm.value ? "" : "Passwords must match.");
  };
  else {
    let current;
    const edit = document.querySelector("#edit");
    const summary = document.querySelector("#summary");
    showProfile = student => {
      current = student;
      summary.replaceChildren();
      for (const input of accountForm.querySelectorAll("[name]")) {
        input.value = student[input.name];
        const group = document.createElement("div");
        const label = document.createElement("dt");
        label.textContent = input.labels[0].firstChild.textContent;
        const value = document.createElement("dd");
        value.textContent = input.value;
        group.append(label,value); summary.append(group);
      }
      document.querySelector("#pass-name").textContent = student.name;
      document.querySelector("#initials").textContent = student.name.split(/\s+/).slice(0,2).map(s=>Array.from(s)[0]).join("").toUpperCase();
      document.querySelector("#pass-number").textContent = student.studentId;
      document.querySelector("#membership").textContent = "Member since " + new Date(student.joined).toLocaleDateString();
      edit.hidden = false; summary.hidden = false; accountForm.hidden = true;
      document.querySelector("#member-links").hidden = false;
    };
    edit.onclick = () => {
      edit.hidden = true; summary.hidden = true; accountForm.hidden = false;
      status.textContent = ""; accountForm.elements.name.focus();
    };
    document.querySelector("#cancel").onclick = () => {showProfile(current);status.textContent="";edit.focus();};
    api("profile").then(student=>{
      showProfile(student); status.textContent = "";
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
      const saved = await api(registration ? "register" : "profile", registration ? "POST" : "PUT", data);
      if (registration) location.assign("profile.html");
      else {showProfile(saved); status.textContent = "Profile saved.";document.querySelector("#edit").focus();}
    } catch(error) {status.textContent = error.message;}
    finally {button.disabled = false;}
  };
}

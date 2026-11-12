(() => {
  const requestForm = document.querySelector('#request-code');
  const resetForm = document.querySelector('#reset-password');
  const status = document.querySelector('#reset-status');
  let email = '', busy = false;
  function lock(value) {
    busy = value;
    document.querySelectorAll('form button').forEach(button => button.disabled = value);
  }
  async function post(action, body) {
    const response = await fetch('/api/password-reset/' + action, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to reset password. Please try again.');
    return result;
  }
  async function requestCode() {
    lock(true); status.textContent = 'Requesting your code…';
    try {
      const result = await post('request', { email });
      status.textContent = result.message;
      requestForm.hidden = true; resetForm.hidden = false;
      document.querySelector('#reset-recipient').textContent = 'Code requested for ' + email;
      resetForm.elements.code.focus();
    } catch (error) { status.textContent = error.message; }
    finally { lock(false); }
  }
  requestForm.onsubmit = event => {
    event.preventDefault(); if (busy) return;
    email = requestForm.elements.email.value.trim().toLowerCase(); requestCode();
  };
  resetForm.oninput = () => resetForm.elements.confirm.setCustomValidity(
    resetForm.elements.password.value === resetForm.elements.confirm.value ? '' : 'Passwords must match.'
  );
  resetForm.onsubmit = async event => {
    event.preventDefault(); if (busy) return;
    lock(true); status.textContent = 'Checking the code and updating your password…';
    try {
      const result = await post('confirm', { email, code: resetForm.elements.code.value.trim(), password: resetForm.elements.password.value });
      resetForm.reset(); resetForm.hidden = true; requestForm.hidden = true;
      status.textContent = result.message;
      document.querySelector('a[href="login.html"]').focus();
    } catch (error) { status.textContent = error.message; }
    finally { lock(false); }
  };
  document.querySelector('#resend-code').onclick = () => { if (!busy) requestCode(); };
  document.querySelector('#change-email').onclick = () => {
    resetForm.reset(); resetForm.hidden = true; requestForm.hidden = false;
    resetForm.elements.confirm.setCustomValidity(''); status.textContent = '';
    requestForm.elements.email.focus();
  };
})();

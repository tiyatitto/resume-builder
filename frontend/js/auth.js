// Auth logic for register.html and login.html

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const errorMsg = document.getElementById('error-msg');

  const showError = (msg) => {
    if(errorMsg) {
      errorMsg.textContent = msg;
      errorMsg.style.display = 'block';
    }
  };

  // If already logged in, redirect to dashboard
  if (window.api && window.api.getToken() && (loginForm || registerForm)) {
    window.location.href = '/dashboard.html';
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const res = await window.api.auth.login({ email, password });
        if (res.token) {
          window.api.setToken(res.token);
          window.location.href = '/dashboard.html';
        }
      } catch (err) {
        showError(err.message);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      if (password !== confirmPassword) {
        return showError('Passwords do not match');
      }

      try {
        const res = await window.api.auth.register({ name, email, password });
        if (res.token) {
          window.api.setToken(res.token);
          window.location.href = '/dashboard.html';
        }
      } catch (err) {
        showError(err.message);
      }
    });
  }
});

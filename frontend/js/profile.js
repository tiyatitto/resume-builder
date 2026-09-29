document.addEventListener('DOMContentLoaded', async () => {
  if (!window.api.getToken()) {
    window.location.href = '/login.html';
    return;
  }

  // Bind logout
  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    window.api.clearToken();
    window.location.href = '/login.html';
  });

  await loadProfile();
});

async function loadProfile() {
  const container = document.getElementById('profile-content');
  try {
    const res = await fetch('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${window.api.getToken()}`
      }
    });
    const result = await res.json();
    
    if (result.success && result.data) {
      const user = result.data;
      container.innerHTML = `
        <div class="form-group mb-4">
          <label style="font-weight: bold; color: #4B5563;">Name</label>
          <div style="padding: 0.5rem; background: #F9FAFB; border-radius: 4px; border: 1px solid #E5E7EB;">
            ${user.name || 'Not provided'}
          </div>
        </div>
        <div class="form-group mb-4">
          <label style="font-weight: bold; color: #4B5563;">Email Address</label>
          <div style="padding: 0.5rem; background: #F9FAFB; border-radius: 4px; border: 1px solid #E5E7EB;">
            ${user.email || 'Not provided'}
          </div>
        </div>
        <div class="form-group mb-4">
          <label style="font-weight: bold; color: #4B5563;">Account Created</label>
          <div style="padding: 0.5rem; background: #F9FAFB; border-radius: 4px; border: 1px solid #E5E7EB;">
            ${new Date(user.createdAt).toLocaleDateString()}
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `<div style="color: #DC2626;">Failed to load profile data.</div>`;
    }
  } catch (err) {
    console.error('Profile fetch error:', err);
    container.innerHTML = `<div style="color: #DC2626;">An error occurred while loading profile.</div>`;
  }
}

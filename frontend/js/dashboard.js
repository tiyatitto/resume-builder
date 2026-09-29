document.addEventListener('DOMContentLoaded', async () => {
  // Check if authenticated
  if (!window.api.getToken()) {
    window.location.href = '/login.html';
    return;
  }

  const userNameEl = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');
  const resumeActions = document.getElementById('resume-actions');
  
  // Stats elements
  const completionStat = document.getElementById('stat-completion');
  const atsStat = document.getElementById('stat-ats');
  const roleStat = document.getElementById('stat-role');
  const templateStat = document.getElementById('stat-template');

  try {
    // 1. Fetch Profile
    const profile = await window.api.auth.getProfile();
    userNameEl.textContent = profile.name;

    // 2. Fetch Resumes
    const res = await window.api.resume.getAll();
    const resumes = res.data || [];

    if (resumes.length > 0) {
      const activeResume = resumes[0]; // Currently just using the first resume
      
      // Calculate Completion Score
      let comp = 0, compTotal = 8;
      const p = activeResume.personalInfo || {};
      if (p.fullName && p.email && p.phone) comp++;
      if (p.summary) comp++;
      if (activeResume.education && activeResume.education.length > 0) comp++;
      if (activeResume.experience && activeResume.experience.length > 0) comp++;
      if (activeResume.skills && activeResume.skills.length > 0) comp++;
      if (activeResume.projects && activeResume.projects.length > 0) comp++;
      if (p.linkedin || p.github) comp++;
      if ((activeResume.certifications && activeResume.certifications.length > 0) || (activeResume.achievements && activeResume.achievements.length > 0)) comp++;
      const compPct = Math.round((comp / compTotal) * 100);

      // Calculate ATS Score
      let ats = 0, atsTotal = 10;
      if (p.fullName) ats++;
      if (p.email && p.phone) ats++;
      if (p.professionalTitle || activeResume.targetJobRole) ats++;
      if (p.summary && p.summary.length > 20) ats++;
      if (activeResume.education && activeResume.education.length > 0) ats++;
      if (activeResume.experience && activeResume.experience.length > 0) ats++;
      if (activeResume.skills && activeResume.skills.length >= 3) ats++;
      if (activeResume.projects && activeResume.projects.length > 0) ats++;
      const hasDesc = (activeResume.experience || []).some(e => e.description && e.description.length > 10) || (activeResume.projects || []).some(pr => pr.description && pr.description.length > 10);
      if (hasDesc) ats++;
      if (p.linkedin || p.github) ats++;
      const atsPct = Math.round((ats / atsTotal) * 100);

      completionStat.textContent = `${compPct}%`;
      atsStat.textContent = `${atsPct}%`;
      roleStat.textContent = activeResume.targetJobRole || 'Not Set';
      templateStat.textContent = activeResume.selectedTemplate || 'Modern Minimal';

      resumeActions.innerHTML = resumes.map((resume, index) => {
        const id = encodeURIComponent(resume._id);
        const name = (resume.personalInfo?.fullName || `Resume ${index + 1}`).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        return `
          <div class="dashboard-resume-actions">
            <strong>${name}</strong>
            <a class="btn btn-primary" href="/builder.html?id=${id}">Edit Resume</a>
            <a class="btn btn-secondary" href="/preview.html?id=${id}">Preview</a>
            <a class="btn btn-secondary" href="/preview.html?id=${id}&download=1">Download PDF</a>
            <button class="btn btn-secondary" onclick="deleteResume('${id}')" style="color:var(--error-color); border-color:var(--error-color);">Delete</button>
          </div>`;
      }).join('') + '<button class="btn btn-secondary" onclick="createNewResume()">Create another resume</button>';
    } else {
      // No resumes
      resumeActions.innerHTML = `
        <button class="btn btn-primary" onclick="createNewResume()">Create Your First Resume</button>
      `;
    }
  } catch (err) {
    console.error(err);
    // If token invalid, api.js will redirect. If other error, just log for now.
  }

  // Logout handler
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.api.clearToken();
    window.location.href = '/login.html';
  });
});

window.createNewResume = async function() {
  try {
    window.location.href = '/builder.html';
  } catch (err) {
    alert(err.message);
  }
}

window.deleteResume = async function(id) {
  if(confirm('Are you sure you want to delete this resume?')) {
    try {
      await window.api.resume.delete(id);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  }
}

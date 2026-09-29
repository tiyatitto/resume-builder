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

  // Bind download PDF
  document.getElementById('download-pdf-btn').addEventListener('click', downloadPDF);

  await loadResume();
});

async function loadResume() {
  try {
    const resumeId = new URLSearchParams(window.location.search).get('id');
    let resume;
    if (resumeId) {
      const result = await window.api.resume.getById(resumeId);
      resume = result.data;
    } else {
      const result = await window.api.resume.getAll();
      resume = result.data?.[0];
    }
    if (resume) {
      const previewBox = document.getElementById('resume-preview');
      
      window.renderResume(resume, previewBox);
      document.getElementById('edit-resume-link').href = `/builder.html?id=${encodeURIComponent(resume._id)}`;
      if (new URLSearchParams(window.location.search).get('download') === '1') downloadPDF(new Event('click'));
    } else {
      document.getElementById('resume-preview').innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #6B7280;">
          No resume found. <br><br>
          <a href="/builder.html" class="btn btn-primary" style="padding: 0.5rem 1rem; text-decoration: none;">Create Resume</a>
        </div>
      `;
    }
  } catch (err) {
    console.error('Failed to load resume:', err);
    document.getElementById('resume-preview').innerHTML = `<div style="text-align: center; padding: 3rem; color: #DC2626;">Error loading resume.</div>`;
  }
}

async function downloadPDF(e) {
  e?.preventDefault();
  const element = document.getElementById('resume-preview');
  
  // Quick check if there's actually a resume to download
  if(element.innerText.includes('No resume found') || element.innerText.includes('Loading resume')) return;

  try {
    await window.exportResumePDF(element);
  } catch (error) {
    console.error('PDF export failed:', error);
  }
}

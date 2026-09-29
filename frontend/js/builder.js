const resumeEntryFields = {
  education: [
    ['degree', 'Qualification / Degree', 'edu-degree'], ['institution', 'Institution / College / University', 'edu-institution'],
    ['fieldOfStudy', 'Field of Study / Specialization', 'edu-field'], ['location', 'Location', 'edu-location'],
    ['startYear', 'Start Year', 'edu-start'], ['endYear', 'End Year / Expected Graduation', 'edu-end'],
    ['grade', 'Grade / CGPA / Percentage', 'edu-grade'], ['description', 'Description', 'edu-description', 'textarea']
  ],
  experience: [
    ['jobTitle', 'Job Title', 'exp-title'], ['company', 'Company', 'exp-company'], ['location', 'Location', 'exp-location'],
    ['startDate', 'Start Date', 'exp-start'], ['endDate', 'End Date', 'exp-end'],
    ['current', 'I currently work here', 'exp-current', 'checkbox'], ['description', 'Description', 'exp-description', 'textarea']
  ],
  skills: [['name', 'Skill', 'skill-name'], ['proficiency', 'Proficiency', 'skill-proficiency']],
  projects: [
    ['title', 'Project Title', 'proj-title'], ['technologies', 'Technologies', 'proj-technologies'],
    ['link', 'Project Link', 'proj-link'], ['description', 'Description', 'proj-description', 'textarea']
  ],
  certifications: [
    ['name', 'Certificate Name', 'cert-name'], ['organization', 'Issuing Organization', 'cert-organization'],
    ['issueDate', 'Issue Date', 'cert-date'], ['credentialId', 'Credential ID', 'cert-id'], ['link', 'Credential URL', 'cert-link']
  ],
  achievements: [['name', 'Achievement', 'achieve-name']],
  languages: [['name', 'Language', 'lang-name'], ['proficiency', 'Proficiency', 'lang-proficiency']]
};

let currentResumeId = null;
let selectedPhotoData = '';
let isSavingResume = false;
let layoutAutoRequested = false;
const pendingCertificateFiles = new WeakMap();
const pendingCertificateDeletes = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.api.getToken()) {
    window.location.href = '/login.html';
    return;
  }

  currentResumeId = new URLSearchParams(window.location.search).get('id');
  document.getElementById('logout-btn')?.addEventListener('click', event => {
    event.preventDefault();
    window.api.clearToken();
    window.location.href = '/login.html';
  });
  document.getElementById('save-btn')?.addEventListener('click', () => saveResume(false));
  document.getElementById('create-resume-btn')?.addEventListener('click', () => saveResume(true));
  document.getElementById('submit-resume-btn')?.addEventListener('click', () => saveResume(true));
  document.getElementById('download-pdf-btn')?.addEventListener('click', downloadPDF);
  document.getElementById('upload-photo-btn')?.addEventListener('click', () => document.getElementById('profile-photo-file').click());
  document.getElementById('remove-photo-btn')?.addEventListener('click', removePhoto);
  document.getElementById('profile-photo-file')?.addEventListener('change', handlePhotoSelection);
  document.getElementById('auto-layout-btn')?.addEventListener('click', () => applyAutomaticDesign(collectResumeData()));
  document.getElementById('selectedLayout')?.addEventListener('change', () => {
    document.getElementById('layoutMode').value = 'manual';
    updatePreview();
    renderDesignGalleries();
  });
  document.getElementById('selectedTheme')?.addEventListener('change', () => {
    document.getElementById('themeMode').value = 'manual';
    if (document.getElementById('accentMode').value === 'auto') {
      document.getElementById('accentColor').value = window.resumeThemeAccents[document.getElementById('selectedTheme').value];
    }
    updatePreview();
    renderDesignGalleries();
  });
  document.getElementById('accentColor')?.addEventListener('input', () => {
    document.getElementById('accentMode').value = 'manual';
    updatePreview();
  });
  document.getElementById('selectedFont')?.addEventListener('input', updatePreview);
  document.getElementById('layout-gallery')?.addEventListener('click', event => {
    const option = event.target.closest('[data-layout-choice]');
    if (!option) return;
    document.getElementById('selectedLayout').value = option.dataset.layoutChoice;
    document.getElementById('layoutMode').value = 'manual';
    layoutAutoRequested = false;
    updatePreview();
    renderDesignGalleries();
  });
  document.getElementById('theme-gallery')?.addEventListener('click', event => {
    const option = event.target.closest('[data-theme-choice]');
    if (!option) return;
    document.getElementById('selectedTheme').value = option.dataset.themeChoice;
    document.getElementById('themeMode').value = 'manual';
    if (document.getElementById('accentMode').value === 'auto') {
      document.getElementById('accentColor').value = window.resumeThemeAccents[option.dataset.themeChoice];
    }
    updatePreview();
    renderDesignGalleries();
  });

  const formPanel = document.querySelector('.builder-form-panel');
  formPanel?.addEventListener('input', updatePreview);
  formPanel?.addEventListener('change', event => {
    if (event.target.matches('.certificate-file-input')) handleCertificateSelection(event.target);
    updatePreview();
  });
  formPanel?.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add-section]');
    if (addButton) addDynamicEntry(addButton.dataset.addSection);

    const removeButton = event.target.closest('.remove-btn');
    if (removeButton) {
      const entry = removeButton.closest('.dynamic-entry');
      if (entry.dataset.section === 'certifications') {
        const certId = entry.querySelector('[data-field="_id"]')?.value;
        if (certId && entry.querySelector('[data-field="uploadedFileId"]')?.value) pendingCertificateDeletes.add(`${certId}`);
      }
      entry.remove();
      updatePreview();
    }

    const uploadButton = event.target.closest('.certificate-upload-btn');
    if (uploadButton) uploadButton.closest('.dynamic-entry').querySelector('.certificate-file-input').click();

    const clearFileButton = event.target.closest('.certificate-remove-file-btn');
    if (clearFileButton) clearCertificateFile(clearFileButton.closest('.dynamic-entry'));

    const viewButton = event.target.closest('.certificate-view-btn');
    if (viewButton) viewCertificate(viewButton.closest('.dynamic-entry'));
  });

  await loadResumeData();
  renderDesignGalleries();
});

function addDynamicEntry(section, data = {}) {
  const fields = resumeEntryFields[section];
  const container = document.getElementById(`${section}-container`);
  if (!fields || !container) return null;

  const entry = document.createElement('div');
  entry.className = 'dynamic-entry';
  entry.dataset.section = section;
  const fieldContainer = document.createElement('div');
  fieldContainer.className = 'dynamic-fields';
  fields.forEach(([key, labelText, className, type]) => {
    const label = document.createElement('label');
    label.className = 'form-group';
    label.append(document.createTextNode(labelText));
    let control;
    if (type === 'checkbox') {
      control = document.createElement('input');
      control.type = 'checkbox';
      label.classList.add('dynamic-checkbox');
    } else if (type === 'textarea') {
      control = document.createElement('textarea');
      control.rows = 3;
      control.className = 'form-control';
    } else {
      control = document.createElement('input');
      control.type = key === 'issueDate' ? 'date' : key === 'link' && section === 'certifications' ? 'url' : 'text';
      control.className = 'form-control';
    }
    control.classList.add(className);
    control.dataset.field = key;
    control.value = type === 'checkbox' ? '' : (data[key] ?? '');
    if (type === 'checkbox') control.checked = Boolean(data[key]);
    if (section === 'education' && ['degree', 'institution'].includes(key)) control.required = true;
    if (section === 'certifications' && key === 'name') control.required = true;
    label.append(control);
    if ((section === 'education' && ['degree', 'institution'].includes(key)) || (section === 'certifications' && key === 'name')) {
      const error = document.createElement('span');
      error.className = 'field-error';
      error.setAttribute('aria-live', 'polite');
      error.dataset.errorFor = key;
      label.append(error);
    }
    fieldContainer.append(label);
  });

  if (section === 'certifications') addCertificateControls(entry, data);
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'remove-btn';
  removeButton.textContent = 'Remove';
  removeButton.setAttribute('aria-label', `Remove ${section} entry`);
  entry.append(removeButton, fieldContainer);
  container.append(entry);
  updatePreview();
  return entry;
}

function addCertificateControls(entry, data) {
  const metadata = ['_id', 'year', 'uploadedFileId', 'uploadedFilename', 'uploadedContentType'];
  metadata.forEach(field => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.dataset.field = field;
    input.value = data[field] || '';
    entry.append(input);
  });
  const controls = document.createElement('div');
  controls.className = 'certificate-file-controls';
  const upload = document.createElement('button');
  upload.type = 'button';
  upload.className = 'btn btn-secondary btn-sm certificate-upload-btn';
  upload.textContent = data.uploadedFilename ? 'Replace Certificate' : 'Upload Certificate';
  const file = document.createElement('input');
  file.type = 'file';
  file.hidden = true;
  file.accept = 'application/pdf,image/jpeg,image/png';
  file.className = 'certificate-file-input';
  const filename = document.createElement('span');
  filename.className = 'certificate-filename';
  filename.textContent = data.uploadedFilename || 'No certificate file selected';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn btn-secondary btn-sm certificate-remove-file-btn';
  remove.textContent = 'Remove File';
  remove.hidden = !data.uploadedFilename;
  const view = document.createElement('button');
  view.type = 'button';
  view.className = 'btn btn-secondary btn-sm certificate-view-btn';
  view.textContent = 'View / Download';
  view.hidden = !data.uploadedFileId;
  controls.append(upload, file, filename, remove, view);
  entry.append(controls);
}

function collectResumeData() {
  const personalInfo = {};
  ['fullName', 'professionalTitle', 'email', 'phone', 'location', 'summary', 'linkedin', 'github', 'portfolio'].forEach(key => {
    personalInfo[key] = document.getElementById(key)?.value.trim() || '';
  });
  personalInfo.profilePhoto = document.getElementById('profilePhoto')?.value.trim() || '';
  const resume = {
    personalInfo,
    targetJobRole: document.getElementById('targetJobRole')?.value.trim() || '',
    selectedTemplate: document.getElementById('selectedTemplate')?.value || 'modern-minimal',
    selectedLayout: document.getElementById('selectedLayout')?.value || 'compact',
    selectedTheme: document.getElementById('selectedTheme')?.value || 'modern-blue',
    themeMode: document.getElementById('themeMode')?.value || 'auto',
    accentMode: document.getElementById('accentMode')?.value || 'auto',
    accentColor: document.getElementById('accentColor')?.value || '#1F3A5F',
    selectedFont: document.getElementById('selectedFont')?.value || 'modern',
    layoutMode: document.getElementById('layoutMode')?.value || 'auto',
    isSubmitted: false
  };
  Object.keys(resumeEntryFields).forEach(section => {
    const items = [...document.querySelectorAll(`#${section}-container .dynamic-entry`)].map(entry => {
      const item = {};
      entry.querySelectorAll('[data-field]').forEach(input => {
        if (input.dataset.field === '_id' || input.dataset.field.startsWith('uploaded')) {
          if (input.value) item[input.dataset.field] = input.value;
        } else {
          item[input.dataset.field] = input.type === 'checkbox' ? input.checked : input.value.trim();
        }
      });
      return item;
    });
    resume[section] = items.filter(item => Object.entries(item).some(([key, value]) => {
      if (key === '_id' || key.startsWith('uploaded')) return false;
      return key === 'current' ? value : Boolean(value);
    }));
    if (section === 'achievements') resume[section] = resume[section].map(item => item.name).filter(Boolean);
  });
  return resume;
}

function validateResume(finalSubmit) {
  document.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
  if (!finalSubmit) return null;
  const personal = collectResumeData().personalInfo;
  if (!personal.fullName.trim()) return { element: document.getElementById('fullName'), message: 'Enter your full name.' };
  if (!personal.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) {
    return { element: document.getElementById('email'), message: 'Enter a valid email address.' };
  }
  const educationEntries = [...document.querySelectorAll('#education-container .dynamic-entry')];
  if (!educationEntries.length) return { element: document.querySelector('[data-add-section="education"]'), message: 'Add at least one education entry before submitting.' };
  for (const entry of educationEntries) {
    for (const field of ['degree', 'institution']) {
      const input = entry.querySelector(`[data-field="${field}"]`);
      if (!input.value.trim()) {
        entry.querySelector(`[data-error-for="${field}"]`).textContent = `${field === 'degree' ? 'Qualification / Degree' : 'Institution'} is required.`;
        return { element: input, message: `${field === 'degree' ? 'Qualification / Degree' : 'Institution'} is required.` };
      }
    }
  }
  for (const entry of document.querySelectorAll('#certifications-container .dynamic-entry')) {
    const name = entry.querySelector('[data-field="name"]');
    if (!name.value.trim()) {
      entry.querySelector('[data-error-for="name"]').textContent = 'Certificate name is required.';
      return { element: name, message: 'Certificate name is required.' };
    }
  }
  for (const file of document.querySelectorAll('.certificate-file-input')) {
    if (file.files[0] && !validateCertificateFile(file.files[0])) return { element: file, message: 'Certificate must be a PDF, JPG, JPEG, or PNG no larger than 5 MB.' };
  }
  return null;
}

async function saveResume(finalSubmit) {
  if (isSavingResume) return;
  const invalid = validateResume(finalSubmit);
  if (invalid) {
    showMessage(invalid.message, false);
    invalid.element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    invalid.element?.focus?.();
    return;
  }
  const data = collectResumeData();
  data.isSubmitted = finalSubmit;
  if ((!currentResumeId || layoutAutoRequested) && data.layoutMode === 'auto') {
    const automaticDesign = window.chooseAutomaticDesign(data);
    data.selectedLayout = automaticDesign.selectedLayout;
    if (data.themeMode === 'auto') data.selectedTheme = automaticDesign.selectedTheme;
    document.getElementById('selectedLayout').value = data.selectedLayout;
    document.getElementById('selectedTheme').value = data.selectedTheme;
    if (data.accentMode === 'auto') document.getElementById('accentColor').value = window.resumeThemeAccents[data.selectedTheme];
  }
  const saveButtons = ['save-btn', 'create-resume-btn', 'submit-resume-btn'].map(id => document.getElementById(id)).filter(Boolean);
  isSavingResume = true;
  saveButtons.forEach(button => { button.disabled = true; });
  try {
    const result = currentResumeId
      ? await window.api.resume.update(currentResumeId, data)
      : await window.api.resume.create(data);
    currentResumeId = result.data._id;
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('id', currentResumeId);
    window.history.replaceState({}, '', currentUrl);
    document.getElementById('create-resume-btn')?.setAttribute('hidden', '');
    await persistCertificateFiles(result.data);
    layoutAutoRequested = false;
    showMessage(finalSubmit ? 'Resume submitted successfully.' : 'Draft saved successfully.', true);
    updatePreview();
    if (finalSubmit) window.setTimeout(() => { window.location.href = `/preview.html?id=${encodeURIComponent(currentResumeId)}`; }, 900);
  } catch (error) {
    showMessage(error.message || 'Unable to save the resume. Please try again.', false);
  } finally {
    isSavingResume = false;
    saveButtons.forEach(button => { button.disabled = false; });
  }
}

async function persistCertificateFiles(savedResume) {
  const certRows = [...document.querySelectorAll('#certifications-container .dynamic-entry')]
    .filter(row => row.querySelector('[data-field="name"]').value.trim());
  for (let index = 0; index < certRows.length; index += 1) {
    const row = certRows[index];
    const file = pendingCertificateFiles.get(row);
    const certificate = savedResume.certifications?.[index];
    if (!certificate?._id) continue;
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      const result = await window.api.resume.uploadCertificate(currentResumeId, certificate._id, {
        filename: file.name, contentType: file.type, data: dataUrl
      });
      row.querySelector('[data-field="_id"]').value = certificate._id;
      row.querySelector('[data-field="uploadedFileId"]').value = result.data.fileId;
      row.querySelector('[data-field="uploadedFilename"]').value = result.data.filename;
      row.querySelector('[data-field="uploadedContentType"]').value = result.data.contentType;
      pendingCertificateFiles.delete(row);
    }
  }
  for (const certificationId of pendingCertificateDeletes) {
    await window.api.resume.deleteCertificate(currentResumeId, certificationId);
  }
  pendingCertificateDeletes.clear();
  const updatedData = collectResumeData();
  updatedData.isSubmitted = savedResume.isSubmitted;
  await window.api.resume.update(currentResumeId, updatedData);
}

function validateCertificateFile(file) {
  return ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) && file.size <= 5 * 1024 * 1024;
}

function handleCertificateSelection(input) {
  const file = input.files[0];
  if (!file) return;
  const entry = input.closest('.dynamic-entry');
  if (!validateCertificateFile(file)) {
    input.value = '';
    showMessage('Certificate must be a PDF, JPG, JPEG, or PNG no larger than 5 MB.', false);
    return;
  }
  pendingCertificateFiles.set(entry, file);
  entry.querySelector('.certificate-filename').textContent = file.name;
  entry.querySelector('.certificate-remove-file-btn').hidden = false;
  updatePreview();
}

function clearCertificateFile(entry) {
  const id = entry.querySelector('[data-field="_id"]')?.value;
  const fileId = entry.querySelector('[data-field="uploadedFileId"]')?.value;
  if (id && fileId) pendingCertificateDeletes.add(id);
  pendingCertificateFiles.delete(entry);
  entry.querySelector('.certificate-file-input').value = '';
  entry.querySelector('[data-field="uploadedFileId"]').value = '';
  entry.querySelector('[data-field="uploadedFilename"]').value = '';
  entry.querySelector('[data-field="uploadedContentType"]').value = '';
  entry.querySelector('.certificate-filename').textContent = 'No certificate file selected';
  entry.querySelector('.certificate-remove-file-btn').hidden = true;
  entry.querySelector('.certificate-view-btn').hidden = true;
}

async function viewCertificate(entry) {
  const certificateId = entry.querySelector('[data-field="_id"]')?.value;
  if (!currentResumeId || !certificateId) return;
  try {
    const response = await fetch(`/api/resume/${encodeURIComponent(currentResumeId)}/certificates/${encodeURIComponent(certificateId)}`, {
      headers: { Authorization: `Bearer ${window.api.getToken()}` }
    });
    if (!response.ok) throw new Error('Unable to retrieve this certificate.');
    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = entry.querySelector('[data-field="uploadedFilename"]').value || 'certificate';
    anchor.target = '_blank';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (error) {
    showMessage(error.message, false);
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function loadResumeData() {
  if (!currentResumeId) {
    updatePreview();
    return;
  }
  try {
    const result = await window.api.resume.getById(currentResumeId);
    const resume = result.data;
    const personalInfo = resume.personalInfo || {};
    ['fullName', 'professionalTitle', 'email', 'phone', 'location', 'summary', 'linkedin', 'github', 'portfolio'].forEach(key => {
      const input = document.getElementById(key);
      if (input) input.value = personalInfo[key] || '';
    });
    document.getElementById('targetJobRole').value = resume.targetJobRole || '';
    document.getElementById('selectedTemplate').value = resume.selectedTemplate || 'modern-minimal';
    document.getElementById('selectedLayout').value = window.normalizeResumeLayout(resume.selectedLayout || window.chooseAutomaticDesign(resume).selectedLayout);
    document.getElementById('selectedTheme').value = window.normalizeResumeTheme(resume.selectedTheme || 'modern-blue');
    document.getElementById('accentMode').value = resume.accentMode || (resume.accentColor ? 'manual' : 'auto');
    document.getElementById('accentColor').value = resume.accentColor || window.resumeThemeAccents[document.getElementById('selectedTheme').value];
    document.getElementById('selectedFont').value = resume.selectedFont || 'modern';
    document.getElementById('layoutMode').value = resume.layoutMode || (resume.selectedLayout ? 'manual' : 'auto');
    document.getElementById('themeMode').value = resume.themeMode || (resume.selectedTheme ? 'manual' : 'auto');
    selectedPhotoData = personalInfo.profilePhoto || '';
    document.getElementById('profilePhoto').value = selectedPhotoData;
    if (selectedPhotoData && !selectedPhotoData.startsWith('data:image/')) document.getElementById('profile-photo-url').value = selectedPhotoData;
    updatePhotoPreview();
    Object.keys(resumeEntryFields).forEach(section => {
      (resume[section] || []).forEach(item => addDynamicEntry(section, section === 'achievements' ? { name: item } : item));
    });
    updatePreview();
  } catch (error) {
    showMessage(error.message || 'Unable to load this resume.', false);
  }
}

function handlePhotoSelection(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    event.target.value = '';
    showMessage('Choose a JPG, JPEG, PNG, or WebP image no larger than 2 MB.', false);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    selectedPhotoData = reader.result;
    document.getElementById('profilePhoto').value = selectedPhotoData;
    document.getElementById('profile-photo-url').value = '';
    updatePhotoPreview();
    updatePreview();
  };
  reader.onerror = () => showMessage('The selected photo could not be read.', false);
  reader.readAsDataURL(file);
}

function updatePhotoUrl() {
  selectedPhotoData = document.getElementById('profile-photo-url').value.trim();
  document.getElementById('profilePhoto').value = selectedPhotoData;
  updatePhotoPreview();
  updatePreview();
}

function updatePhotoPreview() {
  const image = document.getElementById('profile-photo-preview');
  if (!image) return;
  const photo = selectedPhotoData || document.getElementById('profilePhoto')?.value;
  image.hidden = !photo;
  image.src = photo || '';
  const remove = document.getElementById('remove-photo-btn');
  if (remove) remove.hidden = !photo;
}

function removePhoto() {
  selectedPhotoData = '';
  document.getElementById('profilePhoto').value = '';
  document.getElementById('profile-photo-url').value = '';
  document.getElementById('profile-photo-file').value = '';
  updatePhotoPreview();
  updatePreview();
}

function updatePreview() {
  const preview = document.getElementById('resume-preview');
  if (!preview || !window.renderResume) return;
  const data = collectResumeData();
  if (!currentResumeId && data.layoutMode === 'auto') {
    const design = window.chooseAutomaticDesign(data);
    data.selectedLayout = design.selectedLayout;
    document.getElementById('selectedLayout').value = design.selectedLayout;
    if (data.themeMode === 'auto') {
      data.selectedTheme = design.selectedTheme;
      document.getElementById('selectedTheme').value = design.selectedTheme;
    }
    if (data.accentMode === 'auto') document.getElementById('accentColor').value = window.resumeThemeAccents[data.selectedTheme];
  }
  window.renderResume(data, preview);
  syncGallerySelection();
  const activeCount = ['education', 'experience', 'skills', 'projects', 'certifications', 'achievements', 'languages'].filter(key => data[key].length).length;
  const percent = Math.round((activeCount + [data.personalInfo.fullName, data.personalInfo.email, data.personalInfo.phone, data.personalInfo.summary].filter(Boolean).length) / 11 * 100);
  document.getElementById('completion-score-text').textContent = `${percent}%`;
  document.getElementById('completion-progress').style.width = `${percent}%`;
  document.getElementById('ats-score-text').textContent = `${Math.round(percent * 0.9)}%`;
  document.getElementById('ats-suggestions').innerHTML = data.personalInfo.fullName ? '' : '<li>Add your name to personalize the resume.</li>';
  document.getElementById('job-recommendations').textContent = data.targetJobRole || 'Add a target role for tailored suggestions.';
}

function applyAutomaticDesign(data) {
  const automatic = window.chooseAutomaticDesign(data);
  layoutAutoRequested = true;
  document.getElementById('selectedLayout').value = automatic.selectedLayout;
  document.getElementById('layoutMode').value = 'auto';
  if (document.getElementById('themeMode').value === 'auto') {
    document.getElementById('selectedTheme').value = automatic.selectedTheme;
    if (document.getElementById('accentMode').value === 'auto') document.getElementById('accentColor').value = window.resumeThemeAccents[automatic.selectedTheme];
  }
  updatePreview();
  renderDesignGalleries();
  showMessage(`Automatic layout selected: ${document.getElementById('selectedLayout').selectedOptions[0].text}.`, true);
}

function createGallerySample() {
  return {
    personalInfo: {
      fullName: 'Your Name',
      professionalTitle: 'Professional Title',
      email: 'name@example.com',
      location: 'City',
      summary: 'A concise summary.'
    },
    education: [{ degree: 'Degree', institution: 'Institution', startYear: '2020', endYear: '2024' }],
    experience: [{ jobTitle: 'Role', company: 'Company', startDate: '2022', endDate: 'Present' }],
    skills: [{ name: 'Skill one' }, { name: 'Skill two' }],
    projects: [{ title: 'Project' }],
    certifications: [{ name: 'Certification' }],
    achievements: [],
    languages: [{ name: 'Language' }],
    selectedTemplate: document.getElementById('selectedTemplate').value,
    selectedFont: document.getElementById('selectedFont').value,
    accentMode: 'auto'
  };
}

function makeGalleryPreview(layout, theme) {
  const preview = document.createElement('div');
  preview.className = 'layout-gallery-thumbnail';
  const data = createGallerySample();
  data.selectedLayout = layout;
  data.selectedTheme = theme;
  window.renderResume(data, preview);
  preview.classList.add('layout-gallery-thumbnail');
  return preview;
}

function renderDesignGalleries() {
  const selectedLayout = window.normalizeResumeLayout(document.getElementById('selectedLayout').value);
  const selectedTheme = window.normalizeResumeTheme(document.getElementById('selectedTheme').value);
  const sample = createGallerySample();
  const layoutGallery = document.getElementById('layout-gallery');
  if (layoutGallery) {
    layoutGallery.replaceChildren();
    window.resumeLayoutOptions.forEach(([value, title, description]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'layout-option';
      button.dataset.layoutChoice = value;
      button.setAttribute('aria-pressed', String(value === selectedLayout));
      button.append(makeGalleryPreview(value, selectedTheme));
      const name = document.createElement('strong');
      name.textContent = title;
      const detail = document.createElement('span');
      detail.textContent = description;
      button.append(name, detail);
      layoutGallery.append(button);
    });
  }

  const themeGallery = document.getElementById('theme-gallery');
  if (themeGallery) {
    themeGallery.replaceChildren();
    window.resumeThemeOptions.forEach(([value, title]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-option';
      button.dataset.themeChoice = value;
      button.setAttribute('aria-pressed', String(value === selectedTheme));
      button.append(makeGalleryPreview(selectedLayout, value));
      const name = document.createElement('strong');
      name.textContent = title;
      button.append(name);
      themeGallery.append(button);
    });
  }
  syncGallerySelection();
}

function syncGallerySelection() {
  const selectedLayout = window.normalizeResumeLayout(document.getElementById('selectedLayout').value);
  const selectedTheme = window.normalizeResumeTheme(document.getElementById('selectedTheme').value);
  document.querySelectorAll('#layout-gallery [data-layout-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.layoutChoice === selectedLayout));
  });
  document.querySelectorAll('#theme-gallery [data-theme-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === selectedTheme));
  });
}

function showMessage(message, success) {
  const element = document.getElementById('form-message');
  if (!element) return;
  element.textContent = message;
  element.style.display = 'block';
  element.style.background = success ? '#E8F5EE' : '#FCECEA';
  element.style.color = success ? '#1F7A52' : '#C0463D';
}

async function downloadPDF(event) {
  event?.preventDefault();
  try {
    await window.exportResumePDF(document.getElementById('resume-preview'));
  } catch (error) {
    showMessage(error.message || 'PDF export failed.', false);
  }
}

window.addDynamicEntry = addDynamicEntry;
window.updatePreview = updatePreview;
window.updatePhotoUrl = updatePhotoUrl;
window.downloadPDF = downloadPDF;


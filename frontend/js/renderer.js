function escapeResumeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function safeResumeLink(value) {
  const link = String(value ?? '').trim();
  if (!link) return '';
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(link)) return link;
  try {
    const parsed = new URL(link, window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function resumeLine(values, separator = ' | ') {
  return values.map(value => String(value ?? '').trim()).filter(Boolean).map(escapeResumeText).join(separator);
}

function readableAccent(hex) {
  const color = hex.match(/^#([0-9a-fA-F]{6})$/)?.[1];
  if (!color) return '#1F3A5F';
  let channels = [0, 2, 4].map(index => parseInt(color.slice(index, index + 2), 16) / 255);
  const luminance = values => values.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  let factor = 1;
  while (luminance(channels.map(value => value * factor)) > 0.18 && factor > 0) factor -= 0.01;
  return `#${channels.map(value => Math.round(value * factor * 255).toString(16).padStart(2, '0')).join('')}`;
}

const resumeThemes = {
  'modern-blue': { background: '#FFFFFF', text: '#192536', muted: '#596779', rule: '#D9E1EA', accent: '#1F3A5F' },
  'classic-black': { background: '#FFFFFF', text: '#202124', muted: '#5F6368', rule: '#D7D9DC', accent: '#343A40' },
  'elegant-gold': { background: '#FFFFFF', text: '#292725', muted: '#69635B', rule: '#DED9D0', accent: '#8A6D3B' },
  'professional-green': { background: '#FFFFFF', text: '#20312B', muted: '#5B6A62', rule: '#D8E1DC', accent: '#2C644F' },
  'minimal-gray': { background: '#FFFFFF', text: '#252525', muted: '#666666', rule: '#E2E2E2', accent: '#525252' },
  'warm-beige': { background: '#FCFBF8', text: '#332F2A', muted: '#71695F', rule: '#E2DDD4', accent: '#836B52' },
  'royal-purple': { background: '#FFFFFF', text: '#292333', muted: '#655B70', rule: '#E0DAE8', accent: '#644278' },
  burgundy: { background: '#FFFFFF', text: '#332326', muted: '#705C61', rule: '#E4D9DC', accent: '#7C3146' },
  classic: { background: '#FFFFFF', text: '#202124', muted: '#5F6368', rule: '#D7D9DC', accent: '#343A40' },
  elegant: { background: '#FFFFFF', text: '#292725', muted: '#69635B', rule: '#DED9D0', accent: '#8A6D3B' },
  minimal: { background: '#FFFFFF', text: '#252525', muted: '#666666', rule: '#E2E2E2', accent: '#525252' },
  'warm-neutral': { background: '#FCFBF8', text: '#332F2A', muted: '#71695F', rule: '#E2DDD4', accent: '#836B52' }
};

const layoutAliases = {
  'single-column': 'classic-professional',
  'two-column': 'modern-two-column',
  sidebar: 'sidebar-profile',
  compact: 'compact-one-page'
};

const themeAliases = {
  classic: 'classic-black',
  elegant: 'elegant-gold',
  minimal: 'minimal-gray',
  'warm-neutral': 'warm-beige'
};

const layoutOptions = [
  ['classic-professional', 'Classic Professional', 'Traditional single column with section rules.'],
  ['modern-two-column', 'Modern Two-Column', 'Skills and contact beside the main career story.'],
  ['sidebar-profile', 'Sidebar Profile', 'A profile rail for photo, contact, and education.'],
  ['compact-one-page', 'Compact One-Page', 'Tight, balanced spacing for concise resumes.'],
  ['modern-header', 'Modern Header', 'Prominent nameplate above clear sections.'],
  ['minimalist', 'Minimalist', 'Quiet type, aligned content, and fine separators.'],
  ['timeline', 'Timeline', 'Education and experience on a shared date rail.'],
  ['executive', 'Executive', 'Experience-led hierarchy with a credential column.']
];

const themeOptions = [
  ['modern-blue', 'Modern Blue'], ['classic-black', 'Classic Black'], ['elegant-gold', 'Elegant Gold'],
  ['professional-green', 'Professional Green'], ['minimal-gray', 'Minimal Gray'], ['warm-beige', 'Warm Beige'],
  ['royal-purple', 'Royal Purple'], ['burgundy', 'Burgundy']
];

const normalizeLayout = value => layoutAliases[value] || value;
const normalizeTheme = value => themeAliases[value] || value;

const resumeFonts = {
  modern: "'Inter', Arial, sans-serif",
  classic: "Georgia, 'Times New Roman', serif",
  humanist: "'Trebuchet MS', Arial, sans-serif",
  editorial: "'Source Serif 4', Georgia, serif"
};

function chooseAutomaticDesign(data = {}) {
  const collections = ['education', 'experience', 'skills', 'projects', 'certifications', 'achievements', 'languages'];
  const entryCount = collections.reduce((total, key) => total + (data[key] || []).length, 0);
  const textContent = [data.personalInfo?.summary, ...collections.flatMap(key => (data[key] || []).flatMap(item => typeof item === 'string' ? [item] : Object.values(item || {})))].filter(value => typeof value === 'string').join(' ');
  const contentLength = textContent.trim().length;
  const personal = data.personalInfo || {};
  const personalDetails = ['fullName', 'professionalTitle', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio'].filter(key => String(personal[key] || '').trim()).length;
  const hasPhoto = Boolean(String(personal.profilePhoto || '').trim());
  const summaryLength = String(personal.summary || '').trim().length;
  const skillsAndCredentials = (data.skills || []).length + (data.certifications || []).length + (data.languages || []).length;
  let selectedLayout;
  if (entryCount <= 2 && contentLength < 500 && summaryLength < 250) selectedLayout = hasPhoto && personalDetails >= 4 ? 'modern-header' : 'compact-one-page';
  else if (contentLength > 2200 || summaryLength > 500 || (data.experience || []).length >= 3 || (data.projects || []).length >= 4) selectedLayout = 'classic-professional';
  else if (skillsAndCredentials >= 5 && (data.experience || []).length <= 2) selectedLayout = 'sidebar-profile';
  else if (entryCount >= 4 || (personalDetails >= 5 && entryCount >= 2)) selectedLayout = 'modern-two-column';
  else selectedLayout = 'modern-header';

  const automaticThemes = {
    'compact-one-page': 'minimal-gray',
    'classic-professional': 'classic-black',
    sidebar: 'professional-green',
    'sidebar-profile': 'professional-green',
    'modern-two-column': 'modern-blue',
    'modern-header': 'elegant-gold',
    'minimalist': 'minimal-gray',
    timeline: 'burgundy',
    executive: 'classic-black',
    'single-column': 'classic-black',
    'two-column': 'modern-blue',
    compact: 'minimal-gray'
  };
  return { selectedLayout, selectedTheme: automaticThemes[selectedLayout] || 'modern-blue' };
}

function renderResume(data = {}, container) {
  const template = ['modern-minimal', 'professional', 'student'].includes(data.selectedTemplate) ? data.selectedTemplate : 'modern-minimal';
  const requestedLayout = normalizeLayout(data.selectedLayout);
  const availableLayouts = layoutOptions.map(([value]) => value);
  const selectedLayout = availableLayouts.includes(requestedLayout) ? requestedLayout : chooseAutomaticDesign(data).selectedLayout;
  const selectedTheme = resumeThemes[normalizeTheme(data.selectedTheme)] ? normalizeTheme(data.selectedTheme) : 'modern-blue';
  const selectedFont = resumeFonts[data.selectedFont] ? data.selectedFont : 'modern';
  const accent = data.accentMode === 'manual' && /^#[0-9a-fA-F]{6}$/.test(data.accentColor || '')
    ? data.accentColor : resumeThemes[selectedTheme].accent;
  const personal = data.personalInfo || {};
  const contactValues = [personal.email, personal.phone, personal.location, personal.linkedin, personal.github, personal.portfolio].filter(value => String(value || '').trim());
  const contact = contactValues.length ? `<div class="prev-contact">${resumeLine(contactValues, ' • ')}</div>` : '';
  const photo = safeResumeLink(personal.profilePhoto);
  const identity = [personal.fullName, personal.professionalTitle, ...contactValues, photo].some(value => String(value || '').trim());
  const identityMarkup = `${personal.fullName ? `<div class="prev-name">${escapeResumeText(personal.fullName)}</div>` : ''}${personal.professionalTitle ? `<div class="prev-title">${escapeResumeText(personal.professionalTitle)}</div>` : ''}`;
  const photoMarkup = photo ? `<img class="prev-photo" src="${escapeResumeText(photo)}" alt="Profile photo">` : '';
  const headerContact = ['modern-two-column', 'sidebar-profile', 'minimalist'].includes(selectedLayout) ? '' : contact;
  const header = identity && selectedLayout !== 'sidebar-profile'
    ? `<header class="prev-header layout-header--${selectedLayout} ${photo ? 'has-photo' : ''}">${selectedLayout !== 'modern-two-column' ? photoMarkup : ''}<div class="prev-identity">${identityMarkup}${headerContact}</div></header>` : '';
  const sidebarProfile = `<div class="sidebar-profile-card">${photoMarkup}<div class="prev-identity">${identityMarkup}</div></div>${contact ? `<section class="sidebar-contact"><h2 class="prev-section-title">Contact</h2>${contact}</section>` : ''}`;
  const sidebarContact = contact || (selectedLayout === 'modern-two-column' && photo)
    ? `<section class="prev-section sidebar-contact">${photo && selectedLayout === 'modern-two-column' ? photoMarkup : ''}${contact ? `<h2 class="prev-section-title">Contact</h2>${contact}` : ''}</section>` : '';

  const sections = {};
  const addSection = (key, title, body) => {
    if (body) sections[key] = `<section class="prev-section" data-resume-section="${key}"><h2 class="prev-section-title">${title}</h2>${body}</section>`;
  };
  if (personal.summary?.trim()) addSection('summary', template === 'professional' ? 'Professional Summary' : template === 'student' ? 'Profile' : 'Summary', `<p class="prev-desc">${escapeResumeText(personal.summary.trim())}</p>`);

  const experiences = (data.experience || []).map(item => {
    const fields = [item.jobTitle, item.company, item.location, item.startDate, item.endDate, item.description].some(value => String(value ?? '').trim());
    if (!fields) return '';
    const title = resumeLine([item.jobTitle, item.company], ' at ');
    const dates = resumeLine([item.startDate, item.current ? 'Present' : item.endDate], ' - ');
    const description = item.description?.trim() ? `<p class="prev-desc">${escapeResumeText(item.description.trim())}</p>` : '';
    const timelineClass = selectedLayout === 'timeline' ? 'timeline-entry timeline-entry--experience' : '';
    return `<article class="prev-item ${timelineClass}"><div class="prev-item-header">${title ? `<span>${title}</span>` : ''}${dates ? `<span class="entry-dates">${dates}</span>` : ''}</div>${item.location ? `<div class="prev-item-sub">${escapeResumeText(item.location)}</div>` : ''}${description}</article>`;
  }).join('');
  addSection('experience', template === 'professional' ? 'Professional Experience' : template === 'student' ? 'Experience & Internships' : 'Experience', experiences);

  const education = (data.education || []).map(item => {
    const heading = resumeLine([item.degree, item.institution], ' - ');
    const dates = item.startYear && item.endYear ? `${item.startYear} - ${item.endYear}` : item.startYear || item.endYear;
    const details = resumeLine([item.fieldOfStudy, item.location, selectedLayout === 'timeline' ? '' : dates, item.grade]);
    const description = item.description?.trim() ? `<p class="prev-desc">${escapeResumeText(item.description.trim())}</p>` : '';
    const timelineClass = selectedLayout === 'timeline' ? 'timeline-entry timeline-entry--education' : '';
    const timelineDates = selectedLayout === 'timeline' && dates ? `<span class="entry-dates">${escapeResumeText(dates)}</span>` : '';
    return heading || details || description || timelineDates ? `<article class="prev-item ${timelineClass}">${heading || timelineDates ? `<div class="prev-item-header">${heading ? `<span>${heading}</span>` : ''}${timelineDates}</div>` : ''}${details ? `<div class="prev-item-sub">${details}</div>` : ''}${description}</article>` : '';
  }).join('');
  addSection('education', 'Education', education);

  const skills = (data.skills || []).map(item => resumeLine([item.name, item.proficiency ? `(${item.proficiency})` : ''], ' ')).filter(Boolean);
  addSection('skills', template === 'professional' ? 'Core Competencies' : template === 'student' ? 'Technical Skills' : 'Skills', skills.length ? `<p>${skills.join(' • ')}</p>` : '');

  const projects = (data.projects || []).map(item => {
    const title = escapeResumeText(item.title);
    const link = safeResumeLink(item.link);
    const details = item.technologies?.trim() ? `<div class="prev-item-sub">${escapeResumeText(item.technologies.trim())}</div>` : '';
    const description = item.description?.trim() ? `<p class="prev-desc">${escapeResumeText(item.description.trim())}</p>` : '';
    return title || details || description || link ? `<article class="prev-item">${title ? `<div class="prev-item-header">${title}${link ? ` <a href="${escapeResumeText(link)}" target="_blank" rel="noopener noreferrer">Project link</a>` : ''}</div>` : ''}${details}${description}</article>` : '';
  }).join('');
  addSection('projects', template === 'student' ? 'Academic Projects' : 'Projects', projects);

  const certifications = (data.certifications || []).map(item => {
    const title = escapeResumeText(item.name);
    const link = safeResumeLink(item.link);
    const details = resumeLine([item.organization, item.issueDate || item.year, item.credentialId]);
    return title || details || link ? `<article class="prev-item">${title ? `<div class="prev-item-header">${title}${link ? ` <a href="${escapeResumeText(link)}" target="_blank" rel="noopener noreferrer">Credential</a>` : ''}</div>` : ''}${details ? `<div class="prev-item-sub">${details}</div>` : ''}</article>` : '';
  }).join('');
  addSection('certifications', 'Certifications', certifications);

  const achievements = (data.achievements || []).map(value => String(value ?? '').trim()).filter(Boolean).map(value => `<li>${escapeResumeText(value)}</li>`).join('');
  addSection('achievements', 'Achievements', achievements ? `<ul>${achievements}</ul>` : '');

  const languages = (data.languages || []).map(item => resumeLine([item.name, item.proficiency ? `(${item.proficiency})` : ''], ' ')).filter(Boolean);
  addSection('languages', 'Languages', languages.length ? `<p>${languages.join(' • ')}</p>` : '');

  const renderSections = keys => keys.map(key => sections[key] || '').join('');
  const content = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'achievements', 'languages'];
  let body;
  switch (selectedLayout) {
    case 'modern-two-column':
      body = `<div class="resume-columns modern-two-column"><aside class="resume-sidebar">${sidebarContact}${renderSections(['skills', 'languages', 'certifications'])}</aside><main class="resume-main">${renderSections(['summary', 'experience', 'education', 'projects', 'achievements'])}</main></div>`;
      break;
    case 'sidebar-profile':
      body = `<div class="resume-columns sidebar-profile"><aside class="resume-sidebar">${sidebarProfile}${renderSections(['education', 'skills', 'languages', 'certifications'])}</aside><main class="resume-main">${renderSections(['summary', 'experience', 'projects', 'achievements'])}</main></div>`;
      break;
    case 'compact-one-page':
      body = `<main class="resume-main resume-compact-content"><div class="compact-overview">${renderSections(['summary', 'education', 'skills'])}</div>${renderSections(['experience', 'projects', 'certifications', 'achievements', 'languages'])}</main>`;
      break;
    case 'minimalist':
      body = `<div class="minimalist-layout"><aside class="minimalist-rail">${contact}${renderSections(['skills', 'languages'])}</aside><main class="resume-main minimalist-main">${renderSections(['summary', 'experience', 'education', 'projects', 'certifications', 'achievements'])}</main></div>`;
      break;
    case 'timeline':
      body = `<main class="resume-main timeline-layout">${renderSections(['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'achievements', 'languages'])}</main>`;
      break;
    case 'executive':
      body = `<div class="executive-layout"><aside class="executive-profile">${renderSections(['summary', 'education', 'skills', 'certifications', 'languages'])}</aside><main class="resume-main executive-career">${renderSections(['experience', 'projects', 'achievements'])}</main></div>`;
      break;
    default:
      body = `<main class="resume-main ${selectedLayout === 'classic-professional' ? 'classic-content' : 'modern-header-content'}">${renderSections(content)}</main>`;
  }

  const contentKeys = ['education', 'experience', 'skills', 'projects', 'certifications', 'achievements', 'languages'];
  const resumeText = [personal.fullName, personal.professionalTitle, personal.email, personal.phone, personal.location, personal.linkedin, personal.github, personal.portfolio, personal.summary,
    ...contentKeys.flatMap(key => (data[key] || []).flatMap(item => typeof item === 'string' ? [item] : Object.values(item || {})))];
  const textLength = resumeText.filter(value => typeof value === 'string').join(' ').trim().length;
  const entryCount = contentKeys.reduce((total, key) => total + (data[key] || []).filter(item => typeof item === 'string'
    ? Boolean(item.trim()) : Object.values(item || {}).some(value => String(value ?? '').trim())).length, 0);
  const density = textLength > 3000 || entryCount >= 12 ? 'dense' : textLength < 700 && entryCount <= 3 ? 'light' : 'balanced';
  if (container) {
    container.className = `resume-preview-box template-${template} resume-layout--${selectedLayout} resume-density--${density} resume-theme--${selectedTheme} resume-font--${selectedFont}`;
    container.style.setProperty('--resume-accent', accent);
    container.style.setProperty('--resume-accent-readable', readableAccent(accent));
    const accentRgb = [0, 2, 4].map(index => parseInt(accent.slice(index + 1, index + 3), 16) / 255);
    const accentLuminance = accentRgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    container.style.setProperty('--resume-on-accent', accentLuminance > 0.18 ? '#171717' : '#FFFFFF');
    container.style.setProperty('--resume-bg', resumeThemes[selectedTheme].background);
    container.style.setProperty('--resume-text', resumeThemes[selectedTheme].text);
    container.style.setProperty('--resume-muted', resumeThemes[selectedTheme].muted);
    container.style.setProperty('--resume-rule', resumeThemes[selectedTheme].rule);
    container.style.setProperty('--resume-font', resumeFonts[selectedFont]);
  }
  const html = `${header}${body}`;
  if (container) container.innerHTML = html;
  return html;
}

const templates = {
  'modern-minimal': data => renderResume({ ...data, selectedTemplate: 'modern-minimal' }),
  professional: data => renderResume({ ...data, selectedTemplate: 'professional' }),
  student: data => renderResume({ ...data, selectedTemplate: 'student' })
};

window.templates = templates;
window.renderResume = renderResume;
window.chooseAutomaticDesign = chooseAutomaticDesign;
window.resumeLayoutOptions = layoutOptions;
window.resumeThemeOptions = themeOptions;
window.normalizeResumeLayout = normalizeLayout;
window.normalizeResumeTheme = normalizeTheme;
window.resumeThemeAccents = Object.fromEntries(Object.entries(resumeThemes).map(([key, value]) => [key, value.accent]));
window.exportResumePDF = async function(element, filename = 'resume.pdf') {
  if (!window.html2pdf) throw new Error('PDF export is unavailable.');
  element.classList.add('pdf-export');
  try {
    await window.html2pdf().set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: getComputedStyle(element).backgroundColor },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.prev-item', '.prev-section-title'] }
    }).from(element).save();
  } finally {
    element.classList.remove('pdf-export');
  }
};
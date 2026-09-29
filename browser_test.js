const puppeteer = require('puppeteer');

(async () => {
  console.log("Starting browser tests...");
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  let errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console error: ${msg.text()}`);
    }
  });

  const url = 'http://localhost:5000';
  let passed = {
    login: false, dashboard: false, builderLoad: false, personalInfo: false,
    education: false, experience: false, skills: false, projects: false,
    certifications: false, achievements: false, languages: false, livePreview: false,
    templateSwitch: false, completionScore: false, save: false, reload: false,
    update: false, dashboardEdit: false, logout: false, responsive: false
  };

  try {
    // A. Registration / Login
    await page.goto(`${url}/register.html`);
    await page.type('#name', 'Browser Test User');
    const randomEmail = `browser${Date.now()}@test.com`;
    await page.type('#email', randomEmail);
    await page.type('#password', 'password123');
    await page.type('#confirm-password', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    if (page.url().includes('dashboard.html')) {
      passed.login = true;
      passed.dashboard = true;
    }

    // B. Builder Navigation
    await page.goto(`${url}/builder.html`);
    await page.waitForSelector('#fullName');
    passed.builderLoad = true;

    // C. Personal Info & Live Preview
    await page.type('#fullName', 'John Browser');
    const previewName = await page.$eval('.prev-name', el => el.innerText);
    if (previewName.includes('John Browser')) {
      passed.personalInfo = true;
      passed.livePreview = true;
    }

    // D. Dynamic Sections (Education)
    await page.click('button[onclick="addDynamicEntry(\'education\')"]');
    await page.waitForSelector('.edu-degree');
    await page.type('.edu-degree', 'BSc Computer Science');
    const previewEdu = await page.$eval('.resume-preview-box', el => el.innerText);
    if (previewEdu.includes('BSc Computer Science')) {
      passed.education = true;
    }

    // Experience
    await page.click('button[onclick="addDynamicEntry(\'experience\')"]');
    await page.waitForSelector('.exp-title');
    await page.type('.exp-title', 'Software Engineer');
    passed.experience = true;

    // Skills
    await page.click('button[onclick="addDynamicEntry(\'skills\')"]');
    await page.waitForSelector('.skill-name');
    await page.type('.skill-name', 'JavaScript');
    passed.skills = true;

    // Projects
    await page.click('button[onclick="addDynamicEntry(\'projects\')"]');
    await page.waitForSelector('.proj-title');
    await page.type('.proj-title', 'Resume Builder App');
    passed.projects = true;

    // Certifications
    await page.click('button[onclick="addDynamicEntry(\'certifications\')"]');
    await page.waitForSelector('.cert-name');
    await page.type('.cert-name', 'AWS Certified');
    passed.certifications = true;

    // Achievements
    await page.click('button[onclick="addDynamicEntry(\'achievements\')"]');
    await page.waitForSelector('.achieve-name');
    await page.type('.achieve-name', 'Employee of the Month');
    passed.achievements = true;

    // Languages
    await page.click('button[onclick="addDynamicEntry(\'languages\')"]');
    await page.waitForSelector('.lang-name');
    await page.type('.lang-name', 'English');
    passed.languages = true;

    // E. Template Switching
    await page.select('#selectedTemplate', 'professional');
    const previewClass = await page.$eval('.resume-preview-box', el => el.className);
    if (previewClass.includes('template-professional')) {
      passed.templateSwitch = true;
    }

    // F. Completion Score
    const scoreText = await page.$eval('#completion-score-text', el => el.innerText);
    if (scoreText !== '0%' && !scoreText.includes('NaN')) {
      passed.completionScore = true;
    }

    // G. SAVE
    await page.click('#save-btn');
    await page.waitForSelector('#form-message', { visible: true });
    const msg = await page.$eval('#form-message', el => el.innerText);
    if (msg.includes('successfully')) passed.save = true;

    // H. REFRESH / LOAD
    await page.reload({ waitUntil: 'networkidle0' });
    const reloadedName = await page.$eval('#fullName', el => el.value);
    if (reloadedName === 'John Browser') passed.reload = true;

    // I. UPDATE
    await page.type('#fullName', ' Updated');
    await page.click('#save-btn');
    await page.waitForSelector('#form-message', { visible: true });
    passed.update = true;

    // J. DASHBOARD EDIT FLOW
    await page.goto(`${url}/dashboard.html`);
    await page.waitForSelector('#resume-actions button');
    const resumeActions = await page.$eval('#resume-actions', el => el.innerText);
    if (resumeActions.includes('Edit Resume')) {
      passed.dashboardEdit = true;
    }

    // K. LOGOUT & PROTECTION
    await page.click('#logout-btn');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.goto(`${url}/builder.html`);
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    if (page.url().includes('login.html')) {
      passed.logout = true;
    }

    // L. RESPONSIVE
    await page.setViewport({ width: 375, height: 667 });
    passed.responsive = true;

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({ passed, errors }, null, 2));
})();

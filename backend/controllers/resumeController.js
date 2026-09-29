const Resume = require('../models/Resume');
const ResumeFile = require('../models/ResumeFile');
const mongoose = require('mongoose');
const path = require('path');

const resumeFields = [
  'education', 'experience', 'skills', 'projects', 'certifications',
  'achievements', 'languages', 'targetJobRole', 'selectedTemplate', 'isSubmitted',
  'selectedLayout', 'selectedTheme', 'themeMode', 'accentMode', 'accentColor', 'selectedFont', 'layoutMode'
];

const validateProfilePhoto = (photo) => {
  if (photo == null || photo === '') return;
  if (typeof photo !== 'string') throw Object.assign(new Error('Profile photo must be an image URL or data URL'), { statusCode: 400 });

  if (photo.startsWith('data:')) {
    const match = photo.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) throw Object.assign(new Error('Profile photo must be a JPG, PNG, or WebP image'), { statusCode: 400 });
    const bytes = Buffer.from(match[2], 'base64');
    const isJpeg = match[1] === 'jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = match[1] === 'png' && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = match[1] === 'webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!bytes.length || bytes.length > 2 * 1024 * 1024 || !(isJpeg || isPng || isWebp)) {
      throw Object.assign(new Error('Profile photo must be a valid JPG, PNG, or WebP image no larger than 2 MB'), { statusCode: 400 });
    }
    return;
  }

  try {
    const url = new URL(photo);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw Object.assign(new Error('Profile photo must be a valid HTTP or HTTPS URL'), { statusCode: 400 });
  }
};

const applyResumeData = (resume, body = {}) => {
  const data = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  for (const field of resumeFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) resume[field] = data[field];
  }
  if (data.personalInfo && typeof data.personalInfo === 'object' && !Array.isArray(data.personalInfo)) {
    validateProfilePhoto(data.personalInfo.profilePhoto);
    resume.personalInfo = { ...(resume.personalInfo?.toObject?.() || resume.personalInfo || {}), ...data.personalInfo };
  }
};

const getOwnedResume = async (resumeId, userId) => {
  if (!mongoose.isValidObjectId(resumeId)) throw Object.assign(new Error('Invalid resume ID'), { statusCode: 400 });
  const resume = await Resume.findById(resumeId);
  if (!resume) throw Object.assign(new Error('Resume not found'), { statusCode: 404 });
  if (resume.userId.toString() !== userId.toString()) {
    throw Object.assign(new Error('Not authorized to access this resume'), { statusCode: 401 });
  }
  return resume;
};

const validateFinalResume = (resume) => {
  if (!resume.personalInfo?.fullName?.trim()) throw Object.assign(new Error('Full name is required to submit your resume'), { statusCode: 400 });
  if (!resume.personalInfo?.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resume.personalInfo.email.trim())) {
    throw Object.assign(new Error('A valid email address is required to submit your resume'), { statusCode: 400 });
  }
  const hasEducation = resume.education?.some(item => item.degree?.trim() && item.institution?.trim());
  if (!hasEducation) throw Object.assign(new Error('At least one education entry with qualification and institution is required'), { statusCode: 400 });
  if (resume.certifications?.some(item => !item.name?.trim())) {
    throw Object.assign(new Error('Certificate name is required for each certification'), { statusCode: 400 });
  }
};

const parseCertificateFile = (body = {}) => {
  const match = typeof body.data === 'string' && body.data.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw Object.assign(new Error('Certificate must be a PDF, JPG, JPEG, or PNG file'), { statusCode: 400 });
  const data = Buffer.from(match[2], 'base64');
  const isPdf = match[1] === 'application/pdf' && data.toString('ascii', 0, 5) === '%PDF-';
  const isJpeg = match[1] === 'image/jpeg' && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const isPng = match[1] === 'image/png' && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!data.length || data.length > 5 * 1024 * 1024 || data.toString('base64') !== match[2] || !(isPdf || isJpeg || isPng)) {
    throw Object.assign(new Error('Certificate must be a valid PDF, JPG, JPEG, or PNG no larger than 5 MB'), { statusCode: 400 });
  }
  const originalName = String(body.filename || 'certificate').replace(/\\/g, '/');
  const filename = path.posix.basename(originalName).replace(/[\r\n"\\]/g, '').slice(0, 180) || 'certificate';
  return { data, contentType: match[1], filename };
};

// @desc    Create a new resume
// @route   POST /api/resume
// @access  Private
const createResume = async (req, res) => {
  try {
    const resume = new Resume({ userId: req.user._id });
    applyResumeData(resume, req.body);
    if (resume.isSubmitted) validateFinalResume(resume);
    await resume.save();

    res.status(201).json({
      success: true,
      message: 'Resume created successfully',
      data: resume
    });
  } catch (error) {
    res.status(error.statusCode || (error.name === 'ValidationError' ? 400 : 500)).json({ success: false, message: error.message });
  }
};

// @desc    Get all resumes for logged in user
// @route   GET /api/resume
// @access  Private
const getResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Resumes fetched successfully',
      data: resumes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single resume
// @route   GET /api/resume/:id
// @access  Private
const getResumeById = async (req, res) => {
  try {
    const resume = await getOwnedResume(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Resume fetched successfully',
      data: resume
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a resume
// @route   PUT /api/resume/:id
// @access  Private
const updateResume = async (req, res) => {
  try {
    const resume = await getOwnedResume(req.params.id, req.user._id);

    applyResumeData(resume, req.body);
    if (resume.isSubmitted) validateFinalResume(resume);
    const updatedResume = await resume.save();

    res.status(200).json({
      success: true,
      message: 'Resume updated successfully',
      data: updatedResume
    });
  } catch (error) {
    res.status(error.statusCode || (error.name === 'ValidationError' ? 400 : 500)).json({ success: false, message: error.message });
  }
};

// @desc    Delete a resume
// @route   DELETE /api/resume/:id
// @access  Private
const deleteResume = async (req, res) => {
  try {
    const resume = await getOwnedResume(req.params.id, req.user._id);
    await ResumeFile.deleteMany({ resumeId: resume._id, userId: req.user._id });
    await resume.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadCertificate = async (req, res) => {
  try {
    const resume = await getOwnedResume(req.params.resumeId, req.user._id);
    if (!mongoose.isValidObjectId(req.params.certificationId)) return res.status(400).json({ success: false, message: 'Invalid certification ID' });
    const certification = resume.certifications.id(req.params.certificationId);
    if (!certification) return res.status(404).json({ success: false, message: 'Certification not found' });
    const fileData = parseCertificateFile(req.body);
    const file = await ResumeFile.findOneAndUpdate(
      { resumeId: resume._id, certificationId: certification._id },
      { $set: { userId: req.user._id, resumeId: resume._id, certificationId: certification._id, ...fileData } },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    certification.uploadedFileId = file._id.toString();
    certification.uploadedFilename = file.filename;
    certification.uploadedContentType = file.contentType;
    await resume.save();
    res.status(200).json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: { fileId: file._id.toString(), filename: file.filename, contentType: file.contentType }
    });
  } catch (error) {
    res.status(error.statusCode || (error.name === 'ValidationError' ? 400 : 500)).json({ success: false, message: error.message });
  }
};

const downloadCertificate = async (req, res) => {
  try {
    const resume = await getOwnedResume(req.params.resumeId, req.user._id);
    if (!mongoose.isValidObjectId(req.params.certificationId)) return res.status(400).json({ success: false, message: 'Invalid certification ID' });
    const file = await ResumeFile.findOne({ resumeId: resume._id, certificationId: req.params.certificationId, userId: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'Certificate file not found' });
    res.set({
      'Content-Type': file.contentType,
      'Content-Length': file.data.length,
      'Content-Disposition': `attachment; filename="${file.filename.replace(/[\r\n"\\]/g, '')}"`,
      'Cache-Control': 'private, no-store'
    });
    res.send(file.data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const deleteCertificate = async (req, res) => {
  try {
    const resume = await getOwnedResume(req.params.resumeId, req.user._id);
    if (!mongoose.isValidObjectId(req.params.certificationId)) return res.status(400).json({ success: false, message: 'Invalid certification ID' });
    await ResumeFile.deleteOne({ resumeId: resume._id, certificationId: req.params.certificationId, userId: req.user._id });
    const certification = resume.certifications.id(req.params.certificationId);
    if (certification) {
      certification.uploadedFileId = '';
      certification.uploadedFilename = '';
      certification.uploadedContentType = '';
      await resume.save();
    }
    res.status(200).json({ success: true, message: 'Certificate file removed' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createResume,
  getResumes,
  getResumeById,
  updateResume,
  deleteResume,
  uploadCertificate,
  downloadCertificate,
  deleteCertificate
};

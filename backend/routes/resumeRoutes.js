const express = require('express');
const router = express.Router();
const {
  createResume,
  getResumes,
  getResumeById,
  updateResume,
  deleteResume,
  uploadCertificate,
  downloadCertificate,
  deleteCertificate
} = require('../controllers/resumeController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createResume)
  .get(protect, getResumes);

router.route('/:resumeId/certificates/:certificationId')
  .put(protect, uploadCertificate)
  .get(protect, downloadCertificate)
  .delete(protect, deleteCertificate);

router.route('/:id')
  .get(protect, getResumeById)
  .put(protect, updateResume)
  .delete(protect, deleteResume);

module.exports = router;

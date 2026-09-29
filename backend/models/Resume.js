const mongoose = require('mongoose');

const resumeSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    personalInfo: {
      fullName: String,
      professionalTitle: String,
      email: String,
      phone: String,
      location: String,
      summary: String,
      linkedin: String,
      github: String,
      portfolio: String,
      profilePhoto: String,
    },
    education: [
      {
        degree: String,
        institution: String,
        fieldOfStudy: String,
        location: String,
        startYear: String,
        endYear: String,
        grade: String,
        description: String,
      },
    ],
    experience: [
      {
        jobTitle: String,
        company: String,
        location: String,
        startDate: String,
        endDate: String,
        current: { type: Boolean, default: false },
        description: String,
      },
    ],
    skills: [{
      name: String,
      proficiency: String
    }],
    projects: [
      {
        title: String,
        description: String,
        technologies: String,
        link: String,
      },
    ],
    certifications: [
      {
        name: String,
        organization: String,
        year: String,
        issueDate: String,
        credentialId: String,
        link: String,
        uploadedFileId: String,
        uploadedFilename: String,
        uploadedContentType: String,
      },
    ],
    achievements: [String],
    languages: [{
      name: String,
      proficiency: String
    }],
    targetJobRole: {
      type: String,
      default: '',
    },
    selectedTemplate: {
      type: String,
      default: 'modern-minimal',
    },
    selectedLayout: {
      type: String,
      enum: [
        'classic-professional', 'modern-two-column', 'sidebar-profile', 'compact-one-page',
        'modern-header', 'minimalist', 'timeline', 'executive',
        'single-column', 'two-column', 'sidebar', 'compact'
      ],
      default: 'compact-one-page',
    },
    selectedTheme: {
      type: String,
      enum: [
        'modern-blue', 'classic-black', 'elegant-gold', 'professional-green',
        'minimal-gray', 'warm-beige', 'royal-purple', 'burgundy',
        'classic', 'elegant', 'minimal', 'warm-neutral'
      ],
      default: 'modern-blue',
    },
    themeMode: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    accentMode: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    accentColor: {
      type: String,
      match: /^#[0-9a-fA-F]{6}$/,
      default: '#1F3A5F',
    },
    selectedFont: {
      type: String,
      enum: ['classic', 'modern', 'humanist', 'editorial'],
      default: 'modern',
    },
    layoutMode: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Resume', resumeSchema);

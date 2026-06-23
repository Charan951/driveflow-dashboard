import Career from '../models/Career.js';
import CareerApplication from '../models/CareerApplication.js';
import { emitEntitySync } from '../utils/syncService.js';
import { validateCareer, isValidEmail } from '../utils/validation.js';
import { isAllowedResumeUrl } from '../controllers/uploadController.js';

const sanitizeCareerInput = (body = {}) => ({
  title: String(body.title || '').trim(),
  department: String(body.department || '').trim(),
  location: String(body.location || '').trim(),
  type: String(body.type || '').trim(),
  salary: String(body.salary || '').trim(),
  shortDescription: String(body.shortDescription || '').trim(),
  applyUrl: String(body.applyUrl || '').trim(),
  isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
});

// @desc    Get public careers
// @route   GET /api/careers
// @access  Public
export const getCareers = async (req, res) => {
  try {
    const careers = await Career.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(careers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public career by id
// @route   GET /api/careers/:id
// @access  Public
export const getCareerById = async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);
    if (!career || !career.isActive) {
      return res.status(404).json({ message: 'Career not found' });
    }
    res.json(career);
  } catch (error) {
    res.status(404).json({ message: 'Career not found' });
  }
};

// @desc    Get admin careers
// @route   GET /api/careers/admin/all
// @access  Private/Admin
export const getAdminCareers = async (req, res) => {
  try {
    const careers = await Career.find({}).sort({ createdAt: -1 }).lean();
    const applicationCounts = await CareerApplication.aggregate([
      { $group: { _id: '$career', count: { $sum: 1 } } },
    ]);
    const countByCareerId = Object.fromEntries(
      applicationCounts.map(({ _id, count }) => [String(_id), count])
    );

    res.json(
      careers.map((career) => ({
        ...career,
        applicationCount: countByCareerId[String(career._id)] || 0,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get admin career by id
// @route   GET /api/careers/admin/:id
// @access  Private/Admin
export const getAdminCareerById = async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);
    if (!career) {
      return res.status(404).json({ message: 'Career not found' });
    }
    res.json(career);
  } catch (error) {
    res.status(404).json({ message: 'Career not found' });
  }
};

// @desc    Create career
// @route   POST /api/careers
// @access  Private/Admin
export const createCareer = async (req, res) => {
  try {
    const validation = validateCareer(req.body);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }
    const payload = sanitizeCareerInput(req.body);
    if (!payload.title || !payload.department || !payload.location || !payload.type) {
      return res.status(400).json({ message: 'title, department, location and type are required' });
    }

    const career = await Career.create(payload);
    emitEntitySync('career', 'created', career);
    res.status(201).json(career);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update career
// @route   PUT /api/careers/:id
// @access  Private/Admin
export const updateCareer = async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);
    if (!career) {
      return res.status(404).json({ message: 'Career not found' });
    }

    // If any of the main fields are being updated, validate all
    const validation = validateCareer({
      ...career.toObject(),
      ...req.body,
    });
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const payload = sanitizeCareerInput(req.body);
    if (req.body.title !== undefined) career.title = payload.title;
    if (req.body.department !== undefined) career.department = payload.department;
    if (req.body.location !== undefined) career.location = payload.location;
    if (req.body.type !== undefined) career.type = payload.type;
    if (req.body.salary !== undefined) career.salary = payload.salary;
    if (req.body.shortDescription !== undefined) career.shortDescription = payload.shortDescription;
    if (req.body.applyUrl !== undefined) career.applyUrl = payload.applyUrl;
    if (req.body.isActive !== undefined) career.isActive = payload.isActive;

    const updated = await career.save();
    emitEntitySync('career', 'updated', updated);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete career
// @route   DELETE /api/careers/:id
// @access  Private/Admin
export const deleteCareer = async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);
    if (!career) {
      return res.status(404).json({ message: 'Career not found' });
    }

    await career.deleteOne();
    emitEntitySync('career', 'deleted', { _id: req.params.id });
    res.json({ message: 'Career removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit career application
// @route   POST /api/careers/:id/apply
// @access  Public
export const applyForCareer = async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);
    if (!career || !career.isActive) {
      return res.status(404).json({ message: 'Career not found' });
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const mobileNumber = String(req.body.mobileNumber || '').replace(/\D/g, ''); // Remove non-numeric
    const resumeUrl = String(req.body.resumeUrl || '').trim();
    const additionalMessage = String(req.body.additionalMessage || '').trim();

    if (!name || !email || !mobileNumber || !resumeUrl) {
      return res.status(400).json({ message: 'name, email, mobileNumber and resumeUrl are required' });
    }

    if (!isAllowedResumeUrl(resumeUrl)) {
      return res.status(400).json({ message: 'Invalid resume URL. Please upload a PDF resume through the careers form.' });
    }

    // Validate name
    if (name.length > 10) {
      return res.status(400).json({ message: 'Name cannot exceed 10 characters' });
    }

    // Validate email
    const emailValidation = isValidEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ message: emailValidation.error || 'Please enter a valid email address' });
    }

    // Validate mobile number
    if (!/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number' });
    }

    // Validate additional message
    if (additionalMessage.length > 1000) {
      return res.status(400).json({ message: 'Additional message cannot exceed 1000 characters' });
    }

    const application = await CareerApplication.create({
      career: career._id,
      name,
      email,
      mobileNumber,
      resumeUrl,
      additionalMessage,
    });

    emitEntitySync('careerApplication', 'created', application);
    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get applications for a career
// @route   GET /api/careers/admin/:id/applications
// @access  Private/Admin
export const getCareerApplications = async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);
    if (!career) {
      return res.status(404).json({ message: 'Career not found' });
    }

    const applications = await CareerApplication.find({ career: career._id }).sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

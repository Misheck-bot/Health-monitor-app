const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const User = require('../models/User');
const Doctor = require('../models/Doctor');

const router = express.Router();

// GET /api/admin/users - list users with pagination and optional search
router.get('/users', auth, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, q } = req.query;
    const query = {};
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error('Admin list users error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/doctors - list doctors (for linking)
router.get('/doctors', auth, requireRole('admin'), async (_req, res) => {
  try {
    const doctors = await Doctor.find({}).select('name specialization hospital.city');
    res.json(doctors);
  } catch (err) {
    console.error('Admin list doctors error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/doctor - create a new doctor profile
router.post(
  '/doctor',
  auth,
  requireRole('admin'),
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
    body('specialization').isString().withMessage('Specialization is required'),
    body('experience').isInt({ min: 0 }).withMessage('Experience must be a non-negative number'),
    body('consultationFee').isFloat({ min: 0 }).withMessage('Consultation fee must be non-negative'),
    body('hospital.name').isString().withMessage('Hospital name is required'),
    body('hospital.city').isString().withMessage('Hospital city is required'),
    body('availability').isArray({ min: 1 }).withMessage('Availability is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const payload = req.body;
      const created = await Doctor.create(payload);
      res.status(201).json(created);
    } catch (err) {
      console.error('Admin create doctor error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT /api/admin/doctor/:id - update an existing doctor profile
router.put(
  '/doctor/:id',
  auth,
  requireRole('admin'),
  [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 chars'),
    body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a non-negative number'),
    body('consultationFee').optional().isFloat({ min: 0 }).withMessage('Consultation fee must be non-negative')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updated = await Doctor.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
      if (!updated) return res.status(404).json({ message: 'Doctor not found' });
      res.json(updated);
    } catch (err) {
      console.error('Admin update doctor error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /api/admin/doctor/:id - delete a doctor profile
router.delete('/doctor/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const removed = await Doctor.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    console.error('Admin delete doctor error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/role - update user role
router.put('/users/:id/role', auth, requireRole('admin'), [
  body('role').isIn(['patient', 'doctor', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role: req.body.role } },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('Admin update role error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/link-doctor - link/unlink doctor profile
router.put('/users/:id/link-doctor', auth, requireRole('admin'), [
  body('doctorId').optional({ nullable: true }).isString().withMessage('doctorId must be string or null')
], async (req, res) => {
  try {
    const { doctorId } = req.body; // can be null to unlink

    // If linking, ensure doctor exists
    if (doctorId) {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { doctorId: doctorId || null } },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('Admin link doctor error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

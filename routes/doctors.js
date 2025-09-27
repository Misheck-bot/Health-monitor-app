const express = require('express');
const { body, validationResult } = require('express-validator');
const Doctor = require('../models/Doctor');
const { ZAMBIA_CITIES } = require('../constants/zambia');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all doctors with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      specialization, 
      city, 
      minRating = 0,
      maxFee,
      sortBy = 'rating.average',
      sortOrder = 'desc'
    } = req.query;

    let query = { isActive: true };
    // Constrain to Zambia cities by default
    query['hospital.city'] = { $in: ZAMBIA_CITIES };
    
    if (specialization) {
      query.specialization = specialization;
    }
    
    if (city) {
      // Allow filter by provided city but still within Zambia list
      query['hospital.city'] = { $in: ZAMBIA_CITIES.filter(c => new RegExp(city, 'i').test(c)) };
    }
    
    if (minRating > 0) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }
    
    if (maxFee) {
      query.consultationFee = { $lte: parseFloat(maxFee) };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const doctors = await Doctor.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-reviews'); // Exclude reviews for list view

    const total = await Doctor.countDocuments(query);

    res.json({
      doctors,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get doctor by ID with reviews
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('reviews.userId', 'name');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get available specializations
router.get('/meta/specializations', async (req, res) => {
  try {
    const specializations = await Doctor.distinct('specialization', { isActive: true });
    res.json(specializations);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get available cities
router.get('/meta/cities', async (req, res) => {
  try {
    const cities = await Doctor.distinct('hospital.city', { isActive: true, 'hospital.city': { $in: ZAMBIA_CITIES } });
    // Ensure we only return Zambia cities and in a consistent order
    const set = new Set(cities);
    const result = ZAMBIA_CITIES.filter(c => set.has(c));
    res.json(result.length ? result : ZAMBIA_CITIES);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Add review for doctor
router.post('/:id/review', auth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().isLength({ min: 10, max: 500 }).withMessage('Comment must be between 10 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, comment } = req.body;
    const doctorId = req.params.id;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if user already reviewed this doctor
    const existingReview = doctor.reviews.find(
      review => review.userId.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this doctor' });
    }

    // Add new review
    doctor.reviews.push({
      userId: req.user.id,
      rating,
      comment
    });

    // Update average rating
    const totalRating = doctor.reviews.reduce((sum, review) => sum + review.rating, 0);
    doctor.rating.average = Math.round((totalRating / doctor.reviews.length) * 10) / 10;
    doctor.rating.count = doctor.reviews.length;

    await doctor.save();

    res.json({ message: 'Review added successfully', rating: doctor.rating });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Search doctors by name or specialization
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const searchQuery = {
      isActive: true,
      'hospital.city': { $in: ZAMBIA_CITIES },
      $or: [
        { name: new RegExp(query, 'i') },
        { specialization: new RegExp(query, 'i') },
        { 'hospital.name': new RegExp(query, 'i') }
      ]
    };

    const doctors = await Doctor.find(searchQuery)
      .sort({ 'rating.average': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-reviews');

    const total = await Doctor.countDocuments(searchQuery);

    res.json({
      doctors,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      query
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

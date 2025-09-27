const express = require('express');
const axios = require('axios');
const router = express.Router();

// Env config
const PARTNER_API_BASE = process.env.PARTNER_API_BASE; // e.g., https://api.partner.com
const PARTNER_API_KEY = process.env.PARTNER_API_KEY;   // e.g., Bearer token or key (or RapidAPI Key)
const PARTNER_API_HOST = process.env.PARTNER_API_HOST; // e.g., betterdoctor-doctor-and-provider-data.p.rapidapi.com

// Helper: map partner doctor into our app's doctor schema subset
function mapDoctor(d) {
  // Adjust based on partner field names. Below is a generic mapping.
  return {
    _id: d.id || d._id || String(d.uuid || d.doctorId),
    name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim(),
    specialization: d.specialization || d.specialty || 'General Medicine',
    qualifications: d.qualifications || d.credentials || [],
    experience: d.experienceYears || d.experience || 0,
    hospital: {
      name: d.hospital?.name || d.facility?.name || d.clinic || 'Clinic',
      address: d.hospital?.address || d.facility?.address || d.address || '',
      city: d.hospital?.city || d.facility?.city || d.city || '',
      state: d.hospital?.state || d.facility?.province || d.state || '',
      zipCode: d.hospital?.zip || d.facility?.zip || ''
    },
    contactInfo: {
      phone: d.contact?.phone || d.phone || '',
      email: d.contact?.email || d.email || ''
    },
    availability: (d.availability || d.schedule || []).map(a => ({
      day: a.day || a.weekday || '',
      startTime: a.start || a.startTime || '',
      endTime: a.end || a.endTime || ''
    })),
    consultationFee: d.feeZMW ?? d.fee ?? 0,
    rating: {
      average: d.rating?.average ?? d.rating ?? 0,
      count: d.rating?.count ?? d.reviewsCount ?? 0
    },
    isActive: d.isActive !== undefined ? d.isActive : true
  };
}

async function partnerGet(path, params = {}) {
  if (!PARTNER_API_BASE) {
    throw new Error('PARTNER_API_BASE is not configured');
  }
  const headers = {};
  if (PARTNER_API_KEY && PARTNER_API_HOST) {
    // RapidAPI style
    headers['X-RapidAPI-Key'] = PARTNER_API_KEY;
    headers['X-RapidAPI-Host'] = PARTNER_API_HOST;
  } else if (PARTNER_API_KEY) {
    // Bearer token style
    headers['Authorization'] = PARTNER_API_KEY.startsWith('Bearer ')
      ? PARTNER_API_KEY
      : `Bearer ${PARTNER_API_KEY}`;
  }
  const url = `${PARTNER_API_BASE}${path}`;
  const res = await axios.get(url, { params, headers, timeout: 10000 });
  return res.data;
}

// GET /api/partners/doctors
router.get('/doctors', async (req, res) => {
  try {
    const { page = 1, limit = 12, specialization, city, minRating, maxFee, sortBy, sortOrder } = req.query;

    // Adjust partner query params mapping if needed
    const data = await partnerGet('/doctors', {
      page, limit, specialization, city, minRating, maxFee, sortBy, sortOrder
    });

    const doctors = (data.doctors || data.items || data.results || []).map(mapDoctor);
    const totalPages = data.totalPages || data.pages || 1;

    res.json({ doctors, totalPages });
  } catch (err) {
    console.error('Partner doctors error:', err.message);
    res.status(502).json({ message: 'Failed to load partner doctors' });
  }
});

// GET /api/partners/search/:q
router.get('/search/:q', async (req, res) => {
  try {
    const { q } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const data = await partnerGet(`/doctors/search`, { q, page, limit });
    const doctors = (data.doctors || data.items || data.results || []).map(mapDoctor);
    const totalPages = data.totalPages || data.pages || 1;
    res.json({ doctors, totalPages });
  } catch (err) {
    console.error('Partner search error:', err.message);
    res.status(502).json({ message: 'Failed to search partner doctors' });
  }
});

// GET /api/partners/meta/specializations
router.get('/meta/specializations', async (_req, res) => {
  try {
    const data = await partnerGet('/doctors/meta/specializations');
    const specs = data.specializations || data.items || [];
    res.json(specs);
  } catch (err) {
    console.error('Partner meta specializations error:', err.message);
    res.status(502).json([]);
  }
});

// GET /api/partners/meta/cities
router.get('/meta/cities', async (_req, res) => {
  try {
    const data = await partnerGet('/doctors/meta/cities');
    const cities = data.cities || data.items || [];
    res.json(cities);
  } catch (err) {
    console.error('Partner meta cities error:', err.message);
    res.status(502).json([]);
  }
});

module.exports = router;

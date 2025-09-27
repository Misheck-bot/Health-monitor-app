require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const { ZAMBIA_CITIES } = require('../constants/zambia');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/health-monitor';
const CSV_PATH = process.argv[2] || path.join(__dirname, 'doctors.csv');

function parseAvailability(field) {
  // Expect format: "Monday 09:00-17:00|Wednesday 10:00-14:00"
  if (!field) return [];
  return String(field)
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const [day, times] = entry.split(/\s+/);
      const [startTime, endTime] = (times || '').split('-');
      return { day, startTime, endTime };
    })
    .filter(a => a.day && a.startTime && a.endTime);
}

function parseQualifications(field) {
  // Expect comma or semicolon separated
  if (!field) return [];
  return String(field)
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

async function run() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV file not found at ${CSV_PATH}`);
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length <= 1) {
    console.error('CSV appears empty or only has headers. Please add rows.');
    process.exit(1);
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    // Simple CSV split (no quoted commas). For advanced cases, provide clean CSV.
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
    return obj;
  });

  let imported = 0;
  for (const r of rows) {
    try {
      const availability = parseAvailability(r.availability);
      const qualifications = parseQualifications(r.qualifications);
      const city = r.city && ZAMBIA_CITIES.includes(r.city) ? r.city : (ZAMBIA_CITIES[0] || 'Lusaka');
      const payload = {
        name: r.name,
        specialization: r.specialization || 'General Medicine',
        qualifications,
        experience: Number(r.experience) || 0,
        hospital: {
          name: r.hospitalName || 'Clinic',
          address: r.hospitalAddress || '',
          city,
          state: r.state || '',
          zipCode: r.zipCode || ''
        },
        contactInfo: {
          phone: r.phone || '',
          email: r.email || ''
        },
        availability: availability.length ? availability : [{ day: 'Monday', startTime: '09:00', endTime: '17:00' }],
        consultationFee: Number(r.fee) || 0,
        rating: { average: Number(r.ratingAvg) || 0, count: Number(r.ratingCount) || 0 },
        isActive: String(r.isActive || 'true').toLowerCase() !== 'false'
      };

      // Upsert by name + hospital.city
      await Doctor.findOneAndUpdate(
        { name: payload.name, 'hospital.city': payload.hospital.city },
        { $set: payload },
        { upsert: true, new: true }
      );
      imported += 1;
    } catch (e) {
      console.error('Row import error:', e.message);
    }
  }

  console.log(`Imported/updated ${imported} doctor(s).`);
  await mongoose.disconnect();
  console.log('Disconnected');
}

run();

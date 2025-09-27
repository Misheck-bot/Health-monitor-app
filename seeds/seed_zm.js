require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthmonitor';

// Zambia-focused sample data (placeholders). Replace with real professionals upon approval.
const zambiaDoctors = [
  {
    name: 'Mwila Phiri',
    specialization: 'General Medicine',
    qualifications: ['MBChB (UNZA)', 'MMed (Internal Medicine)'],
    experience: 10,
    hospital: {
      name: 'University Teaching Hospitals (Adult Hospital)',
      address: 'Nationalist Rd, Ridgeway',
      city: 'Lusaka',
      state: 'Lusaka Province',
      zipCode: ''
    },
    contactInfo: {
      phone: '+260 211 251200',
      email: 'mwila.phiri@uthzambia.org'
    },
    availability: [
      { day: 'Monday', startTime: '08:30', endTime: '12:30' },
      { day: 'Wednesday', startTime: '13:30', endTime: '17:00' },
      { day: 'Friday', startTime: '09:00', endTime: '13:00' }
    ],
    consultationFee: 250, // ZMW
    rating: { average: 4.5, count: 86 },
    isActive: true
  },
  {
    name: 'Thandiwe Zulu',
    specialization: 'Cardiology',
    qualifications: ['MBChB (UNZA)', 'FCP (Cardiology)'],
    experience: 12,
    hospital: {
      name: 'Levy Mwanawasa University Teaching Hospital',
      address: 'Great East Rd',
      city: 'Lusaka',
      state: 'Lusaka Province',
      zipCode: ''
    },
    contactInfo: {
      phone: '+260 211 255665',
      email: 'thandiwe.zulu@levymuth.gov.zm'
    },
    availability: [
      { day: 'Tuesday', startTime: '09:00', endTime: '15:00' },
      { day: 'Thursday', startTime: '10:00', endTime: '16:00' }
    ],
    consultationFee: 450,
    rating: { average: 4.7, count: 132 },
    isActive: true
  },
  {
    name: 'Chanda Mulenga',
    specialization: 'Endocrinology',
    qualifications: ['MBChB (UNZA)', 'MMed (Endocrinology)'],
    experience: 9,
    hospital: {
      name: 'Ndola Teaching Hospital',
      address: 'Broadway Ave',
      city: 'Ndola',
      state: 'Copperbelt Province',
      zipCode: ''
    },
    contactInfo: {
      phone: '+260 212 610111',
      email: 'chanda.mulenga@ndolateaching.gov.zm'
    },
    availability: [
      { day: 'Monday', startTime: '14:00', endTime: '18:00' },
      { day: 'Thursday', startTime: '08:30', endTime: '12:00' }
    ],
    consultationFee: 300,
    rating: { average: 4.4, count: 74 },
    isActive: true
  },
  {
    name: 'Namukolo Banda',
    specialization: 'Pediatrics',
    qualifications: ['MBChB (UNZA)', 'MMed (Pediatrics)'],
    experience: 11,
    hospital: {
      name: 'Kitwe Teaching Hospital',
      address: 'Independence Ave',
      city: 'Kitwe',
      state: 'Copperbelt Province',
      zipCode: ''
    },
    contactInfo: {
      phone: '+260 212 220497',
      email: 'namukolo.banda@kitweteaching.gov.zm'
    },
    availability: [
      { day: 'Wednesday', startTime: '09:00', endTime: '13:00' },
      { day: 'Friday', startTime: '10:00', endTime: '16:00' }
    ],
    consultationFee: 280,
    rating: { average: 4.6, count: 95 },
    isActive: true
  },
  {
    name: 'Lombe Tembo',
    specialization: 'Obstetrics & Gynecology',
    qualifications: ['MBChB (UNZA)', 'MMed (OB/GYN)'],
    experience: 14,
    hospital: {
      name: 'Livingstone Central Hospital',
      address: 'Mosi-oa-Tunya Rd',
      city: 'Livingstone',
      state: 'Southern Province',
      zipCode: ''
    },
    contactInfo: {
      phone: '+260 213 321122',
      email: 'lombe.tembo@lch.gov.zm'
    },
    availability: [
      { day: 'Tuesday', startTime: '08:30', endTime: '12:30' },
      { day: 'Thursday', startTime: '13:30', endTime: '17:00' }
    ],
    consultationFee: 320,
    rating: { average: 4.8, count: 150 },
    isActive: true
  }
];

async function seedZM() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Optionally clear existing doctors to avoid mixing non-Zambian data
    const deleteResult = await Doctor.deleteMany({});
    console.log(`Removed ${deleteResult.deletedCount} existing doctors.`);

    await Doctor.insertMany(zambiaDoctors);
    console.log(`Inserted ${zambiaDoctors.length} Zambian doctors (placeholder data).`);
  } catch (err) {
    console.error('Zambia seed error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  }
}

seedZM();

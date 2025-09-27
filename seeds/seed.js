require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthmonitor';

const sampleDoctors = [
  {
    name: 'Aarav Mehta',
    specialization: 'Endocrinology',
    qualifications: ['MBBS', 'MD (Endocrinology)'],
    experience: 12,
    hospital: {
      name: 'City Care Hospital',
      address: '123 Wellness Ave',
      city: 'San Jose',
      state: 'CA',
      zipCode: '95110'
    },
    contactInfo: {
      phone: '+1-555-100-2000',
      email: 'aarav.mehta@citycare.com'
    },
    availability: [
      { day: 'Monday', startTime: '09:00', endTime: '13:00' },
      { day: 'Wednesday', startTime: '10:00', endTime: '16:00' },
      { day: 'Friday', startTime: '12:00', endTime: '18:00' }
    ],
    consultationFee: 80,
    rating: { average: 4.6, count: 124 },
    isActive: true
  },
  {
    name: 'Sophia Chen',
    specialization: 'Cardiology',
    qualifications: ['MBBS', 'DM (Cardiology)'],
    experience: 15,
    hospital: {
      name: 'Heart & Vascular Institute',
      address: '456 Cardio Blvd',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103'
    },
    contactInfo: {
      phone: '+1-555-200-3000',
      email: 'sophia.chen@hvi.org'
    },
    availability: [
      { day: 'Tuesday', startTime: '10:00', endTime: '16:00' },
      { day: 'Thursday', startTime: '09:30', endTime: '15:30' },
      { day: 'Saturday', startTime: '09:00', endTime: '12:00' }
    ],
    consultationFee: 120,
    rating: { average: 4.8, count: 210 },
    isActive: true
  },
  {
    name: 'Rahul Sharma',
    specialization: 'General Medicine',
    qualifications: ['MBBS', 'MD (Internal Medicine)'],
    experience: 8,
    hospital: {
      name: 'Green Valley Clinic',
      address: '789 Health St',
      city: 'Fremont',
      state: 'CA',
      zipCode: '94538'
    },
    contactInfo: {
      phone: '+1-555-300-4000',
      email: 'rahul.sharma@gvclinic.com'
    },
    availability: [
      { day: 'Monday', startTime: '14:00', endTime: '18:00' },
      { day: 'Thursday', startTime: '10:00', endTime: '14:00' }
    ],
    consultationFee: 60,
    rating: { average: 4.3, count: 87 },
    isActive: true
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const count = await Doctor.countDocuments();
    if (count > 0) {
      console.log('Doctors already exist, skipping insert.');
    } else {
      await Doctor.insertMany(sampleDoctors);
      console.log(`Inserted ${sampleDoctors.length} doctors.`);
    }
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  }
}

seed();

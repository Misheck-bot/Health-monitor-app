require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const { ZAMBIA_CITIES } = require('../constants/zambia');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/health-monitor';

async function run() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');

  const sample = [
    {
      name: 'John Banda',
      specialization: 'General Medicine',
      qualifications: ['MBChB (UNZA)', 'MMed (Internal Medicine)'],
      experience: 10,
      hospital: {
        name: 'University Teaching Hospital',
        address: 'Nationalist Rd, Lusaka',
        city: 'Lusaka',
        state: 'Lusaka Province',
        zipCode: '10101'
      },
      contactInfo: {
        phone: '+260977123456',
        email: 'john.banda@example.com'
      },
      availability: [
        { day: 'Monday', startTime: '09:00', endTime: '16:00' },
        { day: 'Wednesday', startTime: '10:00', endTime: '14:00' },
        { day: 'Friday', startTime: '09:00', endTime: '13:00' }
      ],
      consultationFee: 250,
      rating: { average: 4.5, count: 20 },
      isActive: true
    },
    {
      name: 'Mary Mwale',
      specialization: 'Pediatrics',
      qualifications: ['MBChB (UNZA)', 'MMed (Pediatrics)'],
      experience: 8,
      hospital: {
        name: 'Levy Mwanawasa University Teaching Hospital',
        address: 'Great East Rd, Lusaka',
        city: 'Lusaka',
        state: 'Lusaka Province',
        zipCode: '10101'
      },
      contactInfo: {
        phone: '+260955987654',
        email: 'mary.mwale@example.com'
      },
      availability: [
        { day: 'Tuesday', startTime: '09:00', endTime: '15:00' },
        { day: 'Thursday', startTime: '10:00', endTime: '16:00' }
      ],
      consultationFee: 220,
      rating: { average: 4.7, count: 35 },
      isActive: true
    },
    {
      name: 'Chanda Phiri',
      specialization: 'Cardiology',
      qualifications: ['MBChB', 'FACC'],
      experience: 12,
      hospital: {
        name: 'Ndola Teaching Hospital',
        address: 'Ndola City',
        city: 'Ndola',
        state: 'Copperbelt Province',
        zipCode: '50100'
      },
      contactInfo: {
        phone: '+260963112233',
        email: 'chanda.phiri@example.com'
      },
      availability: [
        { day: 'Monday', startTime: '08:30', endTime: '12:30' },
        { day: 'Thursday', startTime: '13:00', endTime: '17:00' }
      ],
      consultationFee: 300,
      rating: { average: 4.6, count: 18 },
      isActive: true
    },
    {
      name: 'Mutale Zulu',
      specialization: 'Dermatology',
      qualifications: ['MBChB (UNZA)', 'Diploma Dermatology'],
      experience: 7,
      hospital: {
        name: 'Kitwe Central Hospital',
        address: 'Independence Ave, Kitwe',
        city: 'Kitwe',
        state: 'Copperbelt Province',
        zipCode: '50110'
      },
      contactInfo: {
        phone: '+260971222333',
        email: 'mutale.zulu@example.com'
      },
      availability: [
        { day: 'Tuesday', startTime: '09:00', endTime: '16:00' },
        { day: 'Friday', startTime: '10:00', endTime: '14:30' }
      ],
      consultationFee: 200,
      rating: { average: 4.3, count: 12 },
      isActive: true
    },
    {
      name: 'Thandiwe Tembo',
      specialization: 'Gynecology',
      qualifications: ['MBChB (UNZA)', 'MMed (Obstetrics & Gynecology)'],
      experience: 11,
      hospital: {
        name: 'Livingstone Central Hospital',
        address: 'Sichango Rd, Livingstone',
        city: 'Livingstone',
        state: 'Southern Province',
        zipCode: '20100'
      },
      contactInfo: {
        phone: '+260976444555',
        email: 'thandiwe.tembo@example.com'
      },
      availability: [
        { day: 'Monday', startTime: '08:30', endTime: '13:00' },
        { day: 'Wednesday', startTime: '12:00', endTime: '17:00' }
      ],
      consultationFee: 280,
      rating: { average: 4.8, count: 28 },
      isActive: true
    },
    {
      name: 'Bright Mwamba',
      specialization: 'Orthopedics',
      qualifications: ['MBChB', 'MS (Orthopedics)'],
      experience: 9,
      hospital: {
        name: 'Arthur Davison Children’s Hospital',
        address: 'President Ave, Ndola',
        city: 'Ndola',
        state: 'Copperbelt Province',
        zipCode: '50100'
      },
      contactInfo: {
        phone: '+260973666777',
        email: 'bright.mwamba@example.com'
      },
      availability: [
        { day: 'Thursday', startTime: '09:00', endTime: '16:00' }
      ],
      consultationFee: 320,
      rating: { average: 4.2, count: 15 },
      isActive: true
    },
    {
      name: 'Ruth Phiri',
      specialization: 'Endocrinology',
      qualifications: ['MBChB', 'Fellowship Endocrinology'],
      experience: 14,
      hospital: {
        name: 'Kabwe General Hospital',
        address: 'Freedom Way, Kabwe',
        city: 'Kabwe',
        state: 'Central Province',
        zipCode: '40100'
      },
      contactInfo: {
        phone: '+260972888999',
        email: 'ruth.phiri@example.com'
      },
      availability: [
        { day: 'Tuesday', startTime: '10:00', endTime: '16:00' },
        { day: 'Friday', startTime: '09:00', endTime: '12:00' }
      ],
      consultationFee: 290,
      rating: { average: 4.7, count: 22 },
      isActive: true
    },
    {
      name: 'Moses Lungu',
      specialization: 'Neurology',
      qualifications: ['MBChB', 'DM (Neurology)'],
      experience: 13,
      hospital: {
        name: 'Chipata Central Hospital',
        address: 'Umodzi Highway, Chipata',
        city: 'Chipata',
        state: 'Eastern Province',
        zipCode: '30100'
      },
      contactInfo: {
        phone: '+260979000111',
        email: 'moses.lungu@example.com'
      },
      availability: [
        { day: 'Monday', startTime: '09:00', endTime: '15:00' },
        { day: 'Thursday', startTime: '11:00', endTime: '16:00' }
      ],
      consultationFee: 310,
      rating: { average: 4.4, count: 17 },
      isActive: true
    },
    {
      name: 'Agnes Chileshe',
      specialization: 'Ophthalmology',
      qualifications: ['MBChB', 'MS (Ophthalmology)'],
      experience: 10,
      hospital: {
        name: 'Choma General Hospital',
        address: 'Choma Town Center',
        city: 'Choma',
        state: 'Southern Province',
        zipCode: '20200'
      },
      contactInfo: {
        phone: '+260974222444',
        email: 'agnes.chileshe@example.com'
      },
      availability: [
        { day: 'Wednesday', startTime: '09:30', endTime: '16:00' }
      ],
      consultationFee: 230,
      rating: { average: 4.1, count: 9 },
      isActive: true
    }
  ];

  // Ensure cities exist in Zambia list; fallback to first city if needed
  sample.forEach(doc => {
    if (!ZAMBIA_CITIES.includes(doc.hospital.city)) {
      doc.hospital.city = ZAMBIA_CITIES[0];
    }
  });

  try {
    const countBefore = await Doctor.countDocuments();
    console.log(`Doctors before: ${countBefore}`);

    // Upsert by name + city to avoid duplicates
    for (const d of sample) {
      await Doctor.findOneAndUpdate(
        { name: d.name, 'hospital.city': d.hospital.city },
        { $set: d },
        { upsert: true, new: true }
      );
    }

    const countAfter = await Doctor.countDocuments();
    console.log(`Doctors after: ${countAfter}`);
  } catch (e) {
    console.error('Seeding error:', e);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();

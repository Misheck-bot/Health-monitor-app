const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  specialization: {
    type: String,
    required: true,
    enum: [
      'General Medicine',
      'Cardiology',
      'Endocrinology',
      'Neurology',
      'Orthopedics',
      'Dermatology',
      'Psychiatry',
      'Pediatrics',
      'Gynecology',
      'Ophthalmology',
      'ENT',
      'Gastroenterology'
    ]
  },
  qualifications: [String],
  experience: {
    type: Number,
    required: true // years of experience
  },
  hospital: {
    name: String,
    address: String,
    city: String,
    state: String,
    zipCode: String
  },
  contactInfo: {
    phone: String,
    email: String
  },
  availability: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: String,
    endTime: String
  }],
  consultationFee: {
    type: Number,
    required: true
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Doctor', DoctorSchema);

const mongoose = require('mongoose');

const HealthRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  vitals: {
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    temperature: Number, // in Celsius
    weight: Number, // in kg
    height: Number, // in cm
    bmi: Number
  },
  bloodSugar: {
    level: Number, // mg/dL
    testType: {
      type: String,
      enum: ['fasting', 'random', 'postprandial', 'hba1c']
    },
    isAbnormal: {
      type: Boolean,
      default: false
    }
  },
  symptoms: [{
    name: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    duration: String
  }],
  mood: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'very_poor']
  },
  sleepHours: Number,
  exerciseMinutes: Number,
  waterIntake: Number, // in liters
  notes: String,
  alerts: [{
    type: String,
    message: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    acknowledged: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Calculate BMI before saving
HealthRecordSchema.pre('save', function(next) {
  if (this.vitals.weight && this.vitals.height) {
    const heightInMeters = this.vitals.height / 100;
    this.vitals.bmi = Math.round((this.vitals.weight / (heightInMeters * heightInMeters)) * 100) / 100;
  }
  
  // Check for abnormal blood sugar levels
  if (this.bloodSugar.level) {
    const level = this.bloodSugar.level;
    const testType = this.bloodSugar.testType;
    
    let isAbnormal = false;
    
    switch (testType) {
      case 'fasting':
        isAbnormal = level < 70 || level > 100;
        break;
      case 'random':
        isAbnormal = level > 200;
        break;
      case 'postprandial':
        isAbnormal = level > 140;
        break;
      case 'hba1c':
        isAbnormal = level > 5.7;
        break;
    }
    
    this.bloodSugar.isAbnormal = isAbnormal;
    
    if (isAbnormal) {
      this.alerts.push({
        type: 'blood_sugar',
        message: `Abnormal blood sugar level detected: ${level} mg/dL (${testType})`,
        severity: level > 250 || level < 50 ? 'critical' : 'high'
      });
    }
  }
  
  next();
});

module.exports = mongoose.model('HealthRecord', HealthRecordSchema);

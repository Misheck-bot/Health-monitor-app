const express = require('express');
const { body, validationResult } = require('express-validator');
const HealthRecord = require('../models/HealthRecord');
const auth = require('../middleware/auth');

const router = express.Router();

// Add health record
router.post('/record', auth, [
  body('vitals.bloodPressure.systolic').optional().isInt({ min: 70, max: 250 }),
  body('vitals.bloodPressure.diastolic').optional().isInt({ min: 40, max: 150 }),
  body('vitals.heartRate').optional().isInt({ min: 40, max: 200 }),
  body('vitals.temperature').optional().isFloat({ min: 35, max: 42 }),
  body('bloodSugar.level').optional().isFloat({ min: 20, max: 600 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const healthRecord = new HealthRecord({
      userId: req.user.id,
      ...req.body
    });

    await healthRecord.save();

    // Check for critical alerts
    const criticalAlerts = healthRecord.alerts.filter(alert => 
      alert.severity === 'critical' && !alert.acknowledged
    );

    res.json({
      record: healthRecord,
      alerts: criticalAlerts
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get user's health records
router.get('/records', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    
    let query = { userId: req.user.id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await HealthRecord.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await HealthRecord.countDocuments(query);

    res.json({
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get health analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await HealthRecord.find({
      userId: req.user.id,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    // Calculate averages and trends
    const analytics = {
      averages: {
        bloodPressure: { systolic: 0, diastolic: 0 },
        heartRate: 0,
        bloodSugar: 0,
        weight: 0,
        bmi: 0
      },
      trends: {
        weight: [],
        bloodPressure: [],
        bloodSugar: [],
        heartRate: []
      },
      alerts: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0
      }
    };

    let validRecords = 0;
    let bpCount = 0, hrCount = 0, bsCount = 0, weightCount = 0;

    records.forEach(record => {
      validRecords++;

      const bp = record?.vitals?.bloodPressure;
      const hr = record?.vitals?.heartRate;
      const tempWeight = record?.vitals?.weight;
      const bmiVal = record?.vitals?.bmi;
      const bs = record?.bloodSugar;

      // Blood pressure
      if (bp?.systolic != null && bp?.diastolic != null) {
        analytics.averages.bloodPressure.systolic += bp.systolic;
        analytics.averages.bloodPressure.diastolic += bp.diastolic;
        analytics.trends.bloodPressure.push({
          date: record.date,
          systolic: bp.systolic,
          diastolic: bp.diastolic
        });
        bpCount++;
      }

      // Heart rate
      if (hr != null) {
        analytics.averages.heartRate += hr;
        analytics.trends.heartRate.push({
          date: record.date,
          value: hr
        });
        hrCount++;
      }

      // Blood sugar
      if (bs?.level != null) {
        analytics.averages.bloodSugar += bs.level;
        analytics.trends.bloodSugar.push({
          date: record.date,
          value: bs.level,
          type: bs.testType
        });
        bsCount++;
      }

      // Weight and BMI
      if (tempWeight != null) {
        analytics.averages.weight += tempWeight;
        analytics.trends.weight.push({
          date: record.date,
          weight: tempWeight,
          bmi: bmiVal
        });
        weightCount++;
      }

      // Alerts
      (record.alerts || []).forEach(alert => {
        analytics.alerts.total++;
        if (analytics.alerts[alert.severity] != null) {
          analytics.alerts[alert.severity]++;
        }
      });
    });

    // Calculate averages
    if (bpCount > 0) {
      analytics.averages.bloodPressure.systolic = Math.round(analytics.averages.bloodPressure.systolic / bpCount);
      analytics.averages.bloodPressure.diastolic = Math.round(analytics.averages.bloodPressure.diastolic / bpCount);
    }
    if (hrCount > 0) analytics.averages.heartRate = Math.round(analytics.averages.heartRate / hrCount);
    if (bsCount > 0) analytics.averages.bloodSugar = Math.round(analytics.averages.bloodSugar / bsCount);
    if (weightCount > 0) analytics.averages.weight = Math.round((analytics.averages.weight / weightCount) * 10) / 10;

    res.json(analytics);

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get health recommendations
router.get('/recommendations', auth, async (req, res) => {
  try {
    const recentRecords = await HealthRecord.find({
      userId: req.user.id
    }).sort({ date: -1 }).limit(5);

    const recommendations = [];

    if (recentRecords.length > 0) {
      const latestRecord = recentRecords[0];

      // BMI recommendations
      if (latestRecord.vitals.bmi) {
        const bmi = latestRecord.vitals.bmi;
        if (bmi < 18.5) {
          recommendations.push({
            type: 'nutrition',
            priority: 'medium',
            title: 'Underweight Alert',
            message: 'Your BMI indicates you may be underweight. Consider consulting a nutritionist for a healthy weight gain plan.',
            actions: ['Increase caloric intake', 'Focus on nutrient-dense foods', 'Consider strength training']
          });
        } else if (bmi > 25) {
          recommendations.push({
            type: 'fitness',
            priority: 'medium',
            title: 'Weight Management',
            message: 'Your BMI suggests you may benefit from weight management. Consider a balanced diet and regular exercise.',
            actions: ['Reduce caloric intake', 'Increase physical activity', 'Monitor portion sizes']
          });
        }
      }

      // Blood sugar recommendations
      if (latestRecord.bloodSugar.isAbnormal) {
        recommendations.push({
          type: 'medical',
          priority: 'high',
          title: 'Blood Sugar Alert',
          message: 'Your recent blood sugar reading is abnormal. Please consult with a healthcare provider.',
          actions: ['Schedule doctor appointment', 'Monitor blood sugar regularly', 'Review diet and medication']
        });
      }

      // Blood pressure recommendations
      if (latestRecord.vitals.bloodPressure.systolic > 140 || latestRecord.vitals.bloodPressure.diastolic > 90) {
        recommendations.push({
          type: 'medical',
          priority: 'high',
          title: 'High Blood Pressure',
          message: 'Your blood pressure reading is elevated. Consider lifestyle changes and consult a doctor.',
          actions: ['Reduce sodium intake', 'Exercise regularly', 'Manage stress', 'Consult healthcare provider']
        });
      }

      // General wellness recommendations
      if (latestRecord.sleepHours < 7) {
        recommendations.push({
          type: 'lifestyle',
          priority: 'low',
          title: 'Sleep Improvement',
          message: 'You\'re getting less than the recommended 7-9 hours of sleep.',
          actions: ['Establish regular sleep schedule', 'Create bedtime routine', 'Limit screen time before bed']
        });
      }

      if (latestRecord.exerciseMinutes < 30) {
        recommendations.push({
          type: 'fitness',
          priority: 'low',
          title: 'Increase Physical Activity',
          message: 'Try to get at least 30 minutes of moderate exercise daily.',
          actions: ['Take daily walks', 'Use stairs instead of elevators', 'Try home workouts']
        });
      }
    }

    res.json(recommendations);

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Acknowledge alert
router.put('/alert/:recordId/:alertIndex/acknowledge', auth, async (req, res) => {
  try {
    const { recordId, alertIndex } = req.params;
    
    const record = await HealthRecord.findOne({
      _id: recordId,
      userId: req.user.id
    });

    if (!record) {
      return res.status(404).json({ message: 'Health record not found' });
    }

    if (alertIndex >= record.alerts.length) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    record.alerts[alertIndex].acknowledged = true;
    await record.save();

    res.json({ message: 'Alert acknowledged' });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

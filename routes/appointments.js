const express = require('express');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');

const router = express.Router();

// Book appointment
router.post('/book', auth, [
  body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('timeSlot.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required'),
  body('timeSlot.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required'),
  body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
      if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { doctorId, appointmentDate, timeSlot, reason, symptoms, type } = req.body;

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if appointment slot is available
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: new Date(appointmentDate),
      'timeSlot.startTime': timeSlot.startTime,
      status: { $in: ['scheduled', 'confirmed'] }
    });
    if (existingAppointment) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    // Create appointment
    const appointment = new Appointment({
      userId: req.user.id,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      timeSlot,
      reason,
      symptoms: symptoms || [],
      type: type || 'consultation',
      amount: doctor.consultationFee
    });

    await appointment.save();

    // Populate doctor details
    await appointment.populate('doctorId', 'name specialization hospital.name hospital.address');

    res.json({
      message: 'Appointment booked successfully',
      appointment
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get user appointments
router.get('/my-appointments', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, upcoming } = req.query;
    
    let query = { userId: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    if (upcoming === 'true') {
      query.appointmentDate = { $gte: new Date() };
    }

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'name specialization hospital.name hospital.address hospital.city')
      .sort({ appointmentDate: upcoming === 'true' ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get appointment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('doctorId', 'name specialization hospital qualifications');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Cancel appointment
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot cancel this appointment' });
    }

    // Check if appointment is within 24 hours
    const appointmentTime = new Date(appointment.appointmentDate);
    const now = new Date();
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff < 24) {
      return res.status(400).json({ 
        message: 'Cannot cancel appointment within 24 hours of scheduled time' 
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ message: 'Appointment cancelled successfully' });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Reschedule appointment
router.put('/:id/reschedule', auth, [
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('timeSlot.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required'),
  body('timeSlot.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { appointmentDate, timeSlot } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot reschedule this appointment' });
    }

    // Check if new slot is available
    const existingAppointment = await Appointment.findOne({
      doctorId: appointment.doctorId,
      appointmentDate: new Date(appointmentDate),
      'timeSlot.startTime': timeSlot.startTime,
      status: { $in: ['scheduled', 'confirmed'] },
      _id: { $ne: appointment._id }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    appointment.appointmentDate = new Date(appointmentDate);
    appointment.timeSlot = timeSlot;
    appointment.status = 'scheduled';
    await appointment.save();

    res.json({ 
      message: 'Appointment rescheduled successfully',
      appointment 
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get available time slots for a doctor on a specific date
router.get('/slots/:doctorId/:date', async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const appointmentDate = new Date(date);
    const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Get doctor's availability for the day
    const dayAvailability = doctor.availability.find(avail => avail.day === dayName);
    if (!dayAvailability) {
      return res.json({ availableSlots: [] });
    }

    // Get existing appointments for the day
    const existingAppointments = await Appointment.find({
      doctorId,
      appointmentDate,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    // Generate time slots (30-minute intervals)
    const slots = [];
    const startTime = dayAvailability.startTime;
    const endTime = dayAvailability.endTime;
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const slotStart = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // Add 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute -= 60;
        currentHour += 1;
      }
      
      const slotEnd = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // Check if slot is available
      const isBooked = existingAppointments.some(apt => apt.timeSlot.startTime === slotStart);
      
      if (!isBooked) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd
        });
      }
    }

    res.json({ availableSlots: slots });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Move export to end of file
// Doctor-facing: list appointments assigned to the authenticated doctor
router.get('/doctor/appointments', auth, requireRole('doctor'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, upcoming } = req.query;

    if (!req.authUser?.doctorId) {
      return res.status(400).json({ message: 'Doctor profile not linked to user' });
    }

    const query = { doctorId: req.authUser.doctorId };
    if (status) query.status = status;
    if (upcoming === 'true') {
      query.appointmentDate = { $gte: new Date() };
    }

    const appointments = await Appointment.find(query)
      .populate('userId', 'name email phone')
      .sort({ appointmentDate: upcoming === 'true' ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Doctor appointments error:', error.message);
    res.status(500).send('Server error');
  }
});

// Doctor-facing: update appointment status (confirm, complete, cancel)
router.put('/doctor/appointments/:id/status', auth, requireRole('doctor'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['scheduled', 'confirmed', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (!req.authUser?.doctorId) {
      return res.status(400).json({ message: 'Doctor profile not linked to user' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (String(appointment.doctorId) !== String(req.authUser.doctorId)) {
      return res.status(403).json({ message: 'Forbidden: cannot modify this appointment' });
    }

    appointment.status = status;
    await appointment.save();

    res.json({ message: 'Status updated', appointment });
  } catch (error) {
    console.error('Doctor update status error:', error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

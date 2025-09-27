const User = require('../models/User');

// Usage: requireRole('doctor'), or requireRole('patient', 'admin')
module.exports = function requireRole(...allowed) {
  return async function (req, res, next) {
    try {
      const user = await User.findById(req.user.id).select('role doctorId');
      if (!user) return res.status(401).json({ message: 'User not found' });

      if (!allowed.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden: insufficient role' });
      }

      // Attach resolved role and doctorId to request for downstream handlers
      req.authUser = { role: user.role, doctorId: user.doctorId };
      next();
    } catch (err) {
      console.error('Role check error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  };
}

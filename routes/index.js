const express = require('express');
const { protect } = require('../utils');

const router = express.Router();

// Ensure users are logged in
router.use(protect);

router.get('/', (req, res, next) => {
	if (req.session.user.role === 'employee') res.redirect(`payroll/${req.session.user.id}/payslips`);
	else res.redirect('/payroll');
});

module.exports = router;

const express = require('express');
const conn = require('../db');
const { protect, handleSQLErrors } = require('../utils');

const router = express.Router();

router.use(protect);

router.get('/', (req, res, next) => {
	conn.query(
		'SELECT * FROM payroll prl, employees emps WHERE prl.employee_id = emps.id AND prl.pay_period > now()',
		handleSQLErrors((details) => {
			res.render('payroll/list', { payroll: details });
		})
	);
});

module.exports = router;

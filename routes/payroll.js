const express = require('express');
const conn = require('../db');
const { protect, handleSQLErrors, limitFields, restrictTo } = require('../utils');

const router = express.Router();

router.use(protect);

router.get('/', restrictTo('supervisor', 'accountant'), (req, res, next) => {
	let sqlQuery = `SELECT prl.*, prl.id AS payroll_id, staff.*, staff.id AS employee_id, dpts.*, pc.*
    FROM payroll prl, departments dpts, staff, paycycles pc
    WHERE prl.employee_id = staff.id AND staff.department_id = dpts.id AND prl.paycycle_id = pc.id AND pc.active = 1`;

	if (req.session.user.role === 'supervisor')
		sqlQuery += ' AND staff.department_id = ' + req.session.user.department.id;

	conn.query(
		sqlQuery,
		handleSQLErrors(next, (results) => {
			conn.query(
				'SELECT * FROM paycycles WHERE active = 1',
				handleSQLErrors(next, ([paycycle]) => {
					if (!paycycle) throw new Error('No active paycycle found');

					res.render('payroll/list', { results: results, paycycle });
				})
			);
		})
	);
});

router.get('/summary', restrictTo('supervisor'), (req, res, next) => {
	conn.query(
		`SELECT SUM(prl.net_pay) AS total_pay, SUM(prl.hours_worked) AS total_hours, SUM(prl.hours_overtime) AS total_overtime, 
        pcs.start_date, pcs.end_date, dpts.*
        FROM staff, payroll prl, paycycles pcs, departments dpts
        WHERE prl.employee_id = staff.id AND prl.paycycle_id = pcs.id AND staff.department_id = dpts.id
        AND pcs.active = 1 AND dpts.id = ${req.session.user.department.id}
        `,
		handleSQLErrors(next, (results) => {
			console.log(results);
			res.render('payroll/summary', { data: results[0] });
		})
	);
});

router.get('/paycycles/new', restrictTo('accountant'), (req, res, next) => {
	// Get prev and new paydays
	conn.query(
		'SELECT end_date FROM paycycles WHERE active = 1',
		handleSQLErrors(next, ([paycycle]) => {
			const start_date = paycycle.end_date;
			const end_date = new Date(paycycle.end_date.getTime() + 2 * 7 * 24 * 60 * 60 * 1000);

			// Reset all paycycle active states
			conn.query(
				'UPDATE paycycles SET active = 0',
				handleSQLErrors(next, () => {
					// Add new paycycle to the database
					conn.query(
						'INSERT INTO paycycles (start_date, end_date, active) VALUES (?, ?, 1)',
						[start_date, end_date],
						handleSQLErrors(next, () => {
							// Create a new payroll
							conn.query(
								"INSERT INTO payroll (employee_id, paycycle_id) SELECT staff.id, paycycles.id FROM staff, paycycles WHERE NOT position = 'supervisor' AND paycycles.active = 1",
								handleSQLErrors(next, () => {
									req.flash('success', 'New payroll created');
									res.redirect('/payroll');
								})
							);
						})
					);
				})
			);
		})
	);
});

router.get('/:emp_id/payslips', restrictTo('employee'), (req, res, next) => {
	// Get selected employee
	conn.query(
		`SELECT staff.*, staff.id AS employee_id, departments.dprt_name FROM staff, departments WHERE staff.department_id = departments.id AND staff.id = ${req.params.emp_id}`,
		handleSQLErrors(next, ([employee]) => {
			if (!employee) throw new Error('No employee found with that id');

			// Get all payslips for this employee
			conn.query(
				`SELECT prl.*, pcs.*, pcs.id AS paycycle_id FROM payroll prl, paycycles pcs WHERE prl.paycycle_id = pcs.id AND prl.employee_id = ${req.params.emp_id}`,
				handleSQLErrors(next, (results) => {
					res.render('payroll/payslips/list', {
						employee,
						results,
					});
				})
			);
		})
	);
});
router.post('/:emp_id/payslips', restrictTo('accountant'), (req, res, next) => {
	res.redirect(`/payroll/${req.params.emp_id}/payslips/${req.body.paycycle_id}`);
});

router.get('/:emp_id/payslips/:paycycle_id', (req, res, next) => {
	let sqlQuery =
		// Get salary details for this employee
		conn.query(
			`SELECT *, pcs.id AS paycycle_id
        FROM payroll prl, staff, departments dpts, paycycles pcs
        WHERE prl.employee_id = staff.id AND staff.department_id = dpts.id AND prl.paycycle_id = pcs.id 
        AND pcs.id = ${req.params.paycycle_id} AND prl.employee_id = ${req.params.emp_id}
        `,
			handleSQLErrors(next, (results) => {
				if (!results?.length) return res.render('error/not-found');

				if (req.session.user.role === 'accountant') {
					// Get all paycycles for filtering
					conn.query(
						`SELECT pcs.* FROM payroll prl, paycycles pcs WHERE prl.paycycle_id = pcs.id AND prl.employee_id = ${req.params.emp_id}`,
						handleSQLErrors(next, (paycycles) => {
							console.log(paycycles);

							res.render('payroll/payslips/details', {
								data: results[0],
								paycycles: paycycles.reverse(),
							});
						})
					);
				} else {
					res.render('payroll/payslips/details', { data: results[0] });
				}
			})
		);
});

router.post('/update', restrictTo('supervisor', 'accountant'), (req, res, next) => {
	const data = limitFields(req.body, ['hours_worked', 'hours_overtime', 'days_absent']);

	data.hours_worked = Number.parseInt(data.hours_worked);
	data.hours_overtime = Number.parseInt(data.hours_overtime);
	data.days_absent = Number.parseInt(data.days_absent);

	data.net_pay = data.hours_worked * req.body.pay_rate + data.hours_overtime * req.body.overtime_rate;

	conn.query(
		`UPDATE payroll SET ? WHERE id = ${req.body.payroll_id}`,
		data,
		handleSQLErrors(next, (result) => {
			req.flash('success', 'Record updated successfully');
			res.redirect('/payroll');
		})
	);
});

module.exports = router;

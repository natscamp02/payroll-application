const express = require('express');
const createError = require('http-errors');
const bcrypt = require('bcrypt');
const conn = require('../db');
const { protect, handleSQLErrors, restrictTo, limitFields } = require('../utils');

const router = express.Router();

// Ensure users are logged in and only allow certain roles
router.use(protect, restrictTo('supervisor', 'accountant'));

// Display list of employees
router.get('/', (req, res, next) => {
	let sqlQuery =
		"SELECT staff.*, dpts.dprt_name FROM staff, departments dpts WHERE staff.department_id = dpts.id AND NOT staff.position = 'supervisor'";

	if (req.session.user.role === 'supervisor')
		sqlQuery += ' AND staff.department_id = ' + req.session.user.department.id;

	if (req.query.search) {
		let [fName, lName] = req.query.search.split(' ');
		sqlQuery += ` AND staff.first_name LIKE '%${fName}%'`;
		lName && (sqlQuery += ` AND staff.last_name LIKE '%${lName}%'`);
	}

	sqlQuery += ' ORDER BY staff.id';

	conn.query(
		sqlQuery,
		handleSQLErrors(next, (employees) => {
			res.render('employees/list', { employees });
		})
	);
});

// Show employee add page
router.get('/add', restrictTo('supervisor'), (req, res, next) => {
	res.render('employees/add');
});

// Add a new employee to the database
router.post('/add', restrictTo('supervisor'), async (req, res, next) => {
	const data = limitFields(req.body, ['first_name', 'last_name', 'email', 'position']);

	data.password = await bcrypt.hash(process.env.EMPLOYEE_PASSWORD, 12);
	data.position ||= 'employee';
	data.department_id = Number.parseInt(req.session.user.department.id);

	// Add employee to database
	conn.query(
		`INSERT INTO staff (first_name, last_name, email, position, password, department_id) VALUES (?,?,?,?,?,?)`,
		Object.values(data),
		handleSQLErrors(next, (result) => {
			// Get active paycycle
			conn.query(
				'SELECT * FROM paycycles WHERE active = 1',
				handleSQLErrors(next, ([paycycle]) => {
					if (!paycycle) throw new Error('No active paycycle found');

					// Add employee data to payroll
					conn.query(
						`INSERT INTO payroll (employee_id, paycycle_id) VALUES (${result.insertId}, ${paycycle.id})`,
						handleSQLErrors(next, () => {
							req.flash('success', 'Account created successfully');
							res.redirect('/employees');
						})
					);
				})
			);
		})
	);
});

// Show employee edit page
router.get('/:id/edit', (req, res, next) => {
	conn.query(
		'SELECT * FROM staff WHERE id = ' + req.params.id,
		handleSQLErrors(next, (users) => {
			res.render('employees/edit', { account: users[0] });
		})
	);
});

// Update an employee in the database
router.post('/update', (req, res, next) => {
	const data = limitFields(req.body, ['first_name', 'last_name', 'email', 'position']);

	conn.query(
		'UPDATE staff SET ? WHERE id = ' + req.body.account_id,
		data,
		handleSQLErrors(next, (result) => {
			req.flash('success', 'Account updated successfully');
			res.redirect('/employees');
		})
	);
});

// Remove an employee from the database
router.get('/:id/delete', (req, res, next) => {
	conn.query(
		`DELETE FROM staff WHERE id = ${req.params.id}`,
		handleSQLErrors(next, () => {
			req.flash('success', 'Employee deleted successfully');
			res.redirect('/employees');
		})
	);
});

module.exports = router;

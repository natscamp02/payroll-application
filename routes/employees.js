const express = require('express');
const bcrypt = require('bcrypt');
const conn = require('../db');
const { protect, handleSQLErrors, restrictTo, limitFields } = require('../utils');

const router = express.Router();

router.use(protect, restrictTo('supervisor', 'accountant'));

router.get('/', (req, res, next) => {
	let sqlQuery =
		"SELECT staff.*, dpts.dprt_name FROM staff, departments dpts WHERE staff.department_id = dpts.id AND NOT staff.position = 'supervisor'";

	if (req.session.user.role === 'supervisor')
		sqlQuery += ' AND staff.department_id = ' + req.session.user.department.id;

	if (req.session.user.role === 'accountant') sqlQuery += ' AND NOT staff.id = ' + req.session.user.id;

	sqlQuery += ' ORDER BY staff.id';

	conn.query(
		sqlQuery,
		handleSQLErrors(next, (employees) => {
			res.render('employees/list', { employees });
		})
	);
});

router.get('/add', restrictTo('supervisor'), (req, res, next) => {
	res.render('employees/add');
});

router.post('/add', restrictTo('supervisor'), async (req, res, next) => {
	const data = limitFields(req.body, ['first_name', 'last_name', 'email', 'position']);

	data.password = await bcrypt.hash(process.env.EMPLOYEE_PASSWORD, 12);
	data.position ||= 'employee';
	data.department_id = Number.parseInt(req.session.user.department.id);

	conn.query(
		`INSERT INTO staff (first_name, last_name, email, position, password, department_id) VALUES (?,?,?,?,?,?)`,
		Object.values(data),
		handleSQLErrors(next, (result) => {
			req.flash('success', 'Account created successfully');
			res.redirect('/employees');
		})
	);
});

router.get('/:id/edit', (req, res, next) => {
	conn.query(
		'SELECT * FROM staff WHERE id = ' + req.params.id,
		handleSQLErrors(next, (users) => {
			res.render('employees/edit', { account: users[0] });
		})
	);
});

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

router.get('/:id/delete', restrictTo('supervisor'), (req, res, next) => {
	conn.query(
		'DELETE FROM staff WHERE id = ' + req.params.id,
		handleSQLErrors(next, () => {
			req.flash('success', 'Accont deleted successfully');
			res.redirect('/employees');
		})
	);
});

module.exports = router;

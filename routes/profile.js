const express = require('express');
const bcrypt = require('bcrypt');
const conn = require('../db');
const { protect, handleSQLErrors, limitFields } = require('../utils');

const router = express.Router();

router.use(protect);

router.get('/', (req, res, next) => {
	conn.query(
		'SELECT * FROM staff WHERE id = ' + req.session.user.id,
		handleSQLErrors(next, (users) => {
			res.render('profile/view', { account: users[0] });
		})
	);
});

router.post('/update/info', (req, res, next) => {
	const data = limitFields(req.body, ['first_name', 'last_name', 'email']);

	conn.query(
		`UPDATE staff SET ? WHERE id = ${req.session.user.id}`,
		data,
		handleSQLErrors(next, () => {
			req.flash('success', 'Account updated successfully');
			res.redirect('/profile');
		})
	);
});

router.post('/update/password', (req, res, next) => {
	conn.query(
		'SELECT password FROM staff WHERE id = ' + req.session.user.id,
		handleSQLErrors(next, async ([user]) => {
			if (!(await bcrypt.compare(req.body.current_password, user.password))) {
				req.flash('error', 'Password is incorrect');
				return res.redirect('/profile');
			}

			if (req.body.new_password !== req.body.confirm_password) {
				req.flash('error', 'Passwords do not match');
				return res.redirect('/profile');
			}

			const new_password = await bcrypt.hash(req.body.new_password, 12);
			conn.query(
				`UPDATE staff SET password = '${new_password}' WHERE id = ${req.session.user.id}`,
				handleSQLErrors(next, () => {
					req.flash('success', 'Password updated successfully');
					res.redirect('/profile');
				})
			);
		})
	);
});

module.exports = router;

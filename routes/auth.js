const express = require('express');
const bcrypt = require('bcrypt');
const conn = require('../db');
const { limitFields, handleSQLErrors } = require('../utils');

const router = express.Router();

router.get('/', (req, res) => {
	res.redirect('login');
});

router.get('/login', (req, res) => {
	res.render('auth/login');
});

router.post('/login', (req, res, next) => {
	const data = limitFields(req.body, ['email', 'password']);

	conn.query(
		`SELECT staff.*, dpts.dprt_name FROM staff, departments dpts WHERE staff.email = ? AND staff.department_id = dpts.id`,
		[data.email],
		handleSQLErrors(next, async (users) => {
			// Ensure user exists
			if (!users?.length) {
				req.flash('error', 'Email or password is incorrect');
				return res.redirect('back');
			}

			// Validate user's password
			if (!(await bcrypt.compare(data.password, users[0].password))) {
				req.flash('error', 'Email or password is incorrect');
				return res.redirect('back');
			}

			// Log user in
			req.session.user = {
				id: users[0].id,
				first_name: users[0].first_name,
				department: {
					id: users[0].department_id,
					name: users[0].dprt_name,
				},
				role: users[0].position,
			};

			res.redirect('/dashboard');
		})
	);
});

router.get('/logout', (req, res, next) => {
	req.session.destroy();
	res.redirect('/auth/login');
});

module.exports = router;

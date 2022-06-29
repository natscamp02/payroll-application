const express = require('express');
const conn = require('../db');
const { protect, handleSQLErrors } = require('../utils');

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

module.exports = router;

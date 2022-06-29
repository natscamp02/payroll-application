const express = require('express');
const { protect } = require('../utils');

const router = express.Router();

router.use(protect);

router.get('/', (req, res, next) => {
	res.redirect('/dashboard');
});

router.get('/dashboard', (req, res, next) => {
	res.render('index');
});

module.exports = router;

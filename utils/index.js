const createError = require('http-errors');

exports.protect = (req, res, next) => {
	if (!req.session?.user) return res.redirect('/auth/login');

	res.locals.user = req.session.user;
	next();
};

exports.restrictTo =
	(...roles) =>
	(req, res, next) => {
		if (!roles.includes(req.session.user.role)) {
			req.flash('error', 'You do not have permission to access this page');
			return res.redirect('back');
		}
		next();
	};

exports.limitFields = (body, allowedFields) => {
	const obj = {};

	Object.keys(body).forEach((key) => allowedFields.includes(key) && (obj[key] = body[key]));

	return obj;
};

exports.handleSQLErrors = (next, fn) => (err, results, fields) => {
	try {
		if (err) throw err;
		fn(results, fields);
	} catch (error) {
		next(createError(400, error.message || 'Something went wrong'));
	}
};

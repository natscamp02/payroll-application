const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('express-flash');
const logger = require('morgan');

const indexRouter = require('./routes');
const authRouter = require('./routes/auth');
const employeesRouter = require('./routes/employees');
const payrollRouter = require('./routes/payroll');
const profileRouter = require('./routes/profile');
const { formatDate, formatNumber } = require('./utils');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.locals.formatNumber = formatNumber;
app.locals.formatDate = formatDate;

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Logging requests
app.use(logger('dev'));

// Body and cookie parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Express session
app.use(
	session({
		secret: process.env.SESSION_SECRET,

		saveUninitialized: false,
		resave: false,

		cookie: {
			maxAge: 1000 * 60 * 60 * 10,
		},
	})
);

// Showing flash messages
app.use(flash());

// Routes
app.use('/payroll', payrollRouter);
app.use('/employees', employeesRouter);
app.use('/profile', profileRouter);
app.use('/auth', authRouter);
app.use('/', indexRouter);

// Catch 404 and forward to error handler
app.all('*', (req, res, next) => {
	res.render('error/not-found');
});

// Error handler
app.use(function (err, req, res, next) {
	console.log(err);

	if (err.message.startsWith('Duplicate entry')) {
		const key = err.message.split('key')[1].split('.')[1].replace("_UNIQUE'", '');
		req.flash('error', `That ${key} is already registered`);
		res.redirect('back');
	}

	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error/generic');
});

module.exports = app;

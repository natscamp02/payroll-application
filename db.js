const mysql = require('mysql2');

module.exports = mysql.createConnection({
	host: 'localhost',

	user: 'root',
	password: process.env.DB_PASSWORD,

	database: 'payrollapp',
});

require('dotenv').config({ path: './config.env' });

const app = require('./app');
const PORT = process.env.PORT || 8080;
const conn = require('./db');

conn.connect((err) => {
	if (err) console.log(err);
	else console.log('Connected to database...');
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}...`));

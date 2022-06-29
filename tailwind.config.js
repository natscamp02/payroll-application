/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./views/**/*.ejs'],
	theme: {
		container: {
			center: true,
			padding: '3rem',
		},

		extend: {},
	},
	plugins: [require('daisyui')],

	daisyui: {
		themes: ['corporate', 'business'],
	},
};

/**
 * External dependencies
 */
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	mode: 'development',
	devtool: 'source-map',
	entry: {
		app: './src/js/app.ts',
		content: './src/content.ts',
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: {
					loader: 'ts-loader',
					options: {
						configFile: 'tsconfig.build.json',
					},
				},
				exclude: [/node_modules/, /\.test\.ts$/, /__tests__/],
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{ from: 'manifest.json', to: 'manifest.json' },
				{ from: 'src/html/popup.html', to: 'popup.html' },
				{ from: 'src/css/styles.css', to: 'styles.css' },
				{ from: 'src/config.json', to: 'config.json' },
				{ from: 'src/assets/icons', to: 'icons' },
			],
		}),
	],
};

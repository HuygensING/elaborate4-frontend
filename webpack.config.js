const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
	mode: 'development',

	module: {
		rules: [
			{
				test: /\.jade$/,
				loader: 'pug-loader'
			},
			{
				exclude: /node_modules/,
				test: /\.ts$/,
				loader: "ts-loader",
				// options: {
				// 	transpileOnly: true
				// }
			},
			{
				test: /\.styl$/,
				use: [
					{
						loader: 'style-loader'
					},
					{
						loader: 'css-loader?url=false'
					},
					{
						loader: 'stylus-loader',
						options: {
							stylusOptions: {
								use: ["nib"]
							}
						}
					}
				]
			}
		]
	},

	resolve: {
		extensions: [".webpack.js", ".web.js", ".js", ".ts", ".jade"],
		// alias: {
		// 	hilib: path.resolve(__dirname, 'src/ts/hilib/')
		// }
	},

	devServer: {
		contentBase: path.resolve(process.cwd(), '../../static'),
		disableHostCheck: true,
		headers: {
			"Access-Control-Allow-Origin": "*"
		},
		historyApiFallback: {
			disableDotRule: true
		},
		host: 'localhost',
		hot: true,
		port: 4000,
		watchOptions: {
			ignored: /node_modules/
		}
	},

	entry: ['./src/ts/index.ts'],

	output: {
		filename: 'js/[fullhash].main.js',
		chunkFilename: 'js/[id].chunk.js',
		path: __dirname + '/build-dev-server',
		publicPath: '/',
	},

	plugins: [
		new HtmlWebpackPlugin({
			title: 'eLaborate',
			template: './src/index.jade',
		})
	],
}

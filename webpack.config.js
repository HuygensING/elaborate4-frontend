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
				test: /\.coffee$/,
				loader: 'coffee-loader'
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
		extensions: [".webpack.js", ".web.js", ".js", ".coffee", ".jade"],
	},

	devServer: {
		contentBase: path.resolve(process.cwd(), './static'),
		disableHostCheck: true,
		headers: { "Access-Control-Allow-Origin": "*" },
		historyApiFallback: {
			disableDotRule: true
		},
		host: 'localhost',
		hot: true,
		port: 4000,
		// proxy: {
		// 	'/api': {
		// 		target: `http://localhost:${env.DOCERE_API_PORT}`,
		// 		// pathRewrite: {'^/api': ''}
		// 	},
		// 	'/search': {
		// 		target: `http://localhost:${env.DOCERE_SEARCH_PORT}`,
		// 		pathRewrite: {'^/search': ''}
		// 	},
		// 	'/iiif/vangogh': {
		// 		changeOrigin: true,
		// 		target: 'http://vangoghletters.org/vg/facsimiles',
		// 		pathRewrite: {'^/iiif/vangogh': ''}
		// 	},
		// 	'/iiif': {
		// 		changeOrigin: true,
		// 		target: env.DOCERE_IIIF_BASE_URL,
		// 		pathRewrite: {'^/iiif': ''}
		// 	},
		// },
		watchOptions: {
			ignored: /node_modules/
		}
	},

	entry: ['./src/coffee/main.coffee'],

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

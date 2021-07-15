const HtmlWebpackPlugin = require('html-webpack-plugin')
const baseConfig = require('../../webpack.config.base')
const webpack = require('webpack')
const dotenv = require('dotenv')
const { parsed } = dotenv.config()
const { BACKEND_API_URL, BACKEND_DATA_URL } = parsed

module.exports = () => {
	baseConfig.entry = ['./src/index.jsx']

	baseConfig.devServer.port = 4100

	baseConfig.devServer.proxy = [
		{
			context: [`/data`, `/api/search`, `/draft/api/search`],
			target: 'http://localhost:4101/draft',
			pathRewrite: {
				'^/draft': '',
			}
		},
	]

	baseConfig.plugins = [
		new HtmlWebpackPlugin({
			title: 'BoschDoc',
			template: './src/index.html',
		}),
		new webpack.DefinePlugin({
			'PUBLIC_PATH': '""',
			BACKEND_API_URL: JSON.stringify(BACKEND_API_URL),
			BACKEND_DATA_URL: JSON.stringify(BACKEND_DATA_URL),
		})
	]

	return baseConfig
}

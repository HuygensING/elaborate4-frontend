const HtmlWebpackPlugin = require('html-webpack-plugin')
const baseConfig = require('../../webpack.config.base')

module.exports = () => {
	baseConfig.entry = ['./src/index.jsx']

	baseConfig.devServer.port = 4100

	baseConfig.devServer.proxy = [
		{
			context: ['/data', '/api/search', '/draft/api/search'],
			target: 'http://localhost:4101/draft',
			pathRewrite: { '^/draft': '' }
		},
		// target: 'https://boschdoc.huygens.knaw.nl'
	]

	baseConfig.plugins = [
		new HtmlWebpackPlugin({
			title: 'BoschDoc',
			template: './src/index.html',
		})
	]

	return baseConfig
}

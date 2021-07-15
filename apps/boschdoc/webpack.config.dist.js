const path = require('path')
const webpack = require('webpack')
const devConfig = require('./webpack.config')
const dotenv = require('dotenv')
const { parsed } = dotenv.config()
const { PUBLIC_PATH, BACKEND_API_URL, BACKEND_DATA_URL } = parsed

module.exports = () => {
	const config = devConfig()
	delete config.devServer

	config.mode = "production"

	config.output.path = path.resolve(process.cwd(), '../../public/boschdoc')
	config.output.publicPath = PUBLIC_PATH

	config.plugins.splice(
		1, // start replacing at index 1
		1, // amount of values (1) to replace
		new webpack.DefinePlugin({
			PUBLIC_PATH: JSON.stringify(PUBLIC_PATH),
			BACKEND_API_URL: JSON.stringify(BACKEND_API_URL),
			BACKEND_DATA_URL: JSON.stringify(BACKEND_DATA_URL),
		})
	)

	return config
}

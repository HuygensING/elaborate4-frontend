const path = require('path')
const baseConfig = require('./webpack.config')

module.exports = () => {
	const config = baseConfig()
	delete config.devServer

	config.mode = "production"

	config.output.path = path.resolve(process.cwd(), '../../public/boschdoc')

	return config
}

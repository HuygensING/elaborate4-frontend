const path = require('path')
const baseConfig = require('../../webpack.config.base')

module.exports = () => {
	delete baseConfig.devServer

	baseConfig.mode = "production"

	baseConfig.output.path = path.resolve(process.cwd(), '../../public/boschdoc')

	return baseConfig
}

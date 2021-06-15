const baseConfig = require('../../webpack.config.base')

module.exports = () => {
	baseConfig.devServer.port = 4001
	return baseConfig
}

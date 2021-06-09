const baseConfig = require('../../webpack.config')

module.exports = () => {
	baseConfig.devServer.port = 4001
	return baseConfig
}

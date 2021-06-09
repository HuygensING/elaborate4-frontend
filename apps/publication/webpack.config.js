const baseConfig = require('../../webpack.config')

// const editionName = 'elab4-hattem'
// const editionName = 'elab4-margarethaklooster'
const editionName = 'edition'

module.exports = () => {
	baseConfig.devServer.proxy = {
		'/data': {
			target: `http://localhost:4002/${editionName}`
		},
	}

	baseConfig.devServer.proxy[`/${editionName}/api`] = {
		target: `http://localhost:4002`
	}

	return baseConfig
}

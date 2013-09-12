define (require) ->
	config = require 'config'
	Base = require 'collections/base'

	Models =
		Project: require 'models/project'

	class Projects extends Base

		model: Models.Project
		
		url: config.baseUrl+'projects'
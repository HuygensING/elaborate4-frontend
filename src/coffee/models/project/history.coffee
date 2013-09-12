define (require) ->
	# config = require 'config'
	Models = 
		Base: require 'models/base'
		# state: require 'models/state'

	class ProjectHistory extends Models.Base
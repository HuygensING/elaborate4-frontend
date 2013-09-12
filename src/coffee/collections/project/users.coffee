define (require) ->
	config = require 'config'

	Models = 
		state: require 'models/state'

	Collections =
		Base: require 'collections/base'

	class ProjectUsers extends Collections.Base

		url: ->
			id = Models.state.get('currentProject').id
			"#{config.baseUrl}projects/#{id}/users"
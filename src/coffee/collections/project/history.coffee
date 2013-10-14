define (require) ->
	config = require 'config'

	Models = 
		state: require 'models/state'

	Collections =
		Base: require 'collections/base'
		projects: require 'collections/projects'

	class ProjectHistory extends Collections.Base

		url: -> "#{config.baseUrl}projects/#{Collections.projects.current.id}/logentries"
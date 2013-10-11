define (require) ->
	config = require 'config'

	Collections =
		Base: require 'collections/base'

	class ProjectUsers extends Collections.Base

		initialize: (models, options) ->
			super

			@projectID = options.projectId

		url: -> "#{config.baseUrl}projects/#{@projectID}/users"
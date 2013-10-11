define (require) ->
	config = require 'config'
	token = require 'hilib/managers/token'

	Models =
		state: require 'models/state'

	# Collections =
	# 	projects: require 'collections/projects'

	class ProjectStatistics

		constructor: ->

		fetch: (cb) ->
			jqXHR = $.ajax
				url: "#{config.baseUrl}projects/#{Collections.projects.current.id}/statistics"
				type: 'get'
				dataType: 'json'
				beforeSend: (xhr) =>
					xhr.setRequestHeader 'Authorization', "SimpleAuth #{token.get()}"

			jqXHR.done (data) ->
				cb data
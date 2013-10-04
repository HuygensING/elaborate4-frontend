define (require) ->
	config = require 'config'
	token = require 'hilib/managers/token'

	Models =
		state: require 'models/state'

	class ProjectStatistics

		constructor: ->

		fetch: (cb) ->
			Models.state.getCurrentProjectId (id) =>
				jqXHR = $.ajax
					url: "#{config.baseUrl}projects/#{id}/statistics"
					type: 'get'
					dataType: 'json'
					beforeSend: (xhr) =>
						xhr.setRequestHeader 'Authorization', "SimpleAuth #{token.get()}"

				jqXHR.done (data) ->
					cb data
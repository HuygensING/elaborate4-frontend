define (require) ->
	config = require 'config'
	token = require 'managers/token'

	Models = 
		state: require 'models/state'

	class ProjectMetadataEntries

		constructor: ->

		fetch: (cb) ->
			Models.state.getCurrentProjectId (id) =>
				jqXHR = $.ajax
					url: "#{config.baseUrl}projects/#{id}/entrymetadatafields"
					type: 'get'
					dataType: 'json'
					beforeSend: (xhr) =>
						xhr.setRequestHeader 'Authorization', "SimpleAuth #{token.get()}"

				jqXHR.done (data) ->
					cb data
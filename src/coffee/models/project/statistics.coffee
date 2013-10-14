# * TODO: use hilib/managers/ajax
define (require) ->
	config = require 'config'
	token = require 'hilib/managers/token'

	# Models =
	# 	state: require 'models/state'

	# Collections =
	# 	projects: require 'collections/projects'

	class ProjectStatistics

		constructor: (@projectID) ->

		fetch: (cb) ->
			jqXHR = $.ajax
				url: "#{config.baseUrl}projects/#{@projectID}/statistics"
				type: 'get'
				dataType: 'json'
				beforeSend: (xhr) =>
					xhr.setRequestHeader 'Authorization', "SimpleAuth #{token.get()}"

			jqXHR.done (data) ->
				cb data
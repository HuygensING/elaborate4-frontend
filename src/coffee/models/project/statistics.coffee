# * TODO: use hilib/managers/ajax
define (require) ->
	config = require 'config'
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Base = require 'models/base'
	# Models =
	# 	state: require 'models/state'

	# Collections =
	# 	projects: require 'collections/projects'

	class ProjectStatistics extends Base

		url: -> "#{config.baseUrl}projects/#{@projectID}/statistics"

		initialize: (attrs, options) ->
			super

			@projectID = options.projectID

		sync: (method, model, options) ->
			if method is 'read'
				ajax.token = token.get()
				jqXHR = ajax.get
					url: @url()
				jqXHR.done (response) => options.success response
				jqXHR.fail => console.error 'Saving ProjectSettings failed!'
			else
				super method, model, options
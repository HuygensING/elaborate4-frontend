# * TODO: use hilib/managers/ajax
define (require) ->
	Backbone = require 'backbone'
	
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
				jqXHR.fail (response) => 
					console.error 'Saving ProjectSettings failed!'
					Backbone.history.navigate 'login', trigger: true if response.status is 401
			else
				super method, model, options
define (require) ->
	config = require 'config'
	token = require 'hilib/managers/token'
	ajax = require 'hilib/managers/ajax'

	Models = 
		Base: require 'models/base'

	class ProjectSettings extends Models.Base

		defaults: ->
			'Project leader': ''
			'Project title': ''
			'projectType': ''
			'publicationURL': ''
			'Release date': ''
			'Start date': ''
			'Version': ''
			'entry.term_singular': 'entry'
			'entry.term_plural': 'entries'

		url: -> "#{config.baseUrl}projects/#{@projectID}/settings"

		initialize: (attrs, options) ->
			super

			@projectID = options.projectID

		sync: (method, model, options) ->
			if method is 'create'
				ajax.token = token.get()
				jqXHR = ajax.put
					url: @url()
					data: JSON.stringify(@)
				jqXHR.done (response) => options.success response
				jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401
			else
				super method, model, options
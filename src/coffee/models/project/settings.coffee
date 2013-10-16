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
				jqXHR.fail => console.error 'Saving ProjectSettings failed!'
			else
				super method, model, options
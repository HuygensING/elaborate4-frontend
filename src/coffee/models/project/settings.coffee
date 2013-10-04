define (require) ->
	config = require 'config'
	token = require 'hilib/managers/token'
	ajax = require 'hilib/managers/ajax'

	Models = 
		Base: require 'models/base'
		state: require 'models/state'

	class ProjectSettings extends Models.Base

		url: ->
			id = Models.state.get('currentProject').id
			"#{config.baseUrl}projects/#{id}/settings"

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
define (require) ->

	config = require 'config'

	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Models = 
		Base: require 'models/base'

	class User extends Models.Base

		urlRoot: -> config.baseUrl + "users"

		defaults: ->
			username: ''
			email: ''
			firstName: ''
			lastName: ''
			role: 'User'
			password: ''

		sync: (method, model, options) ->
			
			if method is 'create'
				ajax.token = token.get()
				jqXHR = ajax.post
					url: @url()
					dataType: 'text'
					data: JSON.stringify model.toJSON()

				jqXHR.done (data, textStatus, jqXHR) =>
					if jqXHR.status is 201
						url = jqXHR.getResponseHeader('Location')

						xhr = ajax.get url: url
						xhr.done (data, textStatus, jqXHR) =>
							@trigger 'sync'
							options.success data

				jqXHR.fail (response) => console.log 'fail', response

			else if method is 'update'
				ajax.token = token.get()
				jqXHR = ajax.put
					url: @url()
					data: JSON.stringify model.toJSON()
				jqXHR.done (response) => @trigger 'sync'
				jqXHR.fail (response) => console.log 'fail', response

			else
				super
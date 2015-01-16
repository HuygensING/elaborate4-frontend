config = require './config'

ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

Models = 
	Base: require './base'

class User extends Models.Base

	urlRoot: -> "#{config.get('restUrl')}users"

	validation:
		username:
			required: true
			'min-length': 2
		password:
			required: true
			'min-length': 6
		email:
			required: true
			pattern: 'email'
		firstName:
			pattern: 'string'
		lastName:
			pattern: 'string'

	defaults: ->
		username: ''
		email: ''
		firstName: ''
		lastName: ''
		role: 'USER'
		password: ''

	getShortName: ->
		name = @get('lastName')
		name ?= @get('firstName')
		name ?= 'user'

		name

	# ### Overrides

	parse: (attr) ->
		attr.title = attr.title + ' (' + attr.username + ')'

		attr

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

			jqXHR.fail (response) => 
				options.error response
				Backbone.history.navigate 'login', trigger: true if response.status is 401

		else if method is 'update'
			data = model.clone().toJSON()
			delete data.title
			delete data.roleString
			delete data.loggedIn

			ajax.token = token.get()
			jqXHR = ajax.put
				url: @url()
				data: JSON.stringify data
			jqXHR.done (response) => @trigger 'sync'
			jqXHR.fail (response) => 
				options.error response
				jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

		else
			super

	# ### Methods

	resetPassword: ->
		console.log 'reset', config.get('restUrl')
		# jqXHR = ajax.post
		# 	url: -> "#{config.get('restUrl')}/users/passwordresetrequest"
		# 	data: @get 'email'

module.exports = User
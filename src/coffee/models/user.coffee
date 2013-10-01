define (require) ->

	# config = require 'config'

	Models = 
		Base: require 'models/base'

	class User extends Models.Base

		defaults: ->
			username: ''
			email: ''
			firstName: ''
			lastName: ''
			role: 'User'
			password: ''
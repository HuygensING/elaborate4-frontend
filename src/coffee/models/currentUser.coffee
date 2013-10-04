define (require) ->
	config = require 'config'
	token = require 'hilib/managers/token'

	Models =
		Base: require 'models/base'

	Collections =
		Base: require 'collections/base'

	class CurrentUser extends Models.Base

		defaults: ->
			rev: null
			username: null
			title: null
			email: null
			firstName: null
			lastName: null
			root: null # boolean
			roleString: null
			loggedIn: null # boolean

		initialize: ->
			super

			@subscribe 'unauthorized', -> sessionStorage.clear()

		authorize: ->
			if token.get()
				@fetchUserAttrs => 
					@publish 'authorized'

		login: (username, password) ->
			@set 'username', username
			@password = password

			@fetchUserAttrs =>
				sessionStorage.setItem 'huygens_user', JSON.stringify(@attributes)
				@publish 'authorized'

		logout: (args) ->
			jqXHR = $.ajax
				type: 'post'
				url: config.baseUrl + "sessions/#{token.get()}/logout"

			jqXHR.done -> location.reload()

			jqXHR.fail -> console.error 'Logout failed'

		fetchUserAttrs: (cb) ->
			if userAttrs = sessionStorage.getItem 'huygens_user'
				@set JSON.parse(userAttrs)
				cb()
			else
				jqXHR = $.ajax
					type: 'post'
					url: config.baseUrl + 'sessions/login'
					data: 
						username: @get 'username'
						password: @password

				jqXHR.done (data) =>
					@password = null
					
					token.set data.token
					@set data.user

					cb()

				jqXHR.fail => @publish 'unauthorized'
			

	new CurrentUser()
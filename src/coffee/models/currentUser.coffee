define (require) ->
	config = require 'config'
	token = require 'hilib/managers/token'

	Models =
		Base: require 'models/base'

	Collections =
		Base: require 'collections/base'

	class CurrentUser extends Models.Base

		defaults: ->
			username: ''
			title: ''
			email: ''
			firstName: ''
			lastName: ''
			role: ''
			roleString: ''
			roleNo: ''
			loggedIn: false # boolean

		# ### Initiailze
		initialize: ->
			super

			@loggedIn = false

			@subscribe 'unauthorized', -> sessionStorage.clear()

		# ### Overrides

		parse: (attrs) ->
			attrs.roleNo = config.roles[attrs.role]
			attrs

		# ### Methods

		authorize: (args) ->
			{@authorized, @unauthorized} = args

			if token.get()
				@fetchUserAttrs => 
					# @trigger 'authorized'
					# @publish 'authorized'
					@authorized()
					@loggedIn = true
			else
				@unauthorized()

		login: (username, password) ->
			@set 'username', username
			@password = password

			@fetchUserAttrs =>
				sessionStorage.setItem 'huygens_user', JSON.stringify(@attributes)
				# @publish 'authorized'
				# @trigger 'authorized'
				@authorized()
				@loggedIn = true

		logout: (args) ->
			jqXHR = $.ajax
				type: 'post'
				url: config.baseUrl + "sessions/#{token.get()}/logout"

			jqXHR.done ->
				sessionStorage.clear()
				location.reload()

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

					data.user = @parse data.user

					token.set data.token
					@set data.user

					cb()

				jqXHR.fail (a, b, c) =>
					console.log a, b, c
					# @publish 'unauthorized'
					# @trigger 'unauthorized'
					@unauthorized()
			

	new CurrentUser()
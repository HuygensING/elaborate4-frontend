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
			attrs.title ?= attrs.username
			attrs.roleNo = config.roles[attrs.role]
			attrs

		# ### Methods

		# TODO Doc
		authorized: ->

		# TODO Doc
		unauthorized: ->

		# TODO Doc
		navigateToLogin: ->

		authorize: (args) ->
			{@authorized, @unauthorized, @navigateToLogin} = args

			if token.get()
				@fetchUserAttrs
					done: => 
						@authorized()
						@loggedIn = true
			else
				@navigateToLogin()

		login: (username, password) ->
			@set 'username', username

			@fetchUserAttrs
				username: username
				password: password
				done: =>
					sessionStorage.setItem 'huygens_user', JSON.stringify(@attributes)
					@authorized()
					@loggedIn = true

		hsidLogin: (hsid) ->
			@fetchUserAttrs
				hsid: hsid
				done: =>
					sessionStorage.setItem 'huygens_user', JSON.stringify(@attributes)
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

		fetchUserAttrs: (args) ->
			{username, password, hsid, done} = args

			if userAttrs = sessionStorage.getItem 'huygens_user'
				@set JSON.parse(userAttrs)
				done()
			else
				if hsid?
					data = hsid: hsid 
				else if username? and password?
					data = 
						username: username
						password: password
				else
					return @unauthorized()

				jqXHR = $.ajax
					type: 'post'
					url: config.baseUrl + 'sessions/login'
					data: data

				jqXHR.done (data) =>
					data.user = @parse data.user

					token.set data.token
					@set data.user

					done()

				jqXHR.fail => @unauthorized()
			

	new CurrentUser()
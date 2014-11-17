Backbone = require 'backbone'

config = require 'elaborate-modules/modules/models/config'
token = require 'hilib/src/managers/token'
$ = require 'jquery'

ajax = require 'hilib/src/managers/ajax'

Models =
	Base: require './base'

Collections =
	Base: require '../collections/base'

class CurrentUser extends Backbone.Model

	###
	@return {object} defaults
	@prop {string} role - READER, USER, PROJECTLEADER, ADMIN
	@prop {number} defaults.roleNo - 10: reader, 20: user, 30: projectleader, 40: admin
	###
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
		@loggedIn = false

	# ### Overrides

	parse: (attrs) ->
		attrs.title ?= attrs.username
		attrs.roleNo = config.get('roles')[attrs.role]
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
		jqXHR = ajax.post
			url: config.get('restUrl') + "sessions/#{token.get()}/logout"
			dataType: 'text'
			contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
		,
			token: false

		jqXHR.done ->
			@loggedIn = false
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
				postData = hsid: hsid
			else if username? and password?
				postData =
					username: username
					password: password
			else
				return @unauthorized()

			jqXHR = $.ajax
				type: 'post'
				url: config.get('restUrl') + 'sessions/login'
				data: postData

			jqXHR.done (data) =>
				data.user = @parse data.user

				type = 'Federated' if hsid?
				token.set data.token, type
				@set data.user

				done()

			jqXHR.fail => @unauthorized()

	resetPassword: (cb) ->
		jqXHR = ajax.post
			url: "/users/passwordresetrequest"

		jqXHR.done => 
			console.log arguments
			cb()
		jqXHR.fail => console.log arguments
		

module.exports = new CurrentUser()
define (require) ->
	BaseView = require 'views/base'

	currentUser = require 'models/currentUser'

	Templates =
		'Login': require 'text!html/login.html'
	
	class Login extends BaseView

		className: 'row span3'

		events:
			'click input#submit': 'submit'

		submit: (ev) ->
			ev.preventDefault()

			currentUser.login()

			# @publish 'navigate:project'

		initialize: ->
			super
			
			@render()

		render: ->
			rtpl = _.template Templates.Login
			@$el.html rtpl

			@
define (require) ->
	BaseView = require 'views/base'

	currentUser = require 'models/currentUser'

	# Templates =
	# 	'Login': require 'text!html/login.html'
	tpls = require 'tpls'

	class Login extends BaseView

		className: 'row span3'

		events:
			'click input#submit': 'submit'

		submit: (ev) ->
			ev.preventDefault()

			@el.querySelector('li.login').style.display = 'none'
			@el.querySelector('li.loggingin').style.display = 'inline-block'

			currentUser.login @$('#username').val(), @$('#password').val()

		initialize: ->
			super
			
			@render()

		render: ->
			rtpl = tpls['login']
			@$el.html rtpl()
			
			@
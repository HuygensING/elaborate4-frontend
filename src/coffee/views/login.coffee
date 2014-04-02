Backbone = require 'backbone'
$ = require 'jquery'

BaseView = require 'hilib/src/views/base'

currentUser = require '../models/currentUser'
ResetPassword = require '../models/reset-password'

history = require 'hilib/src/managers/history'
ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

Modal = require 'hilib/src/views/modal'
Form = require 'hilib/src/views/form/main'
# Templates =
# 	'Login': require 'text!html/login.html'
tpl = require '../../jade/login.jade'
resetPasswordTpl = require '../../jade/reset-password.jade'

class Login extends BaseView

	className: 'login'

	# ### INITIALIZE
	initialize: ->
		super
		
		path = window.location.search.substr 1
		parameters = path.split '&'

		for param in parameters
			[key, value] = param.split('=')
			@hsid = value if key is 'hsid'

		if @hsid?
			currentUser.hsidLogin @hsid
		else
			@render()

		@subscribe 'login:failed', @loginFailed

	# ### RENDER
	render: ->
		@$el.html tpl()
		
		@

	# ### EVENTS
	events: ->
		'keyup input': => @$('ul.message li').slideUp()
		'click button[name="submit"]': 'submit'
		'click button.federated-login': 'federatedLogin'
		'click li.resetpassword': 'resetPassword'

	resetPassword: ->
		resetPasswordForm = new Form
			saveOnSubmit: false
			tpl: resetPasswordTpl
			Model: ResetPassword

		@listenTo resetPasswordForm, 'cancel', => modal.close()
		@listenTo resetPasswordForm, 'submit', (user) => 
			user.resetPassword =>
				$('.modal .modalbody .body li').first().html "<p>An email has been send to your emailaddress. Please follow the link to reset your password.</p>"
				$('.modal .modalbody .body li').last().css 'opacity', 0

		modal = new Modal
			customClassName: 'reset-password'
			title: "Forgot your password?"
			html: resetPasswordForm.el
			cancelAndSubmit: false
			width: '300px'

	submit: (ev) ->
		ev.preventDefault()

		if @$('#username').val() is '' or @$('#password').val() is ''
			@$('ul.message li').show().html 'Please enter a username and password.'
			return

		@$('li.login button').addClass 'loading'

		currentUser.login @$('#username').val(), @$('#password').val()

	federatedLogin: (ev) ->
		wl = window.location;
		hsURL = wl.origin + wl.pathname
		loginURL = 'https://secure.huygens.knaw.nl/saml2/login'

		form = $ '<form>'
		form.attr
			method: 'POST'
			action: loginURL

		hsUrlEl = $('<input>').attr
			name: 'hsurl'
			value: hsURL
			type: 'hidden'

		form.append(hsUrlEl)
		$('body').append(form);

		form.submit()

	# ### METHODS

	loginFailed: ->
		@render()
		@$('ul.message li').html('Username / password combination unknown!').show()

module.exports = Login
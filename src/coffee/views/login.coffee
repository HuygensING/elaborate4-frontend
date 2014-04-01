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

	className: 'login row span3'

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

		# console.log history

		# redirect = history.last() ? 'http://localhost:4000/'
		# url = decodeURI 'https://secure.huygens.knaw.nl/saml2/login?'+redirect
		# a = $('<a href="'+url+'" data-bypass target="_blank">federated login</a>')
		# @$('.federated').html a
		
		@

	# ### EVENTS
	events: ->
		'click input#submit': 'submit'
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
		# console.log 'user'
		# user.resetPassword()

		modal = new Modal
			customClassName: 'reset-password'
			title: "Forgot your password?"
			html: resetPasswordForm.el
			# submitValue: 'Send e-mail'
			cancelAndSubmit: false
			width: '300px'
		# modal.on 'cancel', =>
		# modal.on 'submit', =>
		# 	console.log 'sub'
		# 	currentUser.resetPassword =>
		# 		modal.messageAndFade 'success', 'Password send!'

	submit: (ev) ->
		ev.preventDefault()

		@el.querySelector('li.login').style.display = 'none'
		@el.querySelector('li.loggingin').style.display = 'inline-block'

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
		console.log 'fail'
		@render()
		@$('ul.message li').html('Username / password combination unknown!').show()

module.exports = Login
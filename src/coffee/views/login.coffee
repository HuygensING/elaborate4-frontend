$ = require 'jquery'

BaseView = require 'hilib/src/views/base'

currentUser = require '../models/currentUser'

history = require 'hilib/src/managers/history'
ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

Modal = require 'hilib/src/views/modal'
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
		modal = new Modal
			customClassName: 'reset-password'
			title: "Forgot your password?"
			html: resetPasswordTpl()
			submitValue: 'Send e-mail'
			width: '300px'
		modal.on 'cancel', =>
		modal.on 'submit', => modal.messageAndFade 'success', 'Password send!'

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
		@render()
		@$('ul.message li').html('Username / password combination unknown!').show()

module.exports = Login
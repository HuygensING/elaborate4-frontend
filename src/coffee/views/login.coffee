define (require) ->
	BaseView = require 'hilib/views/base'

	currentUser = require 'models/currentUser'

	history = require 'hilib/managers/history'
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	# Templates =
	# 	'Login': require 'text!html/login.html'
	tpls = require 'tpls'

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
			rtpl = tpls['login']
			@$el.html rtpl()

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
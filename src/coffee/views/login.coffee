define (require) ->
	BaseView = require 'views/base'

	currentUser = require 'models/currentUser'

	history = require 'hilib/managers/history'
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	# Templates =
	# 	'Login': require 'text!html/login.html'
	tpls = require 'tpls'

	class Login extends BaseView

		className: 'row span3'

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

			# console.log history

			# redirect = history.last() ? 'http://localhost:4000/'
			# url = decodeURI 'https://secure.huygens.knaw.nl/saml2/login?'+redirect
			# a = $('<a href="'+url+'" data-bypass target="_blank">federated login</a>')
			# @$('.federated').html a
			
			@

		events: ->
			'click input#submit': 'submit'
			'click button.federated-login': 'federatedLogin'

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



			# jqXHR = ajax.post
			# 	url: 'https://secure.huygens.knaw.nl/saml2/login'
			# 	data: JSON.stringify hsurl: 'http://localhost:4000'

			# jqXHR.done => console.log arguments

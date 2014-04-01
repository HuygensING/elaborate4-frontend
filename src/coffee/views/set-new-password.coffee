Backbone = require 'backbone'
$ = require 'jquery'

BaseView = require 'hilib/src/views/base'

Models =
	SetNewPassword: require '../models/set-new-password'

history = require 'hilib/src/managers/history'
ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

Views =
	Modal: require 'hilib/src/views/modal'
	Form: require 'hilib/src/views/form/main'
# Templates =
# 	'Login': require 'text!html/login.html'
tpl = require '../../jade/set-new-password.jade'

class SetNewPassword extends Backbone.View

	className: 'set-new-password'

	# ### Initialize
	initialize: -> @render()

	# ### Render
	render: ->
		setNewPasswordModel = new Models.SetNewPassword()
		for getVar in location.search.substr(1).split('&')
			getVar = getVar.split('=')
			setNewPasswordModel.set getVar[0], getVar[1] if getVar[0] is 'emailaddress' or getVar[0] is 'token'

		form = new Views.Form
			tpl: tpl
			model: setNewPasswordModel
			saveOnSubmit: false

		form.$('a[name="login"]').on 'click', =>
			form.destroy()
			modal.destroy()
			@remove()
			window.location = '/login'

		form.on 'submit', (model) =>
			model.setNewPassword =>
				form.$('ul').hide()
				form.$('p').show()

		modal = new Views.Modal
			title: 'Choose a new password'
			clickOverlay: false
			html: form.el
			cancelAndSubmit: false
			customClassName: 'set-new-password'

module.exports = SetNewPassword
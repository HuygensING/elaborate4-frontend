Backbone = require 'backbone'
config = require './config'

ajax = require 'hilib/src/managers/ajax'
# token = require 'hilib/src/managers/token'

# Models = 
# 	Base: require './base'

class SetNewPassword extends Backbone.Model

	validation:
		password1:
			required: true
			'min-length': 6
		password2:
			required: true
			'min-length': 6
			equal: 'password1'

	defaults: ->
		password1: ''
		password2: ''
		emailaddress: ''
		token: ''

	# ### Methods
	setNewPassword: (cb) ->
		data =
			emailAddress: @get 'emailaddress'
			token: @get 'token'
			newPassword: @get 'password2'

		jqXHR = ajax.post
			url: "#{config.get('restUrl')}sessions/passwordreset"
			dataType: 'text'
			data: JSON.stringify data
		jqXHR.done => cb()
				

module.exports = SetNewPassword
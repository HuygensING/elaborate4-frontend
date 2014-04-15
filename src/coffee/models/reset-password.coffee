config = require 'elaborate-modules/modules/models/config'

ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

Models = 
	Base: require './base'

class ResetPassword extends Models.Base

	validation:
		email:
			required: true
			pattern: 'email'

	defaults: ->
		email: ''


	# ### Methods

	resetPassword: ->
		ajax.post
			url: "#{config.get('restUrl')}sessions/passwordresetrequest"
			dataType: 'text'
			data: @get 'email'

module.exports = ResetPassword
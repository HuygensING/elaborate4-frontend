Backbone = require 'backbone'

token = require 'hilib/src/managers/token'
Pubsub = require 'hilib/src/mixins/pubsub'

class Base extends Backbone.Model

	initialize: ->
		_.extend @, Pubsub

	sync: (method, model, options) ->
		options.beforeSend = (xhr) =>
			xhr.setRequestHeader 'Authorization', "#{token.getType()} #{token.get()}"

		super method, model, options

module.exports = Base
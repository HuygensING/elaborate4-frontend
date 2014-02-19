Backbone = require 'backbone'
_ = require 'underscore'

token = require 'hilib/src/managers/token'
Pubsub = require 'hilib/src/mixins/pubsub'

class Base extends Backbone.Collection

	token: null

	initialize: ->
		_.extend @, Pubsub

	sync: (method, model, options) ->
		options.beforeSend = (xhr) =>
			xhr.setRequestHeader 'Authorization', "#{token.getType()} #{token.get()}"

		super method, model, options

	removeById: (id) ->
		model = @get id
		@remove model

module.exports = Base
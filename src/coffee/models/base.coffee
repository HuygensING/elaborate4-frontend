define (require) ->
	Backbone = require 'backbone'

	token = require 'managers/token'
	Pubsub = require 'managers/pubsub'

	class Base extends Backbone.Model

		initialize: ->
			_.extend @, Pubsub

		sync: (method, model, options) ->
			options.beforeSend = (xhr) =>
				xhr.setRequestHeader 'Authorization', "SimpleAuth #{token.get()}"

			super method, model, options
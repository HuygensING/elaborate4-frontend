define (require) ->
	Backbone = require 'backbone'

	token = require 'hilib/managers/token'
	Pubsub = require 'hilib/mixins/pubsub'

	class Base extends Backbone.Collection

		token: null

		initialize: ->
			_.extend @, Pubsub

		sync: (method, model, options) ->
			options.beforeSend = (xhr) =>
				xhr.setRequestHeader 'Authorization', "SimpleAuth #{token.get()}"

			super method, model, options

		removeById: (id) ->
			model = @get id
			@remove model
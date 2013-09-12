define (require) ->
	Backbone = require 'backbone'

	Pubsub = require 'managers/pubsub'
	viewManager = require 'managers/view'

	class BaseView extends Backbone.View

		defaults: ->
			managed: true # option to determine if the view is managed by the view manager

		initialize: ->
			@options = _.extend @defaults(), @options

			viewManager.register(this) if @options.managed

			_.extend @, Pubsub # extend the view with pubsub terminology (just aliases for listenTo and trigger)

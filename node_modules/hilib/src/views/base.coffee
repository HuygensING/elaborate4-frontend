Backbone = require 'backbone'
$ = require 'jquery'
Backbone.$ = $
_ = require 'underscore'

Pubsub = require '../mixins/pubsub'

class BaseView extends Backbone.View

	initialize: ->
		_.extend @, Pubsub # extend the view with pubsub terminology (just aliases for listenTo and trigger)

		@subviews = {}

	destroy: ->
		subview.destroy() for name, subview of @subviews
		@remove()

module.exports = BaseView
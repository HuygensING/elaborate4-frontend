Backbone = require 'backbone'

module.exports =
	subscribe: (ev, done) ->
		@listenTo Backbone, ev, done

	publish: ->
		# FIXME [UNSUPPORTED]: arguments can't be array like object in IE < 10
		Backbone.trigger.apply Backbone, arguments
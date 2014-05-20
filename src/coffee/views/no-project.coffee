Backbone = require 'backbone'
$ = require 'jquery'

BaseView = require 'hilib/src/views/base'

Views =
	Modal: require 'hilib/src/views/modal'

class NoProject extends Backbone.View

	className: 'no-project'

	# ### Initialize
	initialize: -> @render()

	# ### Render
	render: ->
		modal = new Views.Modal
			title: 'You are not assigned to a project'
			clickOverlay: false
			html: "Please contact an administrator."
			cancelAndSubmit: false

module.exports = NoProject
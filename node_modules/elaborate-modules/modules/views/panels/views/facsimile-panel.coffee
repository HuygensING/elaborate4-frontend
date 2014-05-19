Backbone = require 'backbone'

tpl = require '../templates/facsimile-panel.jade'

class FacsimilePanel extends Backbone.View

	className: 'facsimile'

	# ### Initialize
	initialize: -> 
		@render()


	# ### Render
	render: ->
		@$el.html tpl
			entry: @options.entry
			zoomUrl: @options.zoomUrl

		@

	# ### Methods
	destroy: -> @remove()

	updatePosition: (top) -> @$el.css 'margin-top', top

module.exports = FacsimilePanel
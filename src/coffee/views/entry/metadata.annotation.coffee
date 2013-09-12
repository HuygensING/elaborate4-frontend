# Description...
define (require) ->
	Fn = require 'helpers2/general'

	Views = 
		Base: require 'views/base'

	Tpl = require 'text!html/entry/metadata.annotation.html'

	# ## AnnotationMetadata
	class AnnotationMetadata extends Views.Base

		# ### Initialize
		initialize: ->
			super

			@render()

		# ### Render
		render: ->
			rtpl = _.template Tpl, collection: @collection.toJSON()
			@$el.html rtpl

			@

		# ### Events
		events: ->

		# ### Methods
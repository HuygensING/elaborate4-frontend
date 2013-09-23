# Description...
define (require) ->
	Fn = require 'helpers/general'

	Views = 
		Base: require 'views/base'

	Tpl = require 'text!html/entry/annotation.metadata.html'

	# ## AnnotationMetadata
	class AnnotationMetadata extends Views.Base

		# ### Initialize
		initialize: ->
			super

			@render()

		# ### Render
		render: ->
			console.log @model, @collection
			rtpl = _.template Tpl, 
				model: @model
				collection: @collection
			@$el.html rtpl

			@

		# ### Events
		events: ->
			'change select': 'selectChanged'

		selectChanged: (ev) ->
			annotationTypeID = ev.currentTarget.options[ev.currentTarget.selectedIndex].getAttribute 'data-id'
			@model.set 'annotationType', @collection.get annotationTypeID
			console.log @model

		# ### Methods
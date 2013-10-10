# Description...
define (require) ->
	Fn = require 'hilib/functions/general'

	Views = 
		Form: require 'hilib/views/form/main'

	Tpl = require 'text!html/entry/metadata.html'

	# ## EntryMetadata
	class EntryMetadata extends Views.Form

		# ### Initialize
		initialize: ->
			super

			@render()

		# ### Render
		render: ->
			rtpl = _.template Tpl, @model.toJSON()
			@$el.html rtpl

			@

		# # ### Events
		# events: ->
		# 	'change select': 'selectChanged'

		# selectChanged: (ev) ->
		# 	annotationTypeID = ev.currentTarget.options[ev.currentTarget.selectedIndex].getAttribute 'data-id'
		# 	@model.set 'annotationType', @collection.get annotationTypeID
		# 	console.log @model

		# # ### Methods
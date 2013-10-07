# Description...
define (require) ->
	Fn = require 'hilib/functions/general'

	Views = 
		Base: require 'views/base'

	Tpl = require 'text!html/entry/subsubmenu/textlayers.edit.html'

	# ## AnnotationMetadata
	class EditTextlayers extends Views.Base

		# ### Initialize
		initialize: ->
			super

			@listenTo @collection, 'add', @render
			@listenTo @collection, 'remove', @render

			@render()

		# ### Render
		render: ->
			rtpl = _.template Tpl, transcriptions: @collection
			@$el.html rtpl

			@

		# ### Events
		events: ->
			'click button.addtextlayer': 'addtextlayer'
			'click ul.textlayers li': (ev) => $(ev.currentTarget).addClass 'destroy'
			'click ul.textlayers li.destroy .orcancel': 'cancelRemove'
			'click ul.textlayers li.destroy .name': 'destroytextlayer'

		cancelRemove: (ev) ->
			ev.stopPropagation()
			parentLi = $(ev.currentTarget).parents('li')
			parentLi.removeClass 'destroy'

		destroytextlayer: (ev) ->
			transcriptionID = $(ev.currentTarget).parents('li').attr 'data-id'
			@collection.remove @collection.get transcriptionID

		addtextlayer: ->
			name = @el.querySelector('input[name="name"]').value
			text = @el.querySelector('textarea[name="text"]').value

			unless name is ''
				data = 
					textLayer: name
					body: text
				@collection.create data, wait: true

		# selectChanged: (ev) ->
		# 	annotationTypeID = ev.currentTarget.options[ev.currentTarget.selectedIndex].getAttribute 'data-id'
		# 	@model.set 'annotationType', @collection.get annotationTypeID
		# 	console.log @model

		# ### Methods
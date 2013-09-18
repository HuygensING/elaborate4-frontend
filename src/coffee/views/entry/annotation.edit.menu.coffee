# Description...
define (require) ->
	Fn = require 'helpers/general'
	config = require 'config'

	Views = 
		Base: require 'views/base'

	Tpl = require 'text!html/entry/annotation.edit.menu.html'

	# ## AnnotationEditMenu
	class AnnotationEditMenu extends Views.Base

		className: 'annotationeditmenu'

		# ### Initialize
		initialize: ->
			super

			@addListeners()

			@render()

		# ### Render
		render: ->
			rtpl = _.template Tpl, @model.toJSON()
			@$el.html rtpl

			@

		# ### Events
		events: ->
			'click button.ok': 'save'

		save: ->
			
			if @model.isNew()
				# If we want to listenTo 'sync' then @collection.create does not work in this situation.
				@model.url = config.baseUrl + "projects/#{@collection.projectId}/entries/#{@collection.entryId}/transcriptions/#{@collection.transcriptionId}/annotations"
				@model.save()
				@collection.add @model
			else
				@model.save()

		# ### Methods
		setModel: (annotation) ->
			@model = annotation
			@addListeners()

		addListeners: ->
			@listenTo @model, 'sync', (model, resp, options) => @el.querySelector('button.ok').disabled = true
			@listenTo @model, 'change:body', => @el.querySelector('button.ok').disabled = false
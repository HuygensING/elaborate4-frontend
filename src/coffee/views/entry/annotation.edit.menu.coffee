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
			'click button.cancel': => @trigger 'cancel', @model

		save: ->
			
			if @model.isNew()
				# We set the urlRoot (instead of the url), because the model is used outside of a collection.
				# If we want to listenTo 'sync' then @collection.create does not work in this situation, because
				# a new model is created when using create. Thus, we have to save the model first and then add
				# the model to the collection. We cannot use the jqXHR.done method, because it is called when the 
				# data is posted and we have to wait untill we have gotten the full object (by GET) from the server, 
				# see @model.sync for more info.
				@model.urlRoot = => config.baseUrl + "projects/#{@collection.projectId}/entries/#{@collection.entryId}/transcriptions/#{@collection.transcriptionId}/annotations"
				@model.save [],
					success: => @collection.add @model
					error: (model, xhr, options) => console.error 'Saving annotation failed!', model, xhr, options
					
			else
				@model.save()

		# ### Methods
		setModel: (annotation) ->
			@model = annotation
			@addListeners()

		addListeners: ->
			@listenTo @model, 'sync', (model, resp, options) => @el.querySelector('button.ok').disabled = true
			@listenTo @model, 'change:body', => @el.querySelector('button.ok').disabled = false
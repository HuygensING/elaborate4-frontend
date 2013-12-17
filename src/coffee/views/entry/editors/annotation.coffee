# Description...
define (require) ->

	viewManager = require 'hilib/managers/view'

	Collections = 
		projects: require 'collections/projects'

	Views = 
		Base: require 'views/base'
		SuperTinyEditor: require 'hilib/views/supertinyeditor/supertinyeditor'
		Modal: require 'hilib/views/modal/main'
		Form: require 'hilib/views/form/main'

	# Templates =
	# 	Metadata: require 'text!html/entry/annotation.metadata.html'
	tpls = require 'tpls'

	# ## AnnotationEditor
	class AnnotationEditor extends Views.Base

		className: ''

		# ### Initialize
		initialize: ->
			super

			Collections.projects.getCurrent (@project) => @render()

		# ### Render
		render: ->
			@editor = viewManager.show @el, Views.SuperTinyEditor,
				cssFile:		'/css/main.css'
				controls:		['b_save', 'b_cancel', 'b_metadata', 'n', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'diacritics', '|', 'undo', 'redo']
				height:			@options.height
				html: 			@model.get 'body'
				htmlAttribute:	'body'
				model: 			@model
				width: 			@options.width
				wrap: 			true

			@listenTo @editor, 'button:save', @save
			@listenTo @editor, 'button:cancel', => @trigger 'cancel'
			@listenTo @editor, 'button:metadata', @editMetadata

			@show()

			@

		# ### Events
		events: ->

		# ### Methods
		show: (annotation) ->
			@hide() if @visible()

			if annotation?
				@model = annotation 
				@editor.setModel @model

			@editor.$('.ste-header:nth-child(2)').addClass('annotationtext').html @model.get 'annotatedText'

			@setURLPath @model.id

			@el.style.display = 'block'

		hide: -> 
			@el.style.display = 'none'
			@trigger 'hide', @model.get 'annotationNo'

		visible: -> @el.style.display is 'block'

		setURLPath: (id) ->
			# Cut off '/annotations/*' if it exists.
			index = Backbone.history.fragment.indexOf '/annotations/'
			fragment = if index isnt -1 then Backbone.history.fragment.substr 0, index else Backbone.history.fragment 


			# If id exists add it to the fragment if not, we are dealing with a new annotation.
			fragment = fragment + '/annotations/' + id if id?

			# Navigate to the new fragement.
			Backbone.history.navigate fragment, replace: true

		save: (done=->) ->
			if @model.isNew()
				@model.save [],
					success: (model) =>
						@publish 'message', "Annotation #{@model.get('annotationNo')} saved."
						@trigger 'newannotation:saved', model
						done()
					error: (model, xhr, options) => console.error 'Saving annotation failed!', model, xhr, options
			else
				@model.save [],
					success: (model) =>
						@publish 'message', "Annotation #{@model.get('annotationNo')} saved."
						done()

		editMetadata: ->
			annotationMetadata = new Views.Form
				tpl: tpls['entry/annotation.metadata']
				model: @model.clone()
				collection: @project.get('annotationtypes')

			annotationMetadata.model.on 'change:metadata:type', (annotationTypeID) =>
				annotationMetadata.model.set 'metadata', {}
				annotationMetadata.model.set 'annotationType', @project.get('annotationtypes').get(annotationTypeID).attributes
				# console.log annotationMetadata.model
			# 	# console.log @project.get('annotationtypes').get(annotationTypeID)
				annotationMetadata.render()

			modal = new Views.Modal
				title: "Edit annotation metadata"
				html: annotationMetadata.el
				submitValue: 'Save metadata'
				width: '300px'
			modal.on 'submit', =>
				# metadata = annotationMetadata.model.get 'metadata'

				# console.log metadata
				@model.updateFromClone annotationMetadata.model

				@save =>
					@publish 'message', "Saved metadata for annotation: #{@model.get('annotationNo')}."
					modal.close()

				# jqXHR = @model.save()
				# jqXHR.done =>
				# 	console.log @model




				# @model.get('settings').save()

				# jqXHR = @model.save()
				# jqXHR.done => modal.messageAndFade 'success', 'Metadata saved!'

			# @annotationMetadata = new Views.AnnotationMetadata
			# 	model: model
			# 	collection: @project.get 'annotationtypes'
			# 	el: @el.querySelector('.container .middle .annotationmetadata')
	
# Description...
define (require) ->

	Collections = 
		projects: require 'collections/projects'

	Views = 
		Base: require 'views/base'
		SuperTinyEditor: require 'hilib/views/supertinyeditor/supertinyeditor'
		Modal: require 'hilib/views/modal/main'
		Form: require 'hilib/views/form/main'

	Templates =
		Metadata: require 'text!html/entry/annotation.metadata.html'

	# ## AnnotationEditor
	class AnnotationEditor extends Views.Base

		className: ''

		# ### Initialize
		initialize: ->
			super

			Collections.projects.getCurrent (@project) => @render()

		# ### Render
		render: ->
			@editor = new Views.SuperTinyEditor
				cssFile:		'/css/main.css'
				controls:		['b_save', 'b_cancel', 'b_metadata', 'n', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'undo', 'redo']
				el:				@$('.annotation-editor')
				height:			@options.height
				html: 			@model.get 'body'
				htmlAttribute:	'body'
				model: 			@model
				width: 			@options.width
				wrap: 			true

			@listenTo @editor, 'save', @save
			@listenTo @editor, 'cancel', => @trigger 'cancel'
			@listenTo @editor, 'metadata', @editMetadata

			@show()

			@

		# ### Events
		events: ->

		# ### Methods
		show: (annotation) ->
			@model = annotation if annotation?

			@editor.setModel @model

			@editor.$('.ste-header:nth-child(2)').addClass('annotationtext').html @model.get 'annotatedText'

			@setURLPath @model.id

			@el.style.display = 'block'

		hide: -> @el.style.display = 'none'

		setURLPath: (id) ->
			# Cut off '/annotations/*' if it exists.
			index = Backbone.history.fragment.indexOf '/annotations/'
			fragment = if index isnt -1 then Backbone.history.fragment.substr 0, index else Backbone.history.fragment 


			# If id exists add it to the fragment if not, we are dealing with a new annotation.
			fragment = fragment + '/annotations/' + id if id?

			# Navigate to the new fragement.
			Backbone.history.navigate fragment, replace: true

		save: ->
			if @model.isNew()
				@model.save [],
					success: (model) => @trigger 'newannotation:saved', model
					error: (model, xhr, options) => console.error 'Saving annotation failed!', model, xhr, options
			else
				@model.save()

		editMetadata: ->
			annotationMetadata = new Views.Form
				tpl: Templates.Metadata
				model: @model.clone()
				collection: @project.get('annotationtypes')

			modal = new Views.Modal
				title: "Edit annotation metadata"
				$html: annotationMetadata.$el
				submitValue: 'Save metadata'
				width: '300px'
			modal.on 'submit', =>
				metadata = annotationMetadata.model.get 'metadata'

				if metadata.type?
					@model.set 'annotationType', @project.get('annotationtypes').get(metadata.type)
					delete metadata.type

				jqXHR = @model.save()
				jqXHR.done => modal.messageAndFade 'success', 'Metadata saved!'



				# @model.updateFromClone entryMetadata.model

				# @model.get('settings').save()

				# jqXHR = @model.save()
				# jqXHR.done => modal.messageAndFade 'success', 'Metadata saved!'

			# @annotationMetadata = new Views.AnnotationMetadata
			# 	model: model
			# 	collection: @project.get 'annotationtypes'
			# 	el: @el.querySelector('.container .middle .annotationmetadata')
	
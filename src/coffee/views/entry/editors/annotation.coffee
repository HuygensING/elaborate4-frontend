Backbone = require 'backbone'

viewManager = require 'hilib/src/managers/view2'

Collections = 
	projects: require '../../../collections/projects'

Views = 
	Base: require 'hilib/src/views/base'
	SuperTinyEditor: require 'hilib/src/views/supertinyeditor/supertinyeditor'
	Modal: require 'hilib/src/views/modal'
	Form: require 'hilib/src/views/form/main'

# Templates =
# 	Metadata: require 'text!html/entry/annotation.metadata.html'
tpl = require '../../../../jade/entry/annotation.metadata.jade'

# ## AnnotationEditor
class AnnotationEditor extends Views.Base

	className: ''

	# ### Initialize
	initialize: ->
		super

		Collections.projects.getCurrent (@project) => @render()

	# ### Render
	render: ->
		@subviews.editor = new Views.SuperTinyEditor
			cssFile:		'/css/main.css'
			controls:		['b_save', 'b_cancel', 'b_metadata', 'n', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'diacritics', '|', 'undo', 'redo']
			height:			@options.height
			html: 			@model.get 'body'
			htmlAttribute:	'body'
			model: 			@model
			width: 			@options.width
			wrap: 			true
		@$el.html @subviews.editor.el

		@listenTo @subviews.editor, 'button:save', @save
		@listenTo @subviews.editor, 'button:cancel', => @trigger 'cancel'
		@listenTo @subviews.editor, 'button:metadata', @editMetadata

		@show()

		@

	# ### Events
	events: ->

	# ### Methods
	show: (annotation) ->
		@hide() if @visible()

		if annotation?
			@model = annotation 
			@subviews.editor.setModel @model

		@subviews.editor.$('.ste-header:nth-child(2)').addClass('annotationtext').html @model.get 'annotatedText'

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
					@setURLPath model.id
					@publish 'message', "Annotation #{@model.get('annotationNo')} saved."
					@trigger 'newannotation:saved', model
					done()
				error: (model, xhr, options) => console.error 'Saving annotation failed!', model, xhr, options
		else
			@model.save [],
				success: (model) =>
					@setURLPath model.id
					@publish 'message', "Annotation #{@model.get('annotationNo')} saved."
					done()

	editMetadata: ->
		@subviews.annotationMetadata.destroy() if @subviews.annotationMetadata?
		@subviews.annotationMetadata = new Views.Form
			tpl: tpl
			model: @model.clone()
			collection: @project.get('annotationtypes')

		@subviews.annotationMetadata.model.on 'change:metadata:type', (annotationTypeID) =>
			@subviews.annotationMetadata.model.set 'metadata', {}
			@subviews.annotationMetadata.model.set 'annotationType', @project.get('annotationtypes').get(annotationTypeID).attributes
			@subviews.annotationMetadata.render()

		@subviews.modal.destroy() if @subviews.modal?
		@subviews.modal = new Views.Modal
			title: "Edit annotation metadata"
			html: @subviews.annotationMetadata.el
			submitValue: 'Save metadata'
			width: '300px'
		@subviews.modal.on 'submit', =>
			@model.updateFromClone @subviews.annotationMetadata.model

			@save =>
				@publish 'message', "Saved metadata for annotation: #{@model.get('annotationNo')}."
				@subviews.modal.close()

module.exports = AnnotationEditor
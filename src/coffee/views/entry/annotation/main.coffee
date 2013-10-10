# Description...
define (require) ->

	Views = 
		Base: require 'views/base'
		SuperTinyEditor: require 'hilib/views/supertinyeditor/supertinyeditor'

	# ## AnnotationEditor
	class AnnotationEditor extends Views.Base

		className: ''

		# ### Initialize
		initialize: ->
			super

			@render()

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
			console.log 
			# Cut off '/annotations/*' if it exists.
			index = Backbone.history.fragment.indexOf '/annotations/'
			fragment = if index isnt -1 then Backbone.history.fragment.substr 0, index else Backbone.history.fragment 


			# If id exists add it to the fragment if not, we are dealing with a new annotation.
			fragment = fragment + '/annotations/' + id if id?

			# Navigate to the new fragement.
			Backbone.history.navigate fragment, replace: true

		save: ->
			if @model.isNew()
				# TODO
				# TODO
				# TODO
				# MOVE URLROOT SETTING TO MODEL AND/OR PREVIEW
				# REMEMBER IT ALSO HAS TO WORK ON PAGE LOAD
				# TODO
				# TODO
				# TODO

				annotations = @currentTranscription.get('annotations')
				# We set the urlRoot (instead of the url), because the model is used outside of a collection.
				# If we want to listenTo 'sync' then @collection.create does not work in this situation, because
				# a new model is created when using create. Thus, we have to save the model first and then add
				# the model to the collection. We cannot use the jqXHR.done method, because it is called when the 
				# data is posted and we have to wait untill we have gotten the full object (by GET) from the server, 
				# see @model.sync for more info.
				@model.urlRoot = => config.baseUrl + "projects/#{annotations.projectId}/entries/#{annotations.entryId}/transcriptions/#{annotations.transcriptionId}/annotations"
				@model.save [],
					success: => 
						annotations.add model
					error: (model, xhr, options) => console.error 'Saving annotation failed!', model, xhr, options
			else
				@model.save()

		editMetadata: ->
			@annotationMetadata = new Views.AnnotationMetadata
				model: model
				collection: @project.get 'annotationtypes'
				el: @el.querySelector('.container .middle .annotationmetadata')
			# @toggleEditPane 'annotationmetadata'
	
# move to @annotationEditor.show
# @navigateToAnnotation model.id

# if @annotationEdit? and model?
# 	@annotationEdit.setModel model 
# else
# 	console.error 'No annotation given as argument!' unless model?
	
# 	$el = @$('.annotation-placeholder')

	

# # * TODO: Clean up listeners! Put annotation editor in seperate view!
# @stopListening @annotationEdit



# # Set annotated text to supertinyeditor header based on html between start (<span>) and end (<sup>) tags in @preview
# annotationNo = model.get('annotationNo') ? 'newannotation'
# annotatedText = @preview.getAnnotatedText annotationNo
# @annotationEdit.$('.ste-header:nth-child(2)').addClass('annotationtext').html annotatedText

# @toggleEditPane 'annotation'
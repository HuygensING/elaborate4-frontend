define (require) ->

	Fn = require 'helpers/general'
	require 'helpers/jquery.mixin'
	Async = require 'managers/async'
	# console.log require 'supertinyeditor'
	# SuperTinyEditor = require 'supertinyeditor'

	Models =
		state: require 'models/state'
		Entry: require 'models/entry'

	Views = 
		Base: require 'views/base'
		SubMenu: require 'views/ui/entry.submenu'
		# AddAnnotationTooltip: require 'views/entry/tooltip.add.annotation'
		Preview: require 'views/entry/preview'
		SuperTinyEditor: require 'views2/supertinyeditor/supertinyeditor'
		AnnotationMetadata: require 'views/entry/metadata.annotation'

	Templates =
		Entry: require 'text!html/entry/main.html'

	# ## Entry
	class Entry extends Views.Base

		className: 'entry'

		# ### Initialize
		initialize: ->
			super

			# Models.state.onHeaderRendered => @render() # TODO Remove this check!
			async = new Async ['transcriptions', 'facsimiles', 'settings', 'annotationtypes']
			@listenToOnce async, 'ready', => @render()

			Models.state.getCurrentProject (project) => 
				@project = project # TMP

				project.get('entries').fetch
					success: (collection, response, options) =>
						# setCurrent returns the current model/entry
						@model = collection.setCurrent @options.entryId
						
						@model.get('transcriptions').fetch success: (collection, response, options) => 
							@currentTranscription = collection.setCurrent()
							async.called 'transcriptions'

						@model.get('facsimiles').fetch success: (collection, response, options) =>
							@currentFacsimile = collection.setCurrent()
							async.called 'facsimiles'

						@model.get('settings').fetch success: -> async.called 'settings'

				project.get('annotationtypes').fetch
					success: => async.called 'annotationtypes'

		# ### Render
		render: ->
			rtpl = _.template Templates.Entry, @model.attributes
			@$el.html rtpl

			@renderFacsimile()
			@renderTranscription()

			@listenTo @preview, 'addAnnotation', @renderAnnotation
			@listenTo @preview, 'editAnnotation', @renderAnnotation
			# transcriptionEdit cannot use the general Fn.setScrollPercentage function, so it implements it's own.
			@listenTo @preview, 'scrolled', (percentage) => @transcriptionEdit.setScrollPercentage percentage, 'horizontal'
			@listenTo @preview, 'newAnnotationRemoved', @renderTranscription
			@listenTo @transcriptionEdit, 'scrolled', (percentage) => Fn.setScrollPercentage @preview.el, percentage, 'horizontal'
			@listenTo @transcriptionEdit, 'change', (cmd, doc) => @currentTranscription.set 'body', doc

			@listenTo @model.get('facsimiles'), 'current:change', (current) =>
				@currentFacsimile = current
				@renderFacsimile()
			@listenTo @model.get('transcriptions'), 'current:change', (current) =>			
				@currentTranscription = current
				@renderTranscription current

		renderFacsimile: ->
			if @model.get('facsimiles').length
				url = @model.get('facsimiles').current.get('zoomableUrl')
				@$('.left iframe').attr 'src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.0/viewer.html?rft_id='+ url

		# * TODO: Create separate View?
		# * TODO: Resize iframe width on window.resize
		# * TODO: How many times is renderTranscription called on init?
		renderTranscription: (model) ->
			@renderPreview()
			
			if @transcriptionEdit?
				@transcriptionEdit.setModel model if model?
			else
				textLayer = @model.get('transcriptions').current.get 'textLayer'

				# Replace default text "Layer" with the name of the layer, for example: "Diplomatic layer".
				# First used a span as placeholder, but in combination with the arrowdown class, things went haywire.
				textLayerNode = document.createTextNode textLayer+ ' layer'
				li = @el.querySelector '.submenu li[data-key="layer"]'
				li.replaceChild textLayerNode, li.firstChild

				currentTranscription = @model.get('transcriptions').current
				text =  currentTranscription.get('body')

				el = @$('.container .middle .transcription')
				@transcriptionEdit = new Views.SuperTinyEditor
					model: @model.get('transcriptions').current
					htmlAttribute: 'body'
					el: el
					controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'n' ,'outdent' ,'indent', '|', 'unformat', '|', 'undo', 'redo'],
					cssFile:'/css/main.css'
					html: text
					height: @preview.$el.innerHeight()
					width: el.width() - 20
			
			@toggleEditPane 'transcription'


		renderAnnotation: (model) ->
			if @annotationEdit?
				@annotationEdit.setModel model if model?
			else
				console.error 'No annotation given as argument!' unless model?
				
				@annotationEdit = new Views.SuperTinyEditor
					model: model
					htmlAttribute: 'body'
					el: @el.querySelector('.container .middle .annotation')
					controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'n' ,'outdent' ,'indent', '|', 'unformat', '|', 'undo', 'redo'],
					cssFile: '/css/main.css'
					html: model.get 'body'
					wrap: true
				
			@toggleEditPane 'annotation'
				
		renderPreview: ->
			@preview = new Views.Preview
				model: @model
				el: @$('.container .right')
			
		# ### Events
		events: ->
			'click .menu li[data-key="previous"]': 'previousEntry'
			'click .menu li[data-key="next"]': 'nextEntry'
			'click .menu li[data-key="facsimile"]': 'changeFacsimile'
			'click .menu li[data-key="transcription"]': 'changeTranscription'
			'click .menu li[data-key="save"]': 'save'
			'click .menu li[data-key="metadata"]': 'metadata'

		previousEntry: ->
			@model.collection.previous()

		nextEntry: ->
			@model.collection.next()

		changeFacsimile: (ev) ->
			facsimileID = ev.currentTarget.getAttribute 'data-value'

			model = @model.get('facsimiles').get facsimileID
			@model.get('facsimiles').setCurrent model if model?

		changeTranscription: (ev) ->
			transcriptionID = ev.currentTarget.getAttribute 'data-value'

			model = @model.get('transcriptions').get transcriptionID
			@model.get('transcriptions').setCurrent model

		save: (ev) ->
			if @annotationEdit? and @annotationEdit.$el.is(':visible')
				annotations = @model.get('transcriptions').current.get('annotations')	

				# Create on a collection will save the model and add it to the collection.
				# Pass wait:true to wait for the server response, because we need the ID from the server
				annotations.create @annotationEdit.model.attributes, 
					wait: true
					success: => @renderTranscription()

		metadata: (ev) ->
			if @annotationEdit? and @annotationEdit.$el.is(':visible')
				@annotationMetadata = new Views.AnnotationMetadata
					model: @annotationEdit.model
					collection: @project.get 'annotationtypes'
					el: @el.querySelector('.container .middle .annotationmetadata')
				@toggleEditPane 'annotationmetadata'


		# menuItemClicked: (ev) ->
		# 	key = ev.currentTarget.getAttribute 'data-key'


		# ### Methods

		toggleEditPane: (viewName) ->
			view = switch viewName
				when 'transcription' then @transcriptionEdit
				when 'annotation' then @annotationEdit
				when 'annotationmetadata' then @annotationMetadata

			viewName = 'am' if viewName is 'annotationmetadata'

			@$('.submenu [data-key="save"]').html 'Save '+viewName
			view.$el.siblings().hide()
			view.$el.show()
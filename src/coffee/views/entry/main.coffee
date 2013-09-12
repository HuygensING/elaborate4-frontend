define (require) ->

	Fn = require 'helpers2/general'
	require 'helpers2/jquery.mixin'
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

	Templates =
		Entry: require 'text!html/entry/main.html'

	# ## Entry
	class Entry extends Views.Base

		className: 'entry'

		# ### Initialize
		initialize: ->
			super

			# Models.state.onHeaderRendered => @render() # TODO Remove this check!

			Models.state.getCurrentProject (project) => 
				@project = project # TMP
				project.get('entries').fetch
					success: (collection, response, options) =>
						@model = collection.get @options.entryId
						collection.setCurrentEntry @model

						async = new Async ['transcriptions', 'facsimiles', 'settings']

						@model.get('transcriptions').fetch success: (collection, response, options) -> 
							collection.setCurrent()
							async.called 'transcriptions'

						@model.get('facsimiles').fetch success: (collection, response, options) ->
							collection.setCurrentFacsimile()
							async.called 'facsimiles'

						@model.get('settings').fetch success: -> async.called 'settings'

						@listenToOnce async, 'ready', => @render()

		# ### Render
		render: ->
			rtpl = _.template Templates.Entry, @model.attributes
			@$el.html rtpl

			@renderFacsimile()
			@renderPreview()
			@renderTranscription()

			@listenTo @preview, 'addAnnotation', @renderAnnotation
			@listenTo @preview, 'editAnnotation', @renderAnnotation
			# transcriptionEdit cannot use the general Fn.setScrollPercentage function, so it implements it's own.
			@listenTo @preview, 'scrolled', (percentage) => @transcriptionEdit.setScrollPercentage percentage, 'horizontal'
			@listenTo @transcriptionEdit, 'scrolled', (percentage) => Fn.setScrollPercentage @preview.el, percentage, 'horizontal'
			@listenTo @transcriptionEdit, 'change', (cmd, doc) => currentTranscription.set 'body', doc

			@listenTo @model.get('facsimiles'), 'currentFacsimile:change', @renderFacsimile
			@listenTo @model.get('transcriptions'), 'current:change', => @renderTranscription()

		renderFacsimile: ->
			if @model.get('facsimiles').length
				url = @model.get('facsimiles').currentFacsimile.get('zoomableUrl')
				@$('.left iframe').attr 'src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.0/viewer.html?rft_id='+ url

		# * TODO: Create separate View?
		# * TODO: Resize iframe width on window.resize
		renderTranscription: ->

			showTranscriptionEdit = =>
				@transcriptionEdit.$el.siblings().hide()
				@transcriptionEdit.$el.show()

			if @transcriptionEdit?
				showTranscriptionEdit()
				console.log 'tran exists'
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
				showTranscriptionEdit()

		renderAnnotation: (model) ->
			console.error 'No model given!' unless model?

			showAnnotationEdit = =>
				@annotationEdit.$el.siblings().hide()
				@annotationEdit.$el.show()

			if @annotationEdit?
				showAnnotationEdit()
				@annotationEdit.setModel model
			else
				@annotationEdit = new Views.SuperTinyEditor
					model: model
					htmlAttribute: 'body'
					el: @el.querySelector('.container .middle .annotation')
					controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'n' ,'outdent' ,'indent', '|', 'unformat', '|', 'undo', 'redo'],
					cssFile: '/css/main.css'
					html: model.get 'body'
					wrap: true
				showAnnotationEdit()
				
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

		previousEntry: ->
			@model.collection.previous()

		nextEntry: ->
			@model.collection.next()

		changeFacsimile: (ev) ->
			facsimileID = ev.currentTarget.getAttribute 'data-value'

			model = @model.get('facsimiles').get facsimileID
			@model.get('facsimiles').setCurrentFacsimile model if model?

		changeTranscription: (ev) ->
			transcriptionID = ev.currentTarget.getAttribute 'data-value'

			model = @model.get('transcriptions').get transcriptionID
			@model.get('transcriptions').setCurrent model

		save: (ev) ->
			# console.log @annotationEdit.model.attributes
			@model.get('transcriptions').current.get('annotations').create @annotationEdit.model.attributes if @annotationEdit? and @annotationEdit.$el.is(':visible')


		# menuItemClicked: (ev) ->
		# 	key = ev.currentTarget.getAttribute 'data-key'


		# ### Methods
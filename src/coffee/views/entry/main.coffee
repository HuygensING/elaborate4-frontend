define (require) ->
	Backbone = require 'backbone'

	Fn = require 'helpers2/general'
	StringFn = require 'helpers2/string'
	require 'helpers/jquery.mixin'
	Async = require 'managers2/async'
	# console.log require 'supertinyeditor'
	# SuperTinyEditor = require 'supertinyeditor'

	Models =
		state: require 'models/state'
		Entry: require 'models/entry'

	Views = 
		Base: require 'views/base'
		SubMenu: require 'views/ui/entry.submenu'
		# AddAnnotationTooltip: require 'views/entry/tooltip.add.annotation'
		Preview: require 'views/entry/preview/main'
		SuperTinyEditor: require 'views2/supertinyeditor/supertinyeditor'
		AnnotationMetadata: require 'views/entry/annotation.metadata'
		EditTextlayers: require 'views/entry/subsubmenu/textlayers.edit'
		EditFacsimiles: require 'views/entry/subsubmenu/facsimiles.edit'
		TranscriptionEditMenu: require 'views/entry/transcription.edit.menu'
		AnnotationEditMenu: require 'views/entry/annotation.edit.menu'

	Templates =
		Entry: require 'text!html/entry/main.html'

	# ## Entry
	class Entry extends Views.Base

		className: 'entry'

		# ### Initialize
		initialize: ->
			super

			@subviews = {}

			# Models.state.onHeaderRendered => @render() # TODO Remove this check!
			async = new Async ['transcriptions', 'facsimiles', 'settings', 'annotationtypes', 'entrymetadatafields']
			@listenToOnce async, 'ready', => @render()
				

			Models.state.getCurrentProject (project) => 
				@project = project # TMP

				project.get('entries').fetch
					success: (collection, response, options) =>
						# setCurrent returns the current model/entry
						@model = collection.setCurrent @options.entryId
						
						@model.get('transcriptions').fetch success: (collection, response, options) =>

							# Find the model with the given textLayer
							model = collection.find (model) => model.get('textLayer').toLowerCase() is @options.transcriptionName.toLowerCase() if @options.transcriptionName?

							# Set the current transcription. If the model is undefined, the collection will return the first model.
							@currentTranscription = collection.setCurrent model

							async.called 'transcriptions'

						@model.get('facsimiles').fetch success: (collection, response, options) =>
							@currentFacsimile = collection.setCurrent()
							async.called 'facsimiles'

						@model.get('settings').fetch success: -> async.called 'settings'

				project.get('annotationtypes').fetch
					success: => async.called 'annotationtypes'

				project.fetchEntrymetadatafields => async.called 'entrymetadatafields'

				

		# ### Render
		render: ->
			rtpl = _.template Templates.Entry, @model.toJSON()
			@$el.html rtpl

			# Set the url to reflect the current transcription
			@navigateToTranscription() unless @options.transcriptionName?

			# Set the name of the transcription to the submenu
			@setTranscriptionNameToMenu()

			@renderFacsimile()
			
			@renderTranscription()

			@renderSubsubmenu()

			@addListeners()

			@currentTranscription.getAnnotations (annotations) =>
				@renderAnnotation annotations.get @options.annotationID if @options.annotationID?
					

		renderFacsimile: ->
			if @model.get('facsimiles').length
				url = @model.get('facsimiles').current.get 'zoomableUrl'
				@$('.left iframe').attr 'src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.0/viewer.html?rft_id='+ url

				# Set the height of EntryPreview to the clientHeight - menu & submenu (89px)
				@$('.left iframe').height document.documentElement.clientHeight - 89
			else
				@el.querySelector('li[data-key="facsimiles"]').style.display = 'none'

		# * TODO: Create separate View?
		# * TODO: How many times is renderTranscription called on init?
		renderTranscription: ->
			@renderPreview()
			
			if @transcriptionEdit?
				@transcriptionEdit.setModel @currentTranscription
				@transcriptionEditMenu.setModel @currentTranscription
			else
				$el = @$('.transcription-placeholder')
				@transcriptionEdit = new Views.SuperTinyEditor
					controls:		['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'n', 'unformat', '|', 'undo', 'redo']
					cssFile:		'/css/main.css'
					el:				$el.find('.transcription-editor')
					height:			@preview.$el.innerHeight()
					html:			@currentTranscription.get 'body'
					htmlAttribute:	'body'
					model:			@model.get('transcriptions').current
					width:			$el.width() - 20

				@transcriptionEditMenu = new Views.TranscriptionEditMenu
					model: @currentTranscription
				$el.append @transcriptionEditMenu.$el

			
			@toggleEditPane 'transcription'


		renderAnnotation: (model) ->
			@navigateToAnnotation model.id

			if @annotationEdit? and model?
				@annotationEdit.setModel model 
				@annotationEditMenu.setModel model
			else
				console.error 'No annotation given as argument!' unless model?
				
				$el = @$('.annotation-placeholder')
				@annotationEdit = new Views.SuperTinyEditor
					cssFile:		'/css/main.css'
					controls:		['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'n', 'unformat', '|', 'undo', 'redo']
					el:				$el.find('.annotation-editor')
					height:			@preview.$el.innerHeight()
					html: 			model.get 'body'
					htmlAttribute:	'body'
					model: 			model
					width: 			$el.width() - 10
					wrap: 			true

				@annotationEditMenu = new Views.AnnotationEditMenu
					model: model
					collection: @currentTranscription.get('annotations')
				@listenTo @annotationEditMenu, 'cancel', (model) => @preview.removeNewAnnotationTags()
				@listenTo @annotationEditMenu, 'metadata', (model) =>
					@annotationMetadata = new Views.AnnotationMetadata
						model: model
						collection: @project.get 'annotationtypes'
						el: @el.querySelector('.container .middle .annotationmetadata')
					@toggleEditPane 'annotationmetadata'
				$el.append @annotationEditMenu.$el
				
			@toggleEditPane 'annotation'
				
		renderPreview: ->
			if @preview?
				@preview.setModel @model
			else
				@preview = new Views.Preview
					model: @model
					el: @$('.container .right')

		renderSubsubmenu: ->
			@subviews.textlayersEdit = new Views.EditTextlayers
				collection: @model.get 'transcriptions'
				el: @$('.subsubmenu .edittextlayers')

			@subviews.facsimileEdit = new Views.EditFacsimiles
				collection: @model.get 'facsimiles'
				el: @$('.subsubmenu .editfacsimiles')
			
		# ### Events
		events: ->
			'click .menu li[data-key="previous"]': 'previousEntry'
			'click .menu li[data-key="next"]': 'nextEntry'
			'click .menu li[data-key="facsimile"]': 'changeFacsimile'
			'click .menu li[data-key="transcription"]': 'changeTranscription'
			'click .menu li[data-key="save"]': 'save'
			# 'click .menu li[data-key="metadata"]': 'metadata'
			'click .menu li.subsub': 'toggleSubsubmenu'

		# IIFE to toggle the subsubmenu. We use an iife so we don't have to add a public variable to the view.
		# The iife keeps track of the currentMenu. Precaution: @ refers to the window object in the iife!
		toggleSubsubmenu: do ->
			currentMenu = null

			(ev) ->
				# The newMenu's name is set as a data-key.
				newMenu = ev.currentTarget.getAttribute 'data-key'

				# If the user clicks on the currentMenu, close it.
				if currentMenu is newMenu
					$(ev.currentTarget).removeClass 'rotateup'
					$('.subsubmenu').removeClass 'active'
					currentMenu = null

				# Either the subsubmenu is not visible (currentMenu=null) or the user
				# clicked on another subsubmenu. In the last case we have to rotate the 
				# arrow down (removeClass 'rotateup') for the currentMenu.
				else
					# User clicked on another subsubmenu than currentMenu
					if currentMenu?
						$('.submenu li[data-key="'+currentMenu+'"]').removeClass 'rotateup'
					# Subsubmenu was closed, open it by adding 'active' class
					else
						$('.subsubmenu').addClass 'active'

					# Rotate the newMenu's arrow
					$('.submenu li[data-key="'+newMenu+'"]').addClass 'rotateup'

					# Show the newMenu and hide all others (siblings)
					$('.subsubmenu').find('.'+newMenu).show().siblings().hide()

					currentMenu = newMenu


		# edittextlayers: (ev) ->
		# 	subsubmenu = @$('.subsubmenu')
		# 	textlayers = subsubmenu.find('.textlayers')

		# 	@$('li[data-key="edittextlayers"]').toggleClass 'rotateup'
		# 	subsubmenu.addClass 'active' unless subsubmenu.hasClass 'active'
		# 	textlayers.show().siblings().hide()

		# editfacsimiles: (ev) ->
		# 	subsubmenu = @$('.subsubmenu')
		# 	facsimiles = subsubmenu.find('.facsimiles')

		# 	@$('li[data-key="editfacsimiles"]').toggleClass 'rotateup'
		# 	subsubmenu.addClass 'active' unless subsubmenu.hasClass 'active'
		# 	facsimiles.show().siblings().hide()

		previousEntry: ->
			# @model.collection.previous() returns an entry model
			@publish 'navigate:entry', @model.collection.previous().id


		nextEntry: ->
			@publish 'navigate:entry', @model.collection.next().id

		changeFacsimile: (ev) ->
			facsimileID = ev.currentTarget.getAttribute 'data-value'

			model = @model.get('facsimiles').get facsimileID
			@model.get('facsimiles').setCurrent model if model?

		changeTranscription: (ev) ->
			transcriptionID = ev.currentTarget.getAttribute 'data-value'
			newTranscription = @model.get('transcriptions').get transcriptionID

			# We don't want to navigateToTranscription if the model hasn't changed.
			# Transcriptions.setCurrent has a check for setting the same model, so this is redundant, but reads better,
			# otherwise we would have to navigateToTranscription and setCurrent after that.
			if newTranscription isnt @currentTranscription
				# Set @currentTranscription to newTranscription
				@model.get('transcriptions').setCurrent newTranscription

				@navigateToTranscription()
				@setTranscriptionNameToMenu()

			@toggleEditPane 'transcription'

		navigateToTranscription: ->
			# Cut of '/transcriptions/*' if it exists
			index = Backbone.history.fragment.indexOf '/transcriptions/'
			Backbone.history.fragment = Backbone.history.fragment.substr 0, index if index isnt -1

			# Navigate to the new fragement
			Backbone.history.navigate Backbone.history.fragment + '/transcriptions/' + StringFn.slugify(@currentTranscription.get('textLayer')), replace: true
		
		navigateToAnnotation: (id) ->
			# Cut of '/annotations/*' if it exists
			index = Backbone.history.fragment.indexOf '/annotations/'
			Backbone.history.fragment = Backbone.history.fragment.substr 0, index if index isnt -1

			# Navigate to the new fragement
			Backbone.history.navigate Backbone.history.fragment + '/annotations/' + id, replace: true

		setTranscriptionNameToMenu: ->
			# Replace default text "Layer" with the name of the layer, for example: "Diplomatic layer".
			# First used a span as placeholder, but in combination with the arrowdown class, things went haywire.
			textLayer = @currentTranscription.get 'textLayer'
			textLayerNode = document.createTextNode textLayer+ ' layer'
			li = @el.querySelector '.submenu li[data-key="layer"]'
			li.replaceChild textLayerNode, li.firstChild

		# save: (ev) ->
		# 	if @annotationEdit? and @annotationEdit.$el.is(':visible')
		# 		annotations = @model.get('transcriptions').current.get('annotations')	

		# 		# Create on a collection will save the model and add it to the collection.
		# 		# Pass wait:true to wait for the server response, because we need the ID from the server
		# 		annotations.create @annotationEdit.model.attributes, 
		# 			wait: true
		# 			success: => @renderTranscription()

		# metadata: (ev) ->
		# 	if @annotationEdit? and @annotationEdit.$el.is(':visible')
		# 		@annotationMetadata = new Views.AnnotationMetadata
		# 			model: @annotationEdit.model
		# 			collection: @project.get 'annotationtypes'
		# 			el: @el.querySelector('.container .middle .annotationmetadata')
		# 		@toggleEditPane 'annotationmetadata'


		# menuItemClicked: (ev) ->
		# 	key = ev.currentTarget.getAttribute 'data-key'


		# ### Methods

		toggleEditPane: (viewName) ->
			view = switch viewName
				when 'transcription' then @transcriptionEdit
				when 'annotation' then @annotationEdit
				when 'annotationmetadata' then @annotationMetadata
			view.$el.parent().siblings().hide()
			view.$el.parent().show()

		addListeners: ->
			@listenTo @preview, 'editAnnotation', @renderAnnotation
			@listenTo @preview, 'addAnnotation', @renderAnnotation
			@listenTo @preview, 'newAnnotationRemoved', @renderTranscription
			# transcriptionEdit cannot use the general Fn.setScrollPercentage function, so it implements it's own.
			@listenTo @preview, 'scrolled', (percentages) => @transcriptionEdit.setScrollPercentage percentages
			@listenTo @transcriptionEdit, 'scrolled', (percentages) => Fn.setScrollPercentage @preview.el, percentages
			# @listenTo @transcriptionEdit, 'change', (cmd, doc) => 
			# 	console.log 'achgne!'
			# 	@currentTranscription.set 'body', doc

			@listenTo @model.get('facsimiles'), 'current:change', (current) =>
				@currentFacsimile = current
				@renderFacsimile()
			@listenTo @model.get('facsimiles'), 'add', (facsimile) =>
				li = $("<li data-key='facsimile' data-value='#{facsimile.id}'>#{facsimile.get('name')}</li>")
				@$('.submenu .facsimiles').append li
			@listenTo @model.get('facsimiles'), 'remove', (facsimile) => @$('.submenu .facsimiles [data-value="'+facsimile.id+'"]').remove()

			@listenTo @model.get('transcriptions'), 'current:change', (current) =>			
				@currentTranscription = current
				# getAnnotations is async, but we can render the transcription anyway and make the assumption (yeah, i know)
				# the user is not fast enough to click an annotation
				@currentTranscription.getAnnotations()
				@renderTranscription()
			@listenTo @model.get('transcriptions'), 'add', (transcription) => 
				li = $("<li data-key='transcription' data-value='#{transcription.id}'>#{transcription.get('textLayer')} layer</li>")
				@$('.submenu .textlayers').append li
			@listenTo @model.get('transcriptions'), 'remove', (transcription) => @$('.submenu .textlayers [data-value="'+transcription.id+'"]').remove()


			window.addEventListener 'resize', (ev) => Fn.timeoutWithReset 600, =>
				@renderFacsimile()
				@preview.setHeight()
				@transcriptionEdit.setIframeHeight @preview.$el.innerHeight()
				@annotationEdit.setIframeHeight @preview.$el.innerHeight() if @annotationEdit?
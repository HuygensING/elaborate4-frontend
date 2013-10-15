define (require) ->
	Backbone = require 'backbone'

	config = require 'config'

	Fn = require 'hilib/functions/general'
	StringFn = require 'hilib/functions/string'
	require 'hilib/functions/jquery.mixin'
	Async = require 'hilib/managers/async'
	# console.log require 'supertinyeditor'
	# SuperTinyEditor = require 'supertinyeditor'

	Models =
		# state: require 'models/state'
		Entry: require 'models/entry'

	Collections =
		projects: require 'collections/projects'

	Views = 
		Base: require 'views/base'
		# SubMenu: require 'views/ui/entry.submenu'
		# AddAnnotationTooltip: require 'views/entry/tooltip.add.annotation'
		Preview: require 'views/entry/preview/main'
		# SuperTinyEditor: require 'hilib/views/supertinyeditor/supertinyeditor'
		# AnnotationMetadata: require 'views/entry/annotation.metadata'
		EntryMetadata: require 'views/entry/metadata'
		EditTextlayers: require 'views/entry/subsubmenu/textlayers.edit'
		EditFacsimiles: require 'views/entry/subsubmenu/facsimiles.edit'
		TranscriptionEditMenu: require 'views/entry/transcription.edit.menu'
		AnnotationEditMenu: require 'views/entry/annotation.edit.menu'
		Modal: require 'hilib/views/modal/main'
		Form: require 'hilib/views/form/main'
		AnnotationEditor: require 'views/entry/editors/annotation'
		LayerEditor: require 'views/entry/editors/layer'

	Templates =
		Entry: require 'text!html/entry/main.html'
		Metadata: require 'text!html/entry/metadata.html'

	# ## Entry
	class Entry extends Views.Base

		className: 'entry'

		# ### Initialize
		initialize: ->
			super

			@subviews = {}

			# Models.state.onHeaderRendered => @render() # TODO Remove this check!
			async = new Async ['transcriptions', 'facsimiles', 'settings', 'annotationtypes']
			@listenToOnce async, 'ready', => @render()
				

			Collections.projects.getCurrent (@project) => 
				@project.get('entries').fetch
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

				@project.get('annotationtypes').fetch
					success: => async.called 'annotationtypes'

				# @project.fetchEntrymetadatafields => async.called 'entrymetadatafields'

				

		# ### Render
		render: ->
			rtpl = _.template Templates.Entry, @model.toJSON()
			@$el.html rtpl

			@renderFacsimile()
			
			@renderTranscription()

			@renderSubsubmenu()

			@addListeners()

			# Get the annotations for the current transcription.
			# * TODO: Move to model?
			@currentTranscription.getAnnotations (annotations) =>
				# If an annotationID was passed as an option, this means the URI mentions the annotation + ID
				# and we have to show it.
				if @options.annotationID?
					annotation = annotations.get @options.annotationID
					@preview.setAnnotatedText annotation
					@renderAnnotation annotation
					

		renderFacsimile: ->
			# Only load the iframe with the current facsimile if there is a current facsimile
			if @model.get('facsimiles').current?
				url = @model.get('facsimiles').current.get 'zoomableUrl'
				@$('.left iframe').attr 'src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.0/viewer.html?rft_id='+ url

				# Set the height of EntryPreview to the clientHeight - menu & submenu (89px)
				@$('.left iframe').height document.documentElement.clientHeight - 89

		# * TODO: How many times is renderTranscription called on init?
		renderTranscription: ->
			# The preview is based on the transcription, so we have to render it each time the transcription is rendered
			@renderPreview()

			@setTranscriptionNameToMenu()

			unless @layerEditor
				@layerEditor = new Views.LayerEditor
					el: @el.querySelector('.transcription-placeholder')
					model: @currentTranscription
					height: @preview.$el.innerHeight()
					width: @preview.$el.width() - 4
			else
				@layerEditor.show @currentTranscription

			@annotationEditor.hide() if @annotationEditor?
				
		renderPreview: ->
			if @preview?
				@preview.setModel @model
			else
				@preview = new Views.Preview
					model: @model
					el: @$('.container .right')

		renderAnnotation: (model) ->
			unless @annotationEditor
				@annotationEditor = new Views.AnnotationEditor
					el: @el.querySelector('.annotation-placeholder')
					model: model
					height: @preview.$el.innerHeight() - 31
					width: @preview.$el.width() - 4
				@listenTo @annotationEditor, 'cancel', =>
					@preview.removeNewAnnotationTags()
					@renderTranscription()
				@listenTo @annotationEditor, 'newannotation:saved', (annotation) => @currentTranscription.get('annotations').add annotation
			else
				@annotationEditor.show model

			@layerEditor.hide()

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
			'click .menu li.subsub': 'toggleSubsubmenu'
			'click .menu li[data-key="metadata"]': 'editEntryMetadata'
			# 'click .menu li[data-key="save"]': 'save'

		closeSubsubmenu: -> @$('.subsubmenu').removeClass 'active'

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



		previousEntry: ->
			# @model.collection.previous() returns an entry model
			entryID = @model.collection.previous().id
			Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entryID}", trigger: true


		nextEntry: ->
			entryID = @model.collection.next().id
			Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entryID}", trigger: true

		changeFacsimile: (ev) ->
			facsimileID = ev.currentTarget.getAttribute 'data-value'

			model = @model.get('facsimiles').get facsimileID
			@model.get('facsimiles').setCurrent model if model?

		# TODO ev can be ID
		changeTranscription: (ev) ->
			transcriptionID = ev.currentTarget.getAttribute 'data-value'
			newTranscription = @model.get('transcriptions').get transcriptionID

			# If the newTranscription is truly new than set it to be the current transcription.
			if newTranscription isnt @currentTranscription 
				# Set @currentTranscription to newTranscription
				@model.get('transcriptions').setCurrent newTranscription
			# If newTranscription and @currentTranscription are the same than it is still possible the transcription editor
			# is not visible. If it is not visible, than we have to trigger the change manually, because setCurrent doesn't
			# trigger when the model hasn't changed.
			else if not @layerEditor.visible()
				@model.get('transcriptions').trigger 'current:change', @currentTranscription 

		editEntryMetadata: (ev) ->
			entryMetadata = new Views.Form
				tpl: Templates.Metadata
				model: @model.clone()

			modal = new Views.Modal
				title: "Edit entry metadata"
				$html: entryMetadata.$el
				submitValue: 'Save metadata'
				width: '300px'
			modal.on 'submit', =>
				@model.updateFromClone entryMetadata.model

				@model.get('settings').save()

				jqXHR = @model.save()
				jqXHR.done => 
					@publish 'message', "Saved metadata for entry: #{@model.get('name')}."
					modal.close()



		# ### Methods

		# Replace default text "Layer" with the name of the layer, for example: "Diplomatic layer".
		# First used a span as placeholder, but in combination with the arrowdown class, things went haywire.
		setTranscriptionNameToMenu: ->
			textLayer = @currentTranscription.get 'textLayer'
			textLayerNode = document.createTextNode textLayer+ ' layer'
			li = @el.querySelector '.submenu li[data-key="layer"]'
			li.replaceChild textLayerNode, li.firstChild


		addListeners: ->
			@listenTo @preview, 'editAnnotation', @renderAnnotation
			# @listenTo @preview, 'addAnnotation', @renderAnnotation
			@listenTo @preview, 'annotation:removed', @renderTranscription
			# transcriptionEdit cannot use the general Fn.setScrollPercentage function, so it implements it's own.
			@listenTo @preview, 'scrolled', (percentages) => @layerEditor.editor.setScrollPercentage percentages
			@listenTo @layerEditor.editor, 'scrolled', (percentages) => Fn.setScrollPercentage @preview.el, percentages
			# @listenTo @transcriptionEdit, 'change', (cmd, doc) => 
			# 	console.log 'achgne!'
			# 	@currentTranscription.set 'body', doc

			@listenTo @model.get('facsimiles'), 'current:change', (current) =>
				@currentFacsimile = current
				@renderFacsimile()
			@listenTo @model.get('facsimiles'), 'add', (facsimile) =>
				@closeSubsubmenu()
				li = $("<li data-key='facsimile' data-value='#{facsimile.id}'>#{facsimile.get('name')}</li>")
				@$('.submenu .facsimiles').append li
			@listenTo @model.get('facsimiles'), 'remove', (facsimile) => @$('.submenu .facsimiles [data-value="'+facsimile.id+'"]').remove()

			@listenTo @model.get('transcriptions'), 'current:change', (current) =>			
				@currentTranscription = current
				# getAnnotations is async, but we can render the transcription anyway and make the assumption (yeah, i know)
				# the user is not fast enough to click an annotation
				@currentTranscription.getAnnotations (annotations) => @renderTranscription()
			@listenTo @model.get('transcriptions'), 'add', (transcription) =>
				@closeSubsubmenu()
				li = $("<li data-key='transcription' data-value='#{transcription.id}'>#{transcription.get('textLayer')} layer</li>")
				@$('.submenu .textlayers').append li
			@listenTo @model.get('transcriptions'), 'remove', (transcription) => 
				@$('.submenu .textlayers [data-value="'+transcription.id+'"]').remove()
				@publish 'message', "Removed text layer #{transcription.get('textLayer')}."


			window.addEventListener 'resize', (ev) => Fn.timeoutWithReset 600, =>
				@renderFacsimile()
				@preview.setHeight()
						
				@layerEditor.editor.setIframeHeight @preview.$el.innerHeight()
				@layerEditor.editor.setIframeWidth @preview.$el.width() - 4
				
				if @annotationEditor?
					@annotationEditor.editor.setIframeHeight @preview.$el.innerHeight()
					@annotationEditor.editor.setIframeWidth @preview.$el.width() - 4



		# toggleEditPane: (viewName) ->
		# 	if viewName is 'transcription'
		# 		@transcriptionEdit.show()

		# 		if @annotationEditor?
		# 			@preview.removeNewAnnotationTags()
		# 			@annotationEditor.hide() 
		# 	else if viewName is 'annotation'
		# 		@annotationEditor.show()
		# 		@transcriptionEdit.hide()

			# view = switch viewName
			# 	when 'transcription' then @transcriptionEdit
			# 	when 'annotation' then @annotationEdit
			# 	# when 'annotationmetadata' then @annotationMetadata
			# @currentViewInEditPane = view
			# view.$el.parent().siblings().hide()
			# view.$el.parent().show()

		# navigateToTranscription: ->
		# 	# Cut off '/transcriptions/*' if it exists
		# 	index = Backbone.history.fragment.indexOf '/transcriptions/'
		# 	Backbone.history.fragment = Backbone.history.fragment.substr 0, index if index isnt -1

		# 	# Navigate to the new fragement
		# 	Backbone.history.navigate Backbone.history.fragment + '/transcriptions/' + StringFn.slugify(@currentTranscription.get('textLayer')), replace: true

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
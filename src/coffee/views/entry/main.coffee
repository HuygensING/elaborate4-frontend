define (require) ->
	Backbone = require 'backbone'

	config = require 'config'

	Fn = require 'hilib/functions/general'
	viewManager = require 'hilib/managers/view'

	StringFn = require 'hilib/functions/string'
	require 'hilib/functions/jquery.mixin'
	Async = require 'hilib/managers/async'

	Models =
		Entry: require 'models/entry'

	Collections =
		projects: require 'collections/projects'

	Views = 
		Base: require 'views/base'
		Preview: require 'views/entry/preview/main'
		EntryMetadata: require 'views/entry/metadata'
		EditFacsimiles: require 'views/entry/subsubmenu/facsimiles.edit'
		Modal: require 'hilib/views/modal/main'
		Form: require 'hilib/views/form/main'
		AnnotationEditor: require 'views/entry/editors/annotation'
		LayerEditor: require 'views/entry/editors/layer'

	tpls = require 'tpls'

	# ## Entry
	class Entry extends Views.Base

		className: 'entry'

		# ### Initialize
		initialize: ->
			super

			@subviews = {}

			# Models.state.onHeaderRendered => @render() # TODO Remove this check!
			async = new Async ['transcriptions', 'facsimiles', 'settings']
			@listenToOnce async, 'ready', => @render()

			Collections.projects.getCurrent (@project) =>
				@project.get('entries').fetch
					success: (collection, response, options) =>
						# setCurrent returns the current model/entry
						@entry = collection.setCurrent @options.entryId
						
						@entry.get('transcriptions').fetch success: (collection, response, options) =>

							# Find the model with the given textLayer
							model = collection.find (model) => model.get('textLayer').toLowerCase() is @options.transcriptionName.toLowerCase() if @options.transcriptionName?

							# Set the current transcription. If the model is undefined, the collection will return the first model.
							@currentTranscription = collection.setCurrent model

							async.called 'transcriptions'

						@entry.get('facsimiles').fetch success: (collection, response, options) =>
							@currentFacsimile = collection.setCurrent()
							async.called 'facsimiles'

						@entry.get('settings').fetch success: -> async.called 'settings'

		# ### Render
		render: ->
			# console.log tpls
			rtpl = tpls['entry/main'] @entry.toJSON()
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
			if @entry.get('facsimiles').current?
				url = @entry.get('facsimiles').current.get 'zoomableUrl'
				@$('.left-pane iframe').attr 'src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.1/viewer.html?rft_id='+ url

				# Set the height of EntryPreview to the clientHeight - menu & submenu (89px)
				@$('.left-pane iframe').height document.documentElement.clientHeight - 89

		# * TODO: How many times is renderTranscription called on init?
		renderTranscription: ->
			# The preview is based on the transcription, so we have to render it each time the transcription is rendered
			@renderPreview()

			@setTranscriptionNameToMenu()

			unless @layerEditor
				@layerEditor = viewManager.show @el.querySelector('.transcription-placeholder'), Views.LayerEditor,
					model: @currentTranscription
					height: @preview.$el.innerHeight()
					width: @preview.$el.width() - 4
			else
				@layerEditor.show @currentTranscription

			@annotationEditor.hide() if @annotationEditor?
				
		renderPreview: ->
			if @preview?
				@preview.setModel @entry
			else
				@preview = viewManager.show @el.querySelector('.container .preview-placeholder'), Views.Preview,
					model: @entry
					append: true

		renderAnnotation: (model) ->
			unless @annotationEditor
				@annotationEditor = viewManager.show @el.querySelector('.annotation-placeholder'), Views.AnnotationEditor,
					model: model
					height: @preview.$el.innerHeight() - 31
					width: @preview.$el.width() - 4
				@listenTo @annotationEditor, 'cancel', =>
					@preview.removeNewAnnotationTags()
					@renderTranscription()
				@listenTo @annotationEditor, 'newannotation:saved', (annotation) =>
					@currentTranscription.get('annotations').add annotation
					
			else
				@annotationEditor.show model

			@layerEditor.hide()

		renderSubsubmenu: ->
			# @subviews.textlayersEdit = viewManager.show @el.querySelector(), Views.EditTextlayers,
			# 	collection: @entry.get 'transcriptions'
			# 	el: @$('.subsubmenu .edittextlayers')

			@subviews.facsimileEdit = viewManager.show @el.querySelector('.subsubmenu .editfacsimiles'), Views.EditFacsimiles,
				collection: @entry.get 'facsimiles'
			
		# ### Events
		events: ->
			'click .menu li[data-key="previous"]': 'previousEntry'
			'click .menu li[data-key="next"]': 'nextEntry'
			'click .menu li[data-key="facsimile"]': 'changeFacsimile'
			'click .menu li[data-key="transcription"]': 'changeTranscription'
			'click .menu li.subsub': (ev) -> @subsubmenu.toggle ev
			'click .menu li[data-key="print"]': 'printEntry'
			'click .menu li[data-key="metadata"]': 'editEntryMetadata'
			# 'click .menu li[data-key="save"]': 'save'

		# When the user wants to print we create a div#printpreview directly under <body> and show
		# a clone of the preview body and an ordered list of the annotations.
		printEntry: (ev) ->
			pp = document.querySelector('#printpreview')
			pp.parentNode.removeChild pp if pp?

			annotations = @currentTranscription.get('annotations')

			mainDiv = document.createElement('div')
			mainDiv.id = 'printpreview'

			h2 = document.createElement('h2')
			h2.innerHTML = 'Preview'

			mainDiv.appendChild h2
			mainDiv.appendChild @el.querySelector('.preview').cloneNode true

			ol = document.createElement('ol')
			ol.className = 'annotations'
			
			sups = @el.querySelectorAll('sup[data-marker="end"]')
			_.each sups, (sup) =>
				annotation = annotations.findWhere annotationNo: +sup.getAttribute('data-id')
				
				li = document.createElement('li')
				li.innerHTML = annotation.get('body')
				
				ol.appendChild li

			h2 = document.createElement('h2')
			h2.innerHTML = 'Annotations'

			mainDiv.appendChild h2
			mainDiv.appendChild ol

			document.body.appendChild mainDiv

			window.print()

		# IIFE to toggle the subsubmenu. We use an iife so we don't have to add a public variable to the view.
		# The iife keeps track of the currentMenu. Precaution: @ refers to the window object in the iife!
		# OBSOLETE
		subsubmenu: do ->
			currentMenu = null

			close: -> 
				$('.subsubmenu').removeClass 'active'
				currentMenu = null
			toggle: (ev) ->
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
					$('.subsubmenu').find('.'+newMenu).appendCloseButton
						corner: 'bottomright'
						close: => @close()
					$('.subsubmenu').find('.'+newMenu).show().siblings().hide()

					currentMenu = newMenu

		previousEntry: ->
			# @entry.collection.previous() returns an entry model
			entryID = @entry.collection.previous().id
			textLayer = StringFn.slugify @currentTranscription.get 'textLayer'
			Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entryID}/transcriptions/#{textLayer}", trigger: true

		nextEntry: ->
			entryID = @entry.collection.next().id
			textLayer = StringFn.slugify @currentTranscription.get 'textLayer'
			Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entryID}/transcriptions/#{textLayer}", trigger: true

		changeFacsimile: (ev) ->
			# Check if ev is an Event, else assume ev is an ID
			facsimileID = if ev.hasOwnProperty 'target' then ev.currentTarget.getAttribute 'data-value' else ev

			$('.submenu .facsimiles li.active').removeClass('active')
			$('.submenu .facsimiles li[data-value="'+facsimileID+'"]').addClass('active')

			newFacsimile = @entry.get('facsimiles').get facsimileID
			@entry.get('facsimiles').setCurrent newFacsimile if newFacsimile?

		changeTranscription: (ev) ->
			# Check if ev is an Event, else assume ev is an ID
			transcriptionID = if ev.hasOwnProperty 'target' then ev.currentTarget.getAttribute 'data-value' else ev
			newTranscription = @entry.get('transcriptions').get transcriptionID

			# If the newTranscription is truly new than set it to be the current transcription.
			if newTranscription isnt @currentTranscription 
				# Set @currentTranscription to newTranscription
				@entry.get('transcriptions').setCurrent newTranscription
			# If newTranscription and @currentTranscription are the same than it is still possible the transcription editor
			# is not visible. If it is not visible, than we have to trigger the change manually, because setCurrent doesn't
			# trigger when the model hasn't changed.
			else if not @layerEditor.visible()
				# @layerEditor.show()
				@entry.get('transcriptions').trigger 'current:change', @currentTranscription 

		editEntryMetadata: (ev) ->
			entryMetadata = new Views.Form
				tpl: tpls['entry/metadata']
				model: @entry.clone()

			modal = new Views.Modal
				title: "Edit #{@project.get('settings').get('entry.term_singular')} metadata"
				$html: entryMetadata.$el
				submitValue: 'Save metadata'
				width: '300px'
			modal.on 'submit', =>
				@entry.updateFromClone entryMetadata.model

				@entry.get('settings').save()

				jqXHR = @entry.save()
				jqXHR.done => 
					@publish 'message', "Saved metadata for entry: #{@entry.get('name')}."
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
			@listenTo @preview, 'annotation:removed', @renderTranscription
			# layerEditor cannot use the general Fn.setScrollPercentage function, so it implements it's own.
			@listenTo @preview, 'scrolled', (percentages) => @layerEditor.editor.setScrollPercentage percentages
			@listenTo @layerEditor.editor, 'scrolled', (percentages) => @preview.setScroll percentages


			@listenTo @entry.get('facsimiles'), 'current:change', (current) =>
				@currentFacsimile = current
				@renderFacsimile()
			@listenTo @entry.get('facsimiles'), 'add', (facsimile, collection) =>
				# Update facsimile count in submenu
				@$('li[data-key="facsimiles"] span').html "(#{collection.length})"

				# Add the new facsimile to the menu
				li = $("<li data-key='facsimile' data-value='#{facsimile.id}'>#{facsimile.get('name')}</li>")
				@$('.submenu .facsimiles').append li

				# Change the facsimile to the newly added facsimile
				@changeFacsimile facsimile.id
				@subsubmenu.close()
				@publish 'message', "Added facsimile: \"#{facsimile.get('name')}\"."
			@listenTo @entry.get('facsimiles'), 'remove', (facsimile, collection) =>
				# Update facsimile count in submenu
				@$('li[data-key="facsimiles"] span').html "(#{collection.length})"

				# Remove the facsimile from the submenu
				@$('.submenu .facsimiles [data-value="'+facsimile.id+'"]').remove()

				@publish 'message', "Removed facsimile: \"#{facsimile.get('name')}\"."

			@listenTo @entry.get('transcriptions'), 'current:change', (current) =>			
				@currentTranscription = current
				# getAnnotations is async, but we can render the transcription anyway and make the assumption (yeah, i know)
				# the user is not fast enough to click an annotation
				@currentTranscription.getAnnotations (annotations) => @renderTranscription()
			@listenTo @entry.get('transcriptions'), 'add', (transcription) =>
				# Add the new text layer to the submenu
				li = $("<li data-key='transcription' data-value='#{transcription.id}'>#{transcription.get('textLayer')} layer</li>")
				@$('.submenu .textlayers').append li
				
				# Change the transcription to the newly added transcription
				@changeTranscription transcription.id
				@subsubmenu.close()
				@publish 'message', "Added text layer: \"#{transcription.get('textLayer')}\"."
			
			@listenTo @entry.get('transcriptions'), 'remove', (transcription) => 
				@$('.submenu .textlayers [data-value="'+transcription.id+'"]').remove()
				@publish 'message', "Removed text layer: \"#{transcription.get('textLayer')}\"."


			window.addEventListener 'resize', (ev) => Fn.timeoutWithReset 600, =>
				@renderFacsimile()
				@preview.resize()
						
				@layerEditor.editor.setIframeHeight @preview.$el.innerHeight()
				@layerEditor.editor.setIframeWidth @preview.$el.width() - 4
				
				if @annotationEditor?
					@annotationEditor.editor.setIframeHeight @preview.$el.innerHeight()
					@annotationEditor.editor.setIframeWidth @preview.$el.width() - 4
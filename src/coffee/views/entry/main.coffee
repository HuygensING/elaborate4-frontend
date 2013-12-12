define (require) ->
	Backbone = require 'backbone'

	config = require 'config'

	Fn = require 'hilib/functions/general'
	dom = require 'hilib/functions/DOM'
	viewManager = require 'hilib/managers/view'

	StringFn = require 'hilib/functions/string'
	require 'hilib/functions/jquery.mixin'
	Async = require 'hilib/managers/async'

	Models =
		Entry: require 'models/entry'
		currentUser: require 'models/currentUser'

	Collections =
		projects: require 'collections/projects'

	Views = 
		Base: require 'views/base'
		Submenu: require 'views/entry/submenu'
		Preview: require 'views/entry/preview/main'
		EntryMetadata: require 'views/entry/metadata'
		EditFacsimiles: require 'views/entry/subsubmenu/facsimiles.edit'
		Modal: require 'hilib/views/modal/main'
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
				@entry = new Models.Entry
					id: @options.entryId
					projectID: @project.id
				@project.get('entries').add @entry
				@entry.project = @project
				jqXHR = @entry.fetch
					success: (model, response, options) =>
						@entry.fetchTranscriptions @options.transcriptionName, (@currentTranscription) => async.called 'transcriptions'
						@entry.fetchFacsimiles (@currentFacsimile) => async.called 'facsimiles'
						@entry.fetchSettings => async.called 'settings'
				jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

		# ### Render
		render: ->
			rtpl = tpls['entry/main']
				entry: @entry
				user: Models.currentUser
			@$el.html rtpl

			# Render submenu
			@submenu = viewManager.show @el, Views.Submenu,
				entry: @entry
				user: Models.currentUser
				project: @project
				prepend: true

			# Render subsubmenu
			@subviews.facsimileEdit = viewManager.show @el.querySelector('.subsubmenu .editfacsimiles'), Views.EditFacsimiles,
				collection: @entry.get 'facsimiles'

			@renderFacsimile()
			
			@renderTranscriptionEditor()

			@addListeners()

			# Get the annotations for the current transcription.
			# * TODO: Move to model?
			@currentTranscription.getAnnotations (annotations) =>
				# If an annotationID was passed as an option, this means the URI mentions the annotation + ID
				# and we have to show it.
				if @options.annotationID?
					annotation = annotations.get @options.annotationID
					@preview.setAnnotatedText annotation
					@renderAnnotationEditor annotation
					

		renderFacsimile: ->
			@el.querySelector('.left-pane iframe').style.display = 'block'
			@el.querySelector('.left-pane .preview-placeholder').style.display = 'none'
			# $('.left-pane iframe').show()
			# $('.left-pane .transcription').hide()

			# Only load the iframe with the current facsimile if there is a current facsimile
			if @entry.get('facsimiles').current?
				url = @entry.get('facsimiles').current.get 'zoomableUrl'
				@$('.left-pane iframe').attr 'src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.1/viewer.html?rft_id='+ url

				# Set the height of EntryPreview to the clientHeight - menu & submenu (89px)
				@$('.left-pane iframe').height document.documentElement.clientHeight - 89
				
		renderPreview: ->
			if @preview?
				@preview.setModel @entry
			else
				# @preview = viewManager.show @el.querySelector('.container .preview-placeholder'), Views.Preview,
				# 	model: @entry
				# 	append: true
				@preview = new Views.Preview
					model: @entry
				@el.querySelector('.right-pane .preview-placeholder').appendChild @preview.el

		# * TODO: How many times is renderTranscriptionEditor called on init?
		renderTranscriptionEditor: ->
			# The preview is based on the transcription, so we have to render it each time the transcription is rendered
			@renderPreview()

			@submenu.render()

			unless @layerEditor
				@layerEditor = viewManager.show @el.querySelector('.transcription-placeholder'), Views.LayerEditor,
					model: @currentTranscription
					height: @preview.$el.innerHeight()
					width: @preview.$el.width() - 4
			else
				@layerEditor.show @currentTranscription

			@annotationEditor.hide() if @annotationEditor?

		renderAnnotationEditor: (model) ->
			showAnnotationEditor = =>
				unless @annotationEditor
					@annotationEditor = viewManager.show @el.querySelector('.annotation-placeholder'), Views.AnnotationEditor,
						model: model
						height: @preview.$el.innerHeight() - 31
						width: @preview.$el.width() - 4
					@listenTo @annotationEditor, 'cancel', =>
						@showUnsavedChangesModal
							model: @annotationEditor.model
							html: "<p>There are unsaved changes in annotation: #{@annotationEditor.model.get('annotationNo')}.<p>"
							done: =>
								@preview.removeNewAnnotationTags()
								@renderTranscriptionEditor()
					@listenTo @annotationEditor, 'newannotation:saved', (annotation) => @currentTranscription.get('annotations').add annotation
					@listenTo @annotationEditor, 'hide', (annotationNo) => @preview.unhighlightAnnotation annotationNo
				else
					@annotationEditor.show model

				@preview.highlightAnnotation model.get('annotationNo')

				@layerEditor.hide()
			
			@showUnsavedChangesModal
				model: @layerEditor.model
				html: "<p>There are unsaved changes in the #{@layerEditor.model.get('textLayer')} layer.</p>"
				done: showAnnotationEditor
			

		# ### Events
		events: ->
			'click .left-menu ul.facsimiles li[data-key="facsimile"]': 'changeFacsimile'
			'click .left-menu ul.textlayers li[data-key="transcription"]': 'showTranscription'
			'click .middle-menu ul.textlayers li[data-key="transcription"]': 'changeTranscription'
			'click .menu li.subsub': (ev) -> @subsubmenu.toggle ev

		showTranscription: do ->
			preview = null
			
			(ev) ->
				@el.querySelector('.left-pane iframe').style.display = 'none'
				@el.querySelector('.left-pane .preview-placeholder').style.display = 'block'

				transcriptionID = if ev.hasOwnProperty 'target' then ev.currentTarget.getAttribute 'data-value' else ev
				transcription = @entry.get('transcriptions').get transcriptionID

				preview.destroy() if preview?

				preview = new Views.Preview
					model: @entry
					textLayer: transcription

				@el.querySelector('.preview-placeholder').innerHTML = ''
				@el.querySelector('.preview-placeholder').appendChild preview.el

				$('.left-menu .facsimiles li.active').removeClass('active')
				$('.left-menu .textlayers li.active').removeClass('active')
				$('.left-menu .textlayers li[data-value="'+transcriptionID+'"]').addClass('active')


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

		changeFacsimile: (ev) ->
			# Check if ev is an Event, else assume ev is an ID
			facsimileID = if ev.hasOwnProperty 'target' then ev.currentTarget.getAttribute 'data-value' else ev

			$('.left-menu .facsimiles li.active').removeClass('active')
			$('.left-menu .textlayers li.active').removeClass('active')
			$('.left-menu .facsimiles li[data-value="'+facsimileID+'"]').addClass('active')

			newFacsimile = @entry.get('facsimiles').get facsimileID
			@entry.get('facsimiles').setCurrent newFacsimile if newFacsimile?
		
		showUnsavedChangesModal: (args) ->
			{model, html, done} = args

			if model.changedSinceLastSave?
				modal = new Views.Modal
					title: "Unsaved changes"
					html: html
					submitValue: 'Discard changes'
					width: '320px'
				modal.on 'submit', =>
					model.cancelChanges()
					modal.close()
					done()
			else
				done()

		changeTranscription: (ev) ->
			showTranscription = =>
				# Check if ev is an Event, else assume ev is an ID
				transcriptionID = if ev.hasOwnProperty 'target' then ev.currentTarget.getAttribute 'data-value' else ev
				newTranscription = @entry.get('transcriptions').get transcriptionID

				# If the newTranscription is truly new than set it to be the current transcription.
				if newTranscription isnt @currentTranscription 
					# Set @currentTranscription to newTranscription
					@entry.get('transcriptions').setCurrent newTranscription
				# If newTranscription and @currentTranscription are the same then it is possible the transcription editor
				# is not visible. If it is not visible, than we have to trigger the change manually, because setCurrent doesn't
				# trigger when the model hasn't changed.
				else if not @layerEditor.visible()
					# @layerEditor.show()
					@entry.get('transcriptions').trigger 'current:change', @currentTranscription

			if @annotationEditor? and @annotationEditor.visible()
				@showUnsavedChangesModal
					model: @annotationEditor.model
					html: "<p>There are unsaved changes in annotation: #{@annotationEditor.model.get('annotationNo')}.</p>"
					done: showTranscription
			else
				@showUnsavedChangesModal
					model: @layerEditor.model
					html: "<p>There are unsaved changes in the #{@layerEditor.model.get('textLayer')} layer.</p>"
					done: showTranscription

		# ### Methods

		destroy: ->
			@preview.destroy()

			@destroy()

		addListeners: ->
			@listenTo @preview, 'editAnnotation', @renderAnnotationEditor
			@listenTo @preview, 'annotation:removed', @renderTranscriptionEditor
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
				@currentTranscription.getAnnotations (annotations) => @renderTranscriptionEditor()
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
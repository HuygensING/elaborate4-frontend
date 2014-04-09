Backbone = require 'backbone'
$ = require 'jquery'

Fn = require 'hilib/src/utils/general'
dom = require 'hilib/src/utils/dom'
viewManager = require 'hilib/src/managers/view2'

StringFn = require 'hilib/src/utils/string'
require 'hilib/src/utils/jquery.mixin'
Async = require 'hilib/src/managers/async'

config = require 'elaborate-modules/modules/models/config'

Models =
	Entry: require '../../models/entry'
	currentUser: require '../../models/currentUser'

Collections =
	projects: require '../../collections/projects'

Views = 
	Base: require 'hilib/src/views/base'
	Submenu: require './main.submenu'
	Preview: require './preview/main'
	EditFacsimiles: require './subsubmenu/facsimiles.edit'
	Modal: require 'hilib/src/views/modal'
	AnnotationEditor: require './editors/annotation'
	LayerEditor: require './editors/layer'

tpl = require '../../../jade/entry/main.jade'

# ## Entry
class Entry extends Views.Base

	className: 'entry'

	# ### Initialize
	initialize: ->
		super

		# Models.state.onHeaderRendered => @render() # TODO Remove this check!
		async = new Async ['transcriptions', 'facsimiles', 'settings']
		@listenToOnce async, 'ready', => @render()


		Collections.projects.getCurrent (@project) =>
			@entry = @project.get('entries').get @options.entryId

			unless @entry?
				@entry = new Models.Entry
					id: @options.entryId
					projectID: @project.id
				@project.get('entries').add @entry
			
			@entry.project = @project

			jqXHR = @entry.fetch
				success: (model, response, options) =>
					@entry.fetchTranscriptions @options.transcriptionName, (@currentTranscription) => async.called 'transcriptions'
					@entry.fetchFacsimiles => async.called 'facsimiles'
					@entry.fetchSettings => async.called 'settings'
			jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

	# ### Render
	render: ->
		rtpl = tpl
			entry: @entry
			user: Models.currentUser
		@$el.html rtpl

		# Render submenu
		# @subviews.submenu = viewManager.show @el, Views.Submenu,
		# 	prepend: true

		@subviews.submenu = new Views.Submenu
			entry: @entry
			user: Models.currentUser
			project: @project
		@$el.prepend @subviews.submenu.el


		# Render subsubmenu
		# viewManager.show @el.querySelector('.subsubmenu .editfacsimiles'), Views.EditFacsimiles,
		# 	collection: @entry.get 'facsimiles'
		@subviews.subsubmenu = new Views.EditFacsimiles collection: @entry.get 'facsimiles'
		@$('.subsubmenu .editfacsimiles').html @subviews.subsubmenu.el

		if config.get('entry-left-preview')?
			transcription = @entry.get('transcriptions').findWhere 'textLayer': config.get('entry-left-preview')
			@showLeftTranscription transcription.id
		else
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
				@subviews.preview.setAnnotatedText annotation
				@renderAnnotationEditor annotation

	renderFacsimile: ->
		@el.querySelector('.left-pane iframe').style.display = 'block'
		@el.querySelector('.left-pane .preview-placeholder').style.display = 'none'

		# Reset the src of the iframe. This is needed to remove the current facsimile from the view
		# if it is deleted by the user and is the last facsimile in the collection.
		$iframe = @$('.left-pane iframe')
		$iframe.attr 'src', ''

		# Only load the iframe with the current facsimile if there is a current facsimile
		if @entry.get('facsimiles').current?
			url = @entry.get('facsimiles').current.get 'zoomableUrl'
			$iframe.attr 'src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.1/viewer.html?rft_id='+ url

			# Set the height of EntryPreview to the clientHeight - menu & submenu (89px)
			$iframe.height document.documentElement.clientHeight - 89
			
	renderPreview: ->
		if @subviews.preview?
			@subviews.preview.setModel @entry
		else
			# @subviews.preview = viewManager.show @el.querySelector('.container .preview-placeholder'), Views.Preview,
			# 	model: @entry
			# 	append: true
			@subviews.preview = new Views.Preview model: @entry
			@$('.right-pane .preview-placeholder').append @subviews.preview.el

	# * TODO: How many times is renderTranscriptionEditor called on init?
	renderTranscriptionEditor: ->
		# The preview is based on the transcription, so we have to render it each time the transcription is rendered
		@renderPreview()

		@subviews.submenu.render()

		unless @subviews.layerEditor
			@subviews.layerEditor = new Views.LayerEditor
				model: @currentTranscription
				height: @subviews.preview.$el.innerHeight()
				width: @subviews.preview.$el.outerWidth()
			@$('.transcription-placeholder').html @subviews.layerEditor.el
		else
			@subviews.layerEditor.show @currentTranscription

		@subviews.annotationEditor.hide() if @subviews.annotationEditor?

	renderAnnotationEditor: (model) ->
		showAnnotationEditor = =>
			unless @subviews.annotationEditor
				@subviews.annotationEditor = new Views.AnnotationEditor
					model: model
					height: @subviews.preview.$el.innerHeight() - 31
					width: @subviews.preview.$el.outerWidth()
				@$('.annotation-placeholder').html @subviews.annotationEditor.el
				@listenTo @subviews.annotationEditor, 'cancel', =>
					@showUnsavedChangesModal
						model: @subviews.annotationEditor.model
						html: "<p>There are unsaved changes in annotation: #{@subviews.annotationEditor.model.get('annotationNo')}.<p>"
						done: =>
							@subviews.preview.removeNewAnnotationTags()
							@renderTranscriptionEditor()
				@listenTo @subviews.annotationEditor, 'newannotation:saved', (annotation) =>
					@currentTranscription.get('annotations').add annotation
					@subviews.preview.highlightAnnotation annotation.get('annotationNo')

				@listenTo @subviews.annotationEditor, 'hide', (annotationNo) => @subviews.preview.unhighlightAnnotation annotationNo
			else
				@subviews.annotationEditor.show model

			@subviews.preview.highlightAnnotation model.get('annotationNo')

			@subviews.layerEditor.hide()
		
		@showUnsavedChangesModal
			model: @subviews.layerEditor.model
			html: "<p>There are unsaved changes in the #{@subviews.layerEditor.model.get('textLayer')} layer.</p>"
			done: showAnnotationEditor
		

	# ### Events
	events: ->
		'click li[data-key="layer"]': 'changeTranscription'
		# 'click .left-menu ul.facsimiles li[data-key="facsimile"]': 'changeFacsimile'
		'click .left-menu ul.textlayers li[data-key="transcription"]': 'showLeftTranscription'
		'click .middle-menu ul.textlayers li[data-key="transcription"]': 'changeTranscription'
		'click .menu li.subsub': (ev) -> @subsubmenu.toggle ev

	showLeftTranscription: (ev) ->
		# Hide the facsimile iframe.
		@$('.left-pane iframe').hide()
		# Show the preview placeholder.
		@$('.left-pane .preview-placeholder').show()

		# Get the selected transcription.
		transcriptionID = if ev.hasOwnProperty 'target' then ev.currentTarget.getAttribute 'data-value' else ev
		transcription = @entry.get('transcriptions').get transcriptionID

		# Set the name of the transcription to the config, so when the user navigates prev/next
		# the view can show the same layer in the left pane.
		config.set 'entry-left-preview', transcription.get('textLayer')

		# Init the leftPreview view. Destroy old one if it exists.
		@subviews.leftPreview.destroy() if @subviews.leftPreview?
		@subviews.leftPreview = new Views.Preview
			model: @entry
			textLayer: transcription
			wordwrap: true

		@$('.left-pane .preview-placeholder').html @subviews.leftPreview.el

		# Add/remove CSS classes.
		@$('.left-menu .facsimiles li.active').removeClass('active')
		@$('.left-menu .textlayers li.active').removeClass('active')
		@$('.left-menu .textlayers li[data-value="'+transcriptionID+'"]').addClass('active')

		# Unset the current facsimile, otherwise when switching from transcription to facsimile,
		# the facsimile will not be loaded, because the facsimiles collection thinks the current
		# facsimile is the same as the one requested and thus will not update.
		@entry.get('facsimiles').current = null


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
	
	showUnsavedChangesModal: (args) ->
		{model, html, done} = args

		if model.changedSinceLastSave?
			@subviews.modal.destroy() if @subviews.modal?
			@subviews.modal = new Views.Modal
				title: "Unsaved changes"
				html: html
				submitValue: 'Discard changes'
				width: '320px'
			@subviews.modal.on 'submit', =>
				model.cancelChanges()
				@subviews.modal.close()
				done()
		else
			done()

	changeTranscription: (ev) ->
		ev.stopPropagation()

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
			else if not @subviews.layerEditor.visible()
				# @subviews.layerEditor.show()
				@entry.get('transcriptions').trigger 'current:change', @currentTranscription

		if @subviews.annotationEditor? and @subviews.annotationEditor.visible()
			@showUnsavedChangesModal
				model: @subviews.annotationEditor.model
				html: "<p>There are unsaved changes in annotation: #{@subviews.annotationEditor.model.get('annotationNo')}.</p>"
				done: showTranscription
		else
			@showUnsavedChangesModal
				model: @subviews.layerEditor.model
				html: "<p>There are unsaved changes in the #{@subviews.layerEditor.model.get('textLayer')} layer.</p>"
				done: showTranscription

	# ### Methods

	# destroy: ->
	# 	@subviews.preview.destroy()

	# 	@destroy()

	addListeners: ->
		@listenTo @subviews.preview, 'editAnnotation', @renderAnnotationEditor
		@listenTo @subviews.preview, 'annotation:removed', @renderTranscriptionEditor
		# layerEditor cannot use the general Fn.setScrollPercentage function, so it implements it's own.
		@listenTo @subviews.preview, 'scrolled', (percentages) => @subviews.layerEditor.subviews.editor.setScrollPercentage percentages
		@listenTo @subviews.layerEditor.subviews.editor, 'scrolled', (percentages) => @subviews.preview.setScroll percentages
		@listenTo @subviews.layerEditor, 'wrap', (wrap) => @subviews.preview.toggleWrap wrap


		@listenTo @entry.get('facsimiles'), 'current:change', (current) => @renderFacsimile()

		@listenTo @entry.get('facsimiles'), 'add', @addFacsimile
		@listenTo @entry.get('facsimiles'), 'remove', @removeFacsimile

		@listenTo @entry.get('transcriptions'), 'current:change', (current) =>			
			@currentTranscription = current
			# getAnnotations is async, but we can render the transcription anyway and make the assumption (yeah, i know)
			# the user is not fast enough to click an annotation
			@currentTranscription.getAnnotations (annotations) => @renderTranscriptionEditor()

		@listenTo @entry.get('transcriptions'), 'add', @addTranscription
		@listenTo @entry.get('transcriptions'), 'remove', @removeTranscription
		
		window.addEventListener 'resize', (ev) => Fn.timeoutWithReset 600, =>
			@renderFacsimile()
			@subviews.preview.resize()
					
			@subviews.layerEditor.subviews.editor.setIframeHeight @subviews.preview.$el.innerHeight()
			@subviews.layerEditor.subviews.editor.setIframeWidth @subviews.preview.$el.outerWidth()
			
			if @subviews.annotationEditor?
				@subviews.annotationEditor.subviews.editor.setIframeHeight @subviews.preview.$el.innerHeight()
				@subviews.annotationEditor.subviews.editor.setIframeWidth @subviews.preview.$el.outerWidth()

	addFacsimile: (facsimile, collection) ->
		# Update facsimile count in submenu
		@$('li[data-key="facsimiles"] span').html "(#{collection.length})"

		# Add the new facsimile to the menu
		li = $("<li data-key='facsimile' data-value='#{facsimile.id}'>#{facsimile.get('name')}</li>")
		@$('.submenu .facsimiles').append li

		# Change the facsimile to the newly added facsimile
		@subviews.submenu.changeFacsimile facsimile.id
		@subsubmenu.close()
		@publish 'message', "Added facsimile: \"#{facsimile.get('name')}\"."

	removeFacsimile: (facsimile, collection) ->
		@entry.get('facsimiles').setCurrent() if @entry.get('facsimiles').current is facsimile
		
		# Update facsimile count in submenu
		@$('li[data-key="facsimiles"] span').html "(#{collection.length})"

		# Remove the facsimile from the submenu
		@$('.submenu .facsimiles [data-value="'+facsimile.id+'"]').remove()

		@publish 'message', "Removed facsimile: \"#{facsimile.get('name')}\"."

	removeTranscription: (transcription) ->
		@$('.submenu .textlayers [data-value="'+transcription.id+'"]').remove()
		@publish 'message', "Removed text layer: \"#{transcription.get('textLayer')}\"."

	addTranscription: (transcription) ->
		# Add the new text layer to the submenu
		li = $("<li data-key='transcription' data-value='#{transcription.id}'>#{transcription.get('textLayer')} layer</li>")
		@$('.submenu .textlayers').append li
		
		# Change the transcription to the newly added transcription
		@changeTranscription transcription.id
		@subsubmenu.close()
		@publish 'message', "Added text layer: \"#{transcription.get('textLayer')}\"."

module.exports = Entry
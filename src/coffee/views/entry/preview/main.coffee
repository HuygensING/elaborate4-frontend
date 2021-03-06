$ = require 'jquery'
_ = require 'underscore'
# @options
#	textLayer	String 		The text layer to show, defaults to current text layer.
#	wordwrap	Boolean		Defaults to false

Fn = require 'hilib/src/utils/general'
dom = require 'hilib/src/utils/dom'

config = require '../../../models/config'

Views =
	Base: require 'hilib/src/views/base'
	AddAnnotationTooltip: require './annotation.add.tooltip'
	EditAnnotationTooltip: require './annotation.edit.tooltip'

currentUser = require '../../../models/currentUser'

# Tpl = require 'text!html/entry/preview.html'
tpl = require '../../../../jade/entry/preview.jade'

# ## TranscriptionPreview
class EntryPreview extends Views.Base

	className: 'preview'

	# ### Initialize
	initialize: (@options) ->
		super

		@autoscroll = false

		@highlighter = Fn.highlighter()

		@interactive = if @options.textLayer? then false else true

		if @options.textLayer?
			@transcription = @options.textLayer
			@addListeners()
			@render()
		else
			@model.get('transcriptions').getCurrent (@transcription) =>
				@addListeners()
				@render()

		@options.wordwrap ?= false
		@toggleWrap() if @options.wordwrap

		@resize()


	# ### Render
	render: ->
		data = @transcription.toJSON()

		# Count all the <br>s in the body string. Match returns null if no breaks are found.
		lineCount = (data.body.match(/<br>/g) ? []).length
		# If the body string does not end with a <br> that means there is
		# some text after the last <br> and we have to add a linenumber.
		lineCount++ if data.body.substr(-4) isnt '<br>'
		data.lineCount = lineCount

		data.lineCount = 0 if data.body.trim() is ''

		data.body = data.body.replace new RegExp(term, "gi"), '<span class="highlight">$&</span>' for own term, count of @model.get 'terms'
		data.user = currentUser

		@el.innerHTML = tpl data

		@renderTooltips()

		@onHover()


		@

	renderTooltips: ->
		@subviews.editAnnotationTooltip.destroy() if @subviews.editAnnotationTooltip?
		@subviews.editAnnotationTooltip = new Views.EditAnnotationTooltip
			container: @el.querySelector('.body-container')
			interactive: @interactive

		if @interactive
			@listenTo @subviews.editAnnotationTooltip, 'edit', (model) => @trigger 'editAnnotation', model
			@listenTo @subviews.editAnnotationTooltip, 'delete', (model) =>
				if model.get('annotationNo') is 'newannotation'
					@removeNewAnnotation()
				else
					# Remove the annotation from the collection, the transcription model wil take care of the rest
					@transcription.get('annotations').remove model

				# Let the entry view know an annotation has been removed so it can remove the annotationEditor view and
				# show the current transcription.
				@trigger 'annotation:removed'

			@subviews.addAnnotationTooltip.destroy() if @subviews.addAnnotationTooltip?
			@subviews.addAnnotationTooltip = new Views.AddAnnotationTooltip
				container: @el.querySelector('.body-container')
				annotationTypes: @model.project.get('annotationtypes')

	# ### Events
	events: ->
		'click sup[data-marker="end"]': 'supClicked'
		'mousedown .body-container': 'onMousedown'
		'mouseup .body-container': 'onMouseup'
		'scroll': 'onScroll'
		'click .fa.fa-print': 'onPrint'

	# When the user wants to print we create a div#printpreview directly under <body> and show
	# a clone of the preview body and an ordered list of the annotations.
	onPrint: (ev) ->
		return if not @interactive

		addTranscription = (el) =>
			clonedPreview = el.cloneNode true
			clonedPreview.style.height = 'auto'
			mainDiv.appendChild clonedPreview

		addAnnotations = (annotations) =>
			if annotations? and annotations.length > 0
				ol = document.createElement('ol')
				ol.className = 'annotations'

				sups = document.querySelectorAll('sup[data-marker="end"]')
				_.each sups, (sup) =>
					annotation = annotations.findWhere annotationNo: +sup.getAttribute('data-id')

					li = document.createElement('li')
					li.innerHTML = annotation.get('body')

					ol.appendChild li

				h2 = document.createElement('h2')
				h2.innerHTML = 'Annotations'

				mainDiv.appendChild h2
				mainDiv.appendChild ol

		pp = document.querySelector('#printpreview')
		pp.parentNode.removeChild pp if pp?

		mainDiv = document.createElement('div')
		mainDiv.id = 'printpreview'

		h1 = document.createElement('h1')
		h1.innerHTML = 'Preview entry: ' + @model.get('name')

		h2 = document.createElement('h2')
		h2.innerHTML = 'Project: ' + @model.project.get('title')

		mainDiv.appendChild h1
		mainDiv.appendChild h2

		if config.get('entry-left-preview')?
			addTranscription document.querySelector('.left-pane .preview')
			transcription = @model.get('transcriptions').findWhere 'textLayer': config.get('entry-left-preview')
			addAnnotations transcription.get('annotations')

		addTranscription document.querySelector('.right-pane .preview')
		addAnnotations @model.get('transcriptions').current.get('annotations')

		document.body.appendChild mainDiv

		window.print()

	onScroll: (ev) ->
		return if not @interactive

		if @autoscroll = !@autoscroll
			Fn.timeoutWithReset 200, => @trigger 'scrolled', Fn.getScrollPercentage ev.currentTarget

	supClicked: (ev) ->
		return console.error 'No annotations found!' unless @transcription.get('annotations')?

		id = ev.currentTarget.getAttribute('data-id')
		annotation = if id is 'newannotation' then @newAnnotation else @transcription.get('annotations').findWhere annotationNo: id >> 0
		return console.error 'Annotation not found! ID:', id, ' Collection:', @transcription.get('annotations') unless annotation?

		@setAnnotatedText annotation

		@subviews.editAnnotationTooltip.show
			$el: $(ev.currentTarget)
			model: annotation

	onMousedown: (ev) ->
		return if not @interactive

		downOnAdd = ev.target is @subviews.addAnnotationTooltip.el or dom(@subviews.addAnnotationTooltip.el).hasDescendant(ev.target)
		downOnEdit = ev.target is @subviews.editAnnotationTooltip.el or dom(@subviews.editAnnotationTooltip.el).hasDescendant(ev.target)

		unless downOnEdit or downOnAdd
			# Hide all tooltips, we check what to show in onMouseup.
			@subviews.addAnnotationTooltip.hide()
			@subviews.editAnnotationTooltip.hide()

			# Stop listening to the add annotation tooltip, because the add annotation tooltip has a
			# listenToOnce on it and when the user clicks outside the tooltip, the listener is still there.
			# If we don't remove it, the new annotation will popup on all previous selected areas.
			@stopListening @subviews.addAnnotationTooltip


	onMouseup: (ev) ->
		return if not @interactive

		upOnAdd = ev.target is @subviews.addAnnotationTooltip.el or dom(@subviews.addAnnotationTooltip.el).hasDescendant(ev.target)
		upOnEdit = ev.target is @subviews.editAnnotationTooltip.el or dom(@subviews.editAnnotationTooltip.el).hasDescendant(ev.target)

		checkMouseup = =>
			sel = document.getSelection()

			# If there is no range to get (for example when using the scrollbar)
			# or
			# When the user clicked a sup
			if sel.rangeCount is 0 or ev.target.tagName is 'SUP' or ev.target.tagName is 'BUTTON'
				# Only hide the tooltip, don't stopListening, because the click to add an annotation also ends up here
				@subviews.addAnnotationTooltip.hide()
				return false

			range = sel.getRangeAt 0

			# Boolean to check if the selection start or ends on a <span data-marker="start"> or <sup data-marker="end">.
			# A selection cannot start inside a marker.
			isInsideMarker = range.startContainer.parentNode.hasAttribute('data-marker') or range.endContainer.parentNode.hasAttribute('data-marker')

			# if not range.collapsed and not startIsSup and not endIsSup
			unless range.collapsed or isInsideMarker or @$('[data-id="newannotation"]').length > 0
				if @transcription.changedSinceLastSave?
					@publish 'message', "Save the #{@transcription.get('textLayer')} layer, before adding a new annotation!"
				else
					# ListenToOnce, so when the tooltip is clicked, the listener is removed.
					# If the tooltip isn't clicked, the tooltip will be hidden en stopListening'd
					# in the onMousedown.
					@listenToOnce @subviews.addAnnotationTooltip, 'clicked', (model) =>
						@addNewAnnotation model, range
					# Show the add annotation tooltip.

					@subviews.addAnnotationTooltip.show
						left: ev.pageX
						top: ev.pageY

		# Move checkMouseup to the end of the event queue, because the we want to wait for the
		# browser to finish events like deselect.
		setTimeout checkMouseup, 0 unless upOnAdd or upOnEdit


	# ### Methods

	toggleWrap: (wrap) -> @$el.toggleClass 'wrap', wrap

	# destroy: ->
	# 	@subviews.addAnnotationTooltip.destroy() if @subviews.addAnnotationTooltip?
	# 	@subviews.editAnnotationTooltip.destroy()

	# 	@remove()

	setScroll: (percentages) ->
		@autoscroll = true
		# Use setTimeout to wait for other events to finish first
		setTimeout => Fn.setScrollPercentage @el, percentages

	highlightAnnotation: (annotationNo) ->
		range = document.createRange()

		range.setStartAfter @el.querySelector('span[data-id="'+annotationNo+'"]')
		range.setEndBefore @el.querySelector('sup[data-id="'+annotationNo+'"]')

		el = document.createElement 'span'
		el.className = 'hilite'
		el.setAttribute 'data-highlight', ''
		el.appendChild range.extractContents()

		range.insertNode el

	unhighlightAnnotation: ->
		el = @el.querySelector('span[data-highlight]')

		if el?
			# Move all children from el to a documentFragment
			docFrag = document.createDocumentFragment()
			docFrag.appendChild el.firstChild while el.childNodes.length

			# Replace el with the documentFragment
			el.parentNode.replaceChild docFrag, el

	unhighlightQuery: ->
		el = @el.querySelector('span.highlight')

		if el?
			# Move all children from el to a documentFragment
			docFrag = document.createDocumentFragment()
			docFrag.appendChild el.firstChild while el.childNodes.length

			# Replace el with the documentFragment
			el.parentNode.replaceChild docFrag, el

	# Set the text that is annotated to the annotation model. This is the text between the start (<span>) and end (<sup>) tag.
	# Text (numbers) from annotations (<sup>s) between de start and end tag are filtered out.
	setAnnotatedText: (annotation) ->
		annotationNo = annotation.get 'annotationNo'

		startNode = @el.querySelector 'span[data-id="'+annotationNo+'"]'
		endNode = @el.querySelector 'sup[data-id="'+annotationNo+'"]'

		# Create a range between start and end nodes.
		range = document.createRange()
		range.setStartAfter startNode
		range.setEndBefore endNode

		# Create a TreeWalker based on the cloned contents (documentFragment).
		treewalker = document.createTreeWalker range.cloneContents(), NodeFilter.SHOW_TEXT,
			acceptNode: (node) =>
				# Skip <sup>s. A sup must only contain a textNode, but in the unlikely case it will not,
				# for example: <sup data-id="46664"><i>12</i></sup>, "12" will be part of the returned text variable.
				if node.parentNode.nodeType is 1 and node.parentNode.tagName is 'SUP' and node.parentNode.hasAttribute('data-id')
					return NodeFilter.FILTER_SKIP
				else
					return NodeFilter.FILTER_ACCEPT

		# Walk the tree and extract the textContent from the nodes.
		text = ''
		text += treewalker.currentNode.textContent while treewalker.nextNode()

		annotation.set 'annotatedText', text

	addNewAnnotation: (newAnnotation, range) ->
		@unhighlightAnnotation()

		@newAnnotation = newAnnotation

		@addNewAnnotationTags range

		# Set the urlRoot manually, because a new annotation has not been added to the collection yet.
		annotations = @transcription.get 'annotations'
		newAnnotation.urlRoot = => "#{config.get('restUrl')}projects/#{annotations.projectId}/entries/#{annotations.entryId}/transcriptions/#{annotations.transcriptionId}/annotations"

		@setAnnotatedText newAnnotation

		@trigger 'editAnnotation', newAnnotation

	addNewAnnotationTags: (range) ->
		# Create marker at the beginning of the selection
		span = document.createElement 'span'
		span.setAttribute 'data-marker', 'begin'
		span.setAttribute 'data-id', 'newannotation'
		range.insertNode span

		# Create marker at the end of the selection
		# range.collapse(false) collapses the range to the end (true collapses to the beginning)
		sup = document.createElement 'sup'
		sup.setAttribute 'data-marker', 'end'
		sup.setAttribute 'data-id', 'newannotation'
		sup.innerHTML = 'new'
		range.collapse false
		range.insertNode sup

		# TODO Why set body of @transcription? We don't want to save a transcription
		# with <span data-id=newannotation>, this is error prone!
		@setTranscriptionBody()

	removeNewAnnotation: ->
		@newAnnotation = null
		@removeNewAnnotationTags()

	removeNewAnnotationTags: ->
		@$('[data-id="newannotation"]').remove()
		@setTranscriptionBody()

	setTranscriptionBody: ->
		@unhighlightQuery()
		@unhighlightAnnotation()

		@transcription.set 'body', @$('.body-container .body').html(), silent: true


	onHover: ->

		supEnter = (ev) =>
			id = ev.currentTarget.getAttribute('data-id')

			unless startNode = @el.querySelector "span[data-id='#{id}']"
				console.error 'No span found'
				return false

			@highlighter.on
				startNode: startNode
				endNode: ev.currentTarget
		supLeave = (ev) => @highlighter.off()

		markers = @$('sup[data-marker]')
		# Unbind previous events
		markers.off 'mouseenter mouseleave'
		# Bind hover (mouseenter, mouseleave)
		markers.hover supEnter, supLeave

	resize: ->
		@$el.height document.documentElement.clientHeight - 89 - 78

		@el.style.marginRight = 0 if Fn.hasYScrollBar @el

	setModel: (entry) ->
		@unhighlightAnnotation()
		@model = entry
		@transcription = @model.get('transcriptions').current
		@addListeners()
		@render()

	addListeners: ->
		# * TODO: Triggers double render??
		@listenTo @transcription, 'current:change', @render
		@listenTo @transcription, 'change:body', @render

module.exports = EntryPreview
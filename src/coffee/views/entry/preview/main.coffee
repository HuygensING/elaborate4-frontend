# @options
#	textLayer	String 		The text layer to show, defaults to current text layer.
#	wordwrap	Boolean		Defaults to false

define (require) ->
	Fn = require 'hilib/functions/general'
	dom = require 'hilib/functions/DOM'

	config = require 'config'

	Views = 
		Base: require 'views/base'
		AddAnnotationTooltip: require 'views/entry/preview/annotation.add.tooltip'
		EditAnnotationTooltip: require 'views/entry/preview/annotation.edit.tooltip'

	# Tpl = require 'text!html/entry/preview.html'
	tpls = require 'tpls'

	# ## TranscriptionPreview
	class EntryPreview extends Views.Base

		className: 'preview'

		# ### Initialize
		initialize: ->
			super

			@autoscroll = false

			@highlighter = Fn.highlighter()

			@transcription = if @options.textLayer? then @options.textLayer else @model.get('transcriptions').current
			@interactive = if @options.textLayer? then false else true

			@addListeners()

			@render()

			@options.wordwrap ?= false
			@toggleWrap() if @options.wordwrap

			@resize()


		# ### Render
		render: ->
			data = @transcription.toJSON()
			
			# data.body = '<span class="line">' + data.body.replace(/<br>/g, '</span><br><span class="line">') + '</span>'

			# body = @transcription.get('body')


			# Count all the <br>s in the body string. Match returns null if no breaks are found.
			lineCount = (data.body.match(/<br>/g) ? []).length
			# If the body string does not end with a <br> that means there is
			# some text after the last <br> and we have to add a linenumber.
			lineCount++ if data.body.substr(-4) isnt '<br>'
			data.lineCount = lineCount

			data.lineCount = 0 if data.body.trim() is ''

			@el.innerHTML = tpls['entry/preview'] data

			@renderTooltips()

			@onHover()

			@

		renderTooltips: ->
			@editAnnotationTooltip.remove() if @editAnnotationTooltip?
			@editAnnotationTooltip = new Views.EditAnnotationTooltip
				container: @el.querySelector('.body-container')
				interactive: @interactive

			if @interactive
				@listenTo @editAnnotationTooltip, 'edit', (model) => @trigger 'editAnnotation', model
				@listenTo @editAnnotationTooltip, 'delete', (model) =>
					if model.get('annotationNo') is 'newannotation'
						@removeNewAnnotation()
					else
						# Remove the annotation from the collection, the transcription model wil take care of the rest
						@transcription.get('annotations').remove model

					# Let the entry view know an annotation has been removed so it can remove the annotationEditor view and
					# show the current transcription.
					@trigger 'annotation:removed'

				@addAnnotationTooltip.remove() if @addAnnotationTooltip?
				@addAnnotationTooltip = new Views.AddAnnotationTooltip
					container: @el.querySelector('.body-container')
					annotationTypes: @model.project.get('annotationtypes')

		# ### Events
		events: ->
			hash = 
				'click sup[data-marker="end"]': 'supClicked'
			
			if @interactive
				hash['mousedown .body-container'] = 'onMousedown'
				hash['mouseup .body-container'] = 'onMouseup'
				hash['scroll'] = 'onScroll'

			hash

		onScroll: (ev) ->
			if @autoscroll = !@autoscroll
				Fn.timeoutWithReset 200, => @trigger 'scrolled', Fn.getScrollPercentage ev.currentTarget

		supClicked: (ev) ->
			return console.error 'No annotations found!' unless @transcription.get('annotations')?

			id = ev.currentTarget.getAttribute('data-id')

			annotation = if id is 'newannotation' then @newAnnotation else @transcription.get('annotations').findWhere annotationNo: id >> 0
			return console.error 'Annotation not found! ID:', id, ' Collection:', @transcription.get('annotations') unless annotation?

			@setAnnotatedText annotation

			@editAnnotationTooltip.show
				$el: $(ev.currentTarget)
				model: annotation

		onMousedown: (ev) ->
			downOnAdd = ev.target is @addAnnotationTooltip.el or dom(@addAnnotationTooltip.el).hasDescendant(ev.target)
			downOnEdit = ev.target is @editAnnotationTooltip.el or dom(@editAnnotationTooltip.el).hasDescendant(ev.target)

			unless downOnEdit or downOnAdd
				@addAnnotationTooltip.hide()
				@editAnnotationTooltip.hide()

		onMouseup: (ev) ->
			upOnAdd = ev.target is @addAnnotationTooltip.el or dom(@addAnnotationTooltip.el).hasDescendant(ev.target)
			upOnEdit = ev.target is @editAnnotationTooltip.el or dom(@editAnnotationTooltip.el).hasDescendant(ev.target)
			
			checkMouseup = =>
				sel = document.getSelection()

				# If there is no range to get (for example when using the scrollbar)
				# or
				# When the user clicked a sup
				if sel.rangeCount is 0 or ev.target.tagName is 'SUP' or ev.target.tagName is 'BUTTON'
					# Only hide the tooltip, don't stopListening, because the click to add an annotation also ends up here
					@addAnnotationTooltip.hide()
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
						# Listen once to the click on the (to be shown) add annotation tooltip.
						@listenToOnce @addAnnotationTooltip, 'clicked', (model) =>
							@addNewAnnotation model, range
						# Show the add annotation tooltip.

						@addAnnotationTooltip.show
							left: ev.pageX
							top: ev.pageY

			# Move checkMouseup to the end of the event queue, because the we want to wait for the
			# browser to finish events like deselect.
			setTimeout checkMouseup, 0 unless upOnAdd or upOnEdit


		# ### Methods

		toggleWrap: (wrap) -> @$el.toggleClass 'wrap', wrap

		destroy: ->
			@addAnnotationTooltip.remove() if @addAnnotationTooltip?
			@editAnnotationTooltip.remove()

			@remove()

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
			newAnnotation.urlRoot = => config.baseUrl + "projects/#{annotations.projectId}/entries/#{annotations.entryId}/transcriptions/#{annotations.transcriptionId}/annotations"
			
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

		setTranscriptionBody: (body) ->
			@unhighlightAnnotation()

			body = @$('.body-container .body').html()
			@transcription.set 'body', body, silent: true


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
Backbone = require 'backbone'
$ = require 'jquery'
_ = require 'underscore'

dom = require 'hilib/src/utils/dom'

Annotations = require '../collections/annotations'

tpl = require '../templates/annotations.jade'

class AnnotationsView extends Backbone.View

	className: 'annotations'

	# ### Initialize

	initialize: ->
		@expandAnnotations = false

		@render()

		# @startListening()

	# ### Render
	# Render is called from the textView, because the annotationsView needs a list of the
	# sups that are rendered in the textView.
	render: ->
		annotationData = @options.paralleltexts[@options.textLayer]?.annotationData

		annotations = {}
		annotations[annotation.n] = annotation for annotation in annotationData ? []

		orderedAnnotations = new Annotations()
		orderedAnnotations.add annotations[id] for id in (@options.$sups.map (index, sup) -> sup.getAttribute('data-id'))

		@$el.html tpl
			annotations: orderedAnnotations
			annotationTypes: @options.annotationTypes[@options.textLayer] or []

		@toggleAnnotations true if @expandAnnotations

		enter = (ev) => @options.eventBus.trigger 'highlight-annotation', ev.currentTarget.getAttribute 'data-id'
		leave = (ev) => @options.eventBus.trigger 'unhighlight-annotation', ev.currentTarget.getAttribute 'data-id'
		@$('ol li').hover enter, leave

		@

	# ### Events
	events:
		'click i.btn-collapse': 'toggleAnnotations'
		'change header select': 'filterAnnotations'
		'click li': 'sendToggleAnnotation'

	# The 'send-toggle-annotation' event tells the textView it should send the toggle:annotation event.
	# We do this, because we need the supTop (the top position of the <sup> with data-id=markerId in the textView)
	# when aligning the sup[data-id] with li[data-id].
	sendToggleAnnotation: (ev) -> @options.eventBus.trigger 'send:toggle:annotation', ev.currentTarget.getAttribute 'data-id'

	filterAnnotations: (ev) ->
		type = ev.currentTarget[ev.currentTarget.selectedIndex].value

		if type is 'show-all-annotations'
			@$('ol li').removeClass 'hide'
		else
			@$('ol li:not([data-type="'+type+'"])').addClass 'hide'
			@$('ol li[data-type="'+type+'"]').removeClass 'hide'

		@resetAnnotations()

	toggleAnnotations: (flag) ->
		$target = @$ 'i.btn-collapse'

		@expandAnnotations = if _.isBoolean flag then flag else $target.hasClass 'fa-expand' 

		# If we expand the annotations, the button should change to 'compress' and vice versa.
		if @expandAnnotations
			$target.addClass 'fa-compress'
			$target.removeClass 'fa-expand'
		else
			$target.removeClass 'fa-compress'
			$target.addClass 'fa-expand'

		@$('ol').toggleClass('active', @expandAnnotations)

		@resetAnnotations()

	# ### Methods

	destroy: -> @remove()

	highlightTerms: (terms) ->
		for term in terms
			$spans = @$("ol li > span:contains(#{term})")

			# We want to ignore html tags lying between the letters of the searched term.
			term = term.split('').join('(</?\\w+>)*')

			for span in $spans
				$span = $(span)
				$span.parent('li').addClass 'show'
				regex = new RegExp(term, "gi")
				html = $span.html().replace(regex, "<span class=\"highlight-term\">$&</span>")
				$span.html html

		# @scrollIntoView @$('span.highlight-term').first()

	resetAnnotations: ->
		@$('ol li.show').removeClass 'show'

		# Reset the top position of the <ol>, because it could be moved by the user.
		@$('ol').animate top: 0

	toggleAnnotation: (ev) ->
		$target = if ev.hasOwnProperty 'currentTarget' then @$ ev.currentTarget else @$ 'li[data-id="'+ev+'"]'
		$target.toggleClass('show').siblings().removeClass 'show'

	slideAnnotations: (markerId, supTop) ->
		$li = @$('li[data-id="'+markerId+'"]')

		# To align an annotation in the list with the corresponding marker,
		# we set the top position of the list (<ol>) to the position of the marker
		# minus the position of the annotation (<li>) within the list and
		# subtract the height of the header (40px) and add some text offset (4px).
		liTop = supTop - $li.position().top - 36

		# Scroll the list to it's new top position.
		@$('ol').animate top: liTop, 400, =>
			newScrollPos = dom($li[0]).position(@options.scrollEll).top - (@options.scrollEl.offset().top + 30)

			# Snap to top if we are close (< 300px)
			newScrollPos = 0 if newScrollPos < 300

			unless @options.scrollEl.scrollTop() < newScrollPos < @options.scrollEl.height() + @options.scrollEl.scrollTop()
				@options.scrollEl.animate scrollTop: newScrollPos

	startListening: ->
		@listenTo @options.eventBus, 'toggle:annotation', (markerId, supTop) =>
			@toggleAnnotation markerId
			@slideAnnotations markerId, supTop

		@listenTo @options.eventBus, 'activate:annotation', (markerId) => @$('li[data-id="'+markerId+'"]').addClass 'active'
		@listenTo @options.eventBus, 'unactivate:annotation', (markerId) => @$('li[data-id="'+markerId+'"]').removeClass 'active'

module.exports = AnnotationsView
Backbone = require 'backbone'
$ = require 'jquery'
_ = require 'underscore'

dom = require 'hilib/src/utils/dom'
require 'hilib/src/utils/jquery.mixin'

tpl = require '../templates/text.jade'

config = require '../../../models/config'
textlayers = require '../../../collections/textlayers'

hl = null

class EntryTextView extends Backbone.View

	className: 'text'

	# ### Initialize

	initialize: (@options) -> @render()

	# ### Render

	render: ->
		text = @options.paralleltexts[@options.textLayer]?.text

		# Doing this to ensure empty lines get correct height, so as not to mess with line numbering
		if text?
			text = String(text).replace /<div class="line">\s*<\/div>/mg, '<div class="line">&nbsp;</div>'

		@$el.html tpl 
			textLayer: @options.textLayer
			textlayers: textlayers

		@$el.append(text)

		enter = (ev) => 
			markerId = ev.currentTarget.getAttribute 'data-id'
			@options.eventBus.trigger 'activate:annotation', markerId
			@highlightOn markerId
		leave = (ev) => 
			markerId = ev.currentTarget.getAttribute 'data-id'
			@options.eventBus.trigger 'unactivate:annotation', markerId
			@highlightOff markerId
		@$('sup[data-marker]').hover enter, leave

		@$el.addClass config.get('textFont')

		@

	# ### Events
	events:
		'change header select': 'changeTextlayer'
		# 'click i.btn-print': (e) -> window.print()
		'click i.toggle-annotations': 'toggleAnnotations'
		'click sup[data-marker]': 'toggleAnnotation'

	toggleAnnotations: (ev) ->
		target = $(ev.currentTarget)
		
		# If class is fa-comments, we are going to show the annotations (showing=true)
		showing = target.hasClass 'fa-comments'
		
		target.toggleClass 'fa-comments'
		target.toggleClass 'fa-comments-o'

		# Change the title attribute of the icon
		title = if showing then 'Hide annotations' else 'Show annotations'
		target.attr 'title', title

		# The event is picked up by the parent view to set a className, so we can hide the
		# annotations using CSS.
		@trigger 'toggle-annotations', showing

	toggleAnnotation: (ev) ->
		markerId = ev.currentTarget.getAttribute 'data-id'
		supTop = dom(ev.currentTarget).position(@el).top
		
		@options.eventBus.trigger 'toggle:annotation', markerId, supTop

	changeTextlayer: (ev) -> 
		ev = ev.currentTarget.options[ev.currentTarget.selectedIndex].value if ev.hasOwnProperty 'currentTarget'
		@trigger 'change:textlayer', ev

	# ### Methods

	destroy: -> @remove()

	highlightAnnotation: (markerId, $scrollEl) ->
		@highlightOn markerId

		$sup = @$ "sup[data-id='#{markerId}']"
		# console.log markerId, $sup, dom($sup[0]).position(), dom($sup[0]).position(@el).top

		@options.eventBus.trigger 'toggle:annotation', markerId, dom($sup[0]).position(@el).top
		
		@scrollIntoView $sup

	highlightTerms: (terms) ->
		for term in terms
			$divs = @$("div.line:contains(#{term})")

			# We want to ignore html tags lying between the letters of the searched term.
			term = term.split('').join('(</?\\w+>)*')

			for div in $divs
				$div = $(div)
				regex = new RegExp(term, "gi")
				html = $div.html().replace(regex, "<span class=\"highlight-term\">$&</span>")
				$div.html html

		@scrollIntoView @$('span.highlight-term').first()

	scrollIntoView: ($el) ->
		if $el.length > 0 and not dom($el[0]).inViewport()
			supAbsoluteTop = $el.offset().top
			
			# Subtrackt the area above scrollEl (.panels)
			# TODO Fix me, this does not scale, 372 is hard coded. No time to fix now.
			@options.scrollEl.animate
				scrollTop: supAbsoluteTop - 372

	annotationStartNode: (markerID) -> @el.querySelector("span[data-marker=\"begin\"][data-id=\"#{markerID}\"]")
	annotationEndNode: (markerID) -> @el.querySelector("sup[data-marker=\"end\"][data-id=\"#{markerID}\"]")

	highlightOn: (markerId) ->
		startNode = @annotationStartNode(markerId)
		endNode = @annotationEndNode(markerId)

		hl = dom(startNode).highlightUntil(endNode).on()

	highlightOff: (markerId) -> hl.off() if hl?

	startListening: ->
		@listenTo @options.eventBus, 'highlight-annotation', (markerId) =>	@highlightOn markerId 
		@listenTo @options.eventBus, 'unhighlight-annotation', (markerId) => @highlightOff markerId

		@listenTo @options.eventBus, 'send:toggle:annotation', (markerId) =>
			@options.eventBus.trigger 'toggle:annotation', markerId, dom(@$('sup[data-id="'+markerId+'"]')[0]).position(@el).top

module.exports = EntryTextView
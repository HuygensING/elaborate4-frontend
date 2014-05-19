_ = require 'underscore'

DOM = (el) ->
	el = document.querySelector(el) if _.isString(el)
	
	el: el

	q: (query) ->
		DOM query

	find: (query) ->
		DOM query

	findAll: (query) ->
		DOM el.querySelectorAll(query)

	html: (html) ->
		return el.innerHTML unless html?

		# Check if html is an HTMLelement
		if (html.nodeType is 1 or html.nodeType is 11)
			el.innerHTML = ''
			el.appendChild html
		# Assume html is a String
		else
			el.innerHTML = html


	hide: ->
		el.style.display = 'none'
		@

	show: (displayType='block') ->
		el.style.display = displayType
		@

	toggle: (displayType='block', show) ->
		dt = if el.style.display is displayType then 'none' else displayType

		if show?
			dt = if show then displayType else 'none'

		el.style.display = dt

		@

	# Native alternative to $.closest
	# See http://stackoverflow.com/questions/15329167/closest-ancestor-matching-selector-using-native-dom
	closest: (selector) ->
		matchesSelector = el.matches or el.webkitMatchesSelector or el.mozMatchesSelector or el.msMatchesSelector

		while (el)
			if (matchesSelector.bind(el)(selector)) then return el else	el = el.parentNode

	append: (childEl) ->
		el.appendChild childEl

	prepend: (childEl) ->
		el.insertBefore childEl, el.firstChild

	###
	Native alternative to jQuery's $.offset()

	http://www.quirksmode.org/js/findpos.html
	###
	position: (parent=document.body) ->
		left = 0
		top = 0
		loopEl = el

		while loopEl? and loopEl isnt parent
			# Not every parent is an offsetParent. So in the case the user has passed a non offsetParent as the parent, 
			# we check if we have passed the parent (by checking if the offsetParent has a descendant which is the parent).
			break if @hasDescendant parent

			left += loopEl.offsetLeft
			top += loopEl.offsetTop

			loopEl = loopEl.offsetParent

		left: left
		top: top

	###
	Is child el a descendant of parent el?

	http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
	###
	hasDescendant: (child) ->
		node = child.parentNode
		
		while node?
			return true if node is el
			node = node.parentNode

		return false

	boundingBox: ->
		box = @position()
		box.width = el.clientWidth
		box.height = el.clientHeight
		box.right = box.left + box.width
		box.bottom = box.top + box.height

		box

	insertAfter: (referenceElement) -> referenceElement.parentNode.insertBefore el, referenceElement.nextSibling


	# Highlight every text node from el, to endNode (argument).
	# Every text node will be surrounded by a span.highlight.
	#
	# Example usage:
	# highlighter = null # Create a reference highlighter
	# @$("div.hover")
	# 	.mouseenter (ev) =>
	# 		startNode = @el.querySelector "span.start_node']"
	# 		endNode = @el.querySelector "span.end_node']"
	# 		highlighter = dom(startNode).highlightUntil(endNode).on()
	# 	.mouseleave (ev) =>
	# 		highlighter.off()
	highlightUntil: (endNode, options={}) ->
		options.highlightClass ?= 'highlight'
		options.tagName ?= 'span'

		on: ->
			range = document.createRange()
			range.setStartAfter el
			range.setEndBefore endNode

			filter = (node) => 
				r = document.createRange()
				r.selectNode(node)

				start = r.compareBoundaryPoints(Range.START_TO_START, range)
				end = r.compareBoundaryPoints(Range.END_TO_START, range)

				if start is -1 or end is 1 then NodeFilter.FILTER_SKIP else	NodeFilter.FILTER_ACCEPT

			filter.acceptNode = filter
			
			treewalker = document.createTreeWalker range.commonAncestorContainer, NodeFilter.SHOW_TEXT, filter, false
			
			while treewalker.nextNode()
				range2 = new Range()
				range2.selectNode treewalker.currentNode

				newNode = document.createElement options.tagName
				newNode.className = options.highlightClass

				range2.surroundContents newNode
				
			@

		off: ->
			for el in document.querySelectorAll('.' + options.highlightClass)
				# Move the text out of the span.highlight
				el.parentElement.insertBefore(el.firstChild, el)

				# Remove the span.highlight
				el.parentElement.removeChild(el)


	hasClass: (name) -> (' ' + el.className + ' ').indexOf(' ' + name + ' ') > -1

	addClass: (name) -> el.className += ' ' + name unless @hasClass name

	removeClass: (name) ->
		names = ' ' + el.className + ' '
		names = names.replace ' ' + name + ' ', ''
		el.className = names.replace /^\s+|\s+$/g, ''

	toggleClass: (name) -> if @hasClass name then @addClass name else @removeClass name

	# http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport/7557433#7557433
	inViewport: (parent) ->
		win = parent ? window
		doc = parent ? document.documentElement

		rect = el.getBoundingClientRect()

		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= (win.innerHeight || doc.clientHeight) &&
		rect.right <= (win.innerWidth || doc.clientWidth)

	# Create a TreeWalker object between two given nodes. By default
	# the TreeWalker traverses elements, but this can be overridden
	# by passing a nodeFilterConstant see: https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker
	createTreeWalker: (endNode, nodeFilterConstant) ->
		nodeFilterConstant ?= NodeFilter.SHOW_ELEMENT

		range = document.createRange()
		range.setStartAfter el
		range.setEndBefore endNode

		filter = (node) => 
			r = document.createRange()
			r.selectNode(node)

			start = r.compareBoundaryPoints(Range.START_TO_START, range)
			end = r.compareBoundaryPoints(Range.END_TO_START, range)

			if start is -1 or end is 1 then NodeFilter.FILTER_SKIP else	NodeFilter.FILTER_ACCEPT

		filter.acceptNode = filter
		
		document.createTreeWalker range.commonAncestorContainer, nodeFilterConstant, filter, false

module.exports = DOM
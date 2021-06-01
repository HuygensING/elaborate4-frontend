Backbone = require 'backbone'
$ = require 'jquery'

util = require 'funcky.util'

tpl = require './main.jade'

###
Create a pagination view.
@class
@extends Backbone.View
###
class Pagination extends Backbone.View

	tagName: 'ul'

	className: 'hibb-pagination'
	###
	@constructs
	@param {object} this.options
	@prop {number} options.resultsTotal - Total number of results.
	@prop {number} options.resultsPerPage - Number of results per page.
	@prop {number} [options.resultsStart=0] - The result item to start at. Not the start page!
	@prop {boolean} [options.step10=true] - Render (<< and >>) for steps of 10.
	@prop {boolean} [options.triggerPageNumber=true] - Trigger the new pageNumber (true) or prev/next (false).
	###
	initialize: (@options) ->
		@options.step10 ?= true
		@options.triggerPageNumber ?= true

		@_currentPageNumber = if @options.resultsStart? and @options.resultsStart > 0 then (@options.resultsStart/@options.resultsPerPage) + 1 else 1
		@setPageNumber @_currentPageNumber, true

		# DEBUG
		# console.log "currentPage", currentPage
		# console.log "@options.resultsStart", @options.resultsStart
		# console.log "@options.resultsPerPage", @options.resultsPerPage
		# console.log "@options.resultsStart/@options.resultsPerPage", @options.resultsStart/@options.resultsPerPage

	render: ->
		@_pageCount = Math.ceil @options.resultsTotal / @options.resultsPerPage
		
		attrs = $.extend @options,
			currentPageNumber: @_currentPageNumber
			pageCount: @_pageCount
		@el.innerHTML = tpl attrs
		
		@$el.hide() if @_pageCount <= 1

		@

	events: ->
		'click li.prev10.active': '_handlePrev10'
		'click li.prev.active': '_handlePrev'
		'click li.next.active': '_handleNext'
		'click li.next10.active': '_handleNext10'
		'click li.current:not(.active)': '_handleCurrentClick'
		'blur li.current.active input': '_handleBlur'
		'keyup li.current.active input': '_handleKeyup'

	_handlePrev10: -> @setPageNumber @_currentPageNumber - 10
	_handlePrev: -> @setPageNumber @_currentPageNumber - 1
	_handleNext: -> @setPageNumber @_currentPageNumber + 1
	_handleNext10: -> @setPageNumber @_currentPageNumber + 10

	_handleCurrentClick: (ev) ->
		target = @$(ev.currentTarget)
		span = target.find 'span'
		input = target.find 'input'

		# Sequence is important here!
		# First: set the input width to the span's width.
		input.width span.width()

		# Second: add the active class to the li.
		target.addClass 'active'

		# Third: animate the input to a given width.
		input.animate width: 40, 'fast'

		# First set the focus, than (re)set the current page number,
		# so the cursor is put at the end. This is also possible (more robust)
		# with a selection object, but this is way simpler.
		input.focus()
		input.val @_currentPageNumber

	_handleKeyup: (ev) ->
		input = @$(ev.currentTarget)
		newPageNumber = +input.val()

		if ev.keyCode is 13
			if 1 <= newPageNumber <= @_pageCount
				@setPageNumber newPageNumber

			@_deactivateCurrentLi input

	_handleBlur: (ev) ->
		@_deactivateCurrentLi @$(ev.currentTarget)

	_deactivateCurrentLi: (input) ->
		input.animate width: 0, 'fast', ->
			li = input.parent()
			li.removeClass 'active'


	###
	@method getCurrentPageNumber
	@returns {number}
	###
	getCurrentPageNumber: ->
		@_currentPageNumber

	###
	@method setPageNumber
	@param {number} pageNumber
	@param {boolean} [silent=false]
	###
	setPageNumber: (pageNumber, silent=false) ->

		unless @triggerPageNumber
			direction = if pageNumber < @_currentPageNumber then 'prev' else 'next'

			@trigger direction

		@_currentPageNumber = pageNumber
		@render()

		unless silent
			util.setResetTimeout 500, =>
				@trigger 'change:pagenumber', pageNumber

	destroy: ->
		@remove()

module.exports = Pagination
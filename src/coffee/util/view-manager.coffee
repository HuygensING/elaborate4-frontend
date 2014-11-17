$ = require 'jquery'

class ViewManager
	constructor: ->
		@_currentView = null
		@_cache = {}

	show: (View, viewOptions, options={}) ->
		# Destroy the current view.
		if @_currentView?
			@_currentView.destroy() 
			@_currentView = null

		# Hide all cached views.
		cachedView.$el.hide() for key, cachedView of @_cache

		# Handle a request for a cached view.
		if options.cache?
			# Create a cached view if it doesn't exist.
			unless @_cache[options.cache]?
				@_cache[options.cache] = new View viewOptions
				# Cached views are appended outside the #main div.
				$('div#container').append @_cache[options.cache].el

			# Show the cached view.
			@_cache[options.cache].$el.show()
		# Handle a request for a 'normal' view.
		else
			@_currentView = new View viewOptions
			view = @_currentView.el
			
			$('div#main').html view

	removeFromCache: (key) ->
		delete @_cache[key]

module.exports = ViewManager
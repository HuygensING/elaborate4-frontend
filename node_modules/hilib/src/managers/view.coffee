StringFn = require '../utils/string'

class ViewManager

	currentViews = {}

	cachedViews = {}

	clear: (view) ->
		# console.log 'clearing', view, view.options
		selfDestruct = (view) ->
			unless view.options.persist is true
				if view.destroy? then view.destroy() else view.remove()
				delete currentViews[view.cid]

		# Remove one view 
		if view?
			selfDestruct view 
		# Remove all views
		else
			selfDestruct view for own cid, view of currentViews

	clearCache: ->
		@clear()
		cachedViews = {}

	register: (view) -> currentViews[view.cid] = view if view?

	show: (el, View, options={}) ->
		@clear view for own cid, view of currentViews when not view.options.cache and not view.options.persist

		el = document.querySelector el if _.isString el

		options.append ?= false
		options.prepend ?= false
		options.persist ?= false
		options.cache = false if options.persist is true
		options.cache ?= true

		if options.cache
			viewHashCode = StringFn.hashCode View.toString() + JSON.stringify options

			cachedViews[viewHashCode] = new View(options) unless cachedViews.hasOwnProperty viewHashCode
				
			view = cachedViews[viewHashCode]
		else
			view = new View options

		if _.isElement(el) and view?
			el.innerHTML = '' unless options.append or options.prepend

			if options.prepend and el.firstChild?
				el.insertBefore view.el, el.firstChild
			else
				el.appendChild view.el

		view
				
module.exports = new ViewManager()
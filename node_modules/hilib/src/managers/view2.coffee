StringFn = require '../utils/string'

currentView = null

cachedViews = {}

class ViewManager
	clear: -> 
		view.destroy() for own hashCode, view of cachedViews
		cachedViews = {}

	show: ($el, View, options={}) ->

		options.append ?= false
		options.prepend ?= false

		# Option to bypass cache when set to false.
		options.cache ?= true

		viewHashCode = StringFn.hashCode View.toString() + JSON.stringify options

		# Create a new cached view if the view is not found in the cachedViews hash or
		# options.cache is set to false. Textual we use "or", but in logics we need an inverted "and": if (!(a&&b)).
		unless cachedViews.hasOwnProperty(viewHashCode) and options.cache
			cachedViews[viewHashCode] = new View options

		# Set the currentView
		currentView = cachedViews[viewHashCode]

		el = $el[0]
		el.innerHTML = '' unless options.append or options.prepend

		if options.prepend and el.firstChild?
			el.insertBefore currentView.el, el.firstChild
		else
			el.appendChild currentView.el

		currentView
				
module.exports = new ViewManager()
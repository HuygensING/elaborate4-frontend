FacetedSearchResults = require 'elaborate-modules/modules/views/faceted-search-results'

currentUser = require '../../models/currentUser'
projects = require '../../collections/projects'

Views =
	Base: require 'hilib/src/views/base'

class Search extends Views.Base

	initialize: -> @render()

	render: ->
		fsr = new FacetedSearchResults
			currentUser: currentUser
			projects: projects
			
		@$el.html fsr.$el

		@

module.exports = Search
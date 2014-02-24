Backbone = require 'backbone'

FacetedSearchResults = require 'elaborate-modules/modules/views/faceted-search-results'

config = require 'elaborate-modules/modules/models/config'
# currentUser = require '../../models/currentUser'
projects = require '../../collections/projects'

Views =
	Base: require 'hilib/src/views/base'
	Submenu: require './search.submenu'

class Search extends Views.Base

	className: 'search'

	initialize: ->
		super

		projects.getCurrent (@project) => @render()

	render: ->
		submenu = new Views.Submenu()
		@$el.html submenu.$el

		@listenTo submenu, 'newsearch', -> fsr.reset()
		@listenTo submenu, 'editmetadata', -> fsr.toggleEditMultipleMetadata()

		fsr = new FacetedSearchResults
			levels: [@project.get('level1'), @project.get('level2'), @project.get('level3')]
			entryMetadataFields: @project.get('entrymetadatafields')
			textLayers: @project.get('textLayers')
			searchUrl: "#{config.get('baseUrl')}projects/#{@project.id}/search"
			editMultipleMetadataUrl: "#{config.get('baseUrl')}projects/#{@project.id}/multipleentrysettings"
		@$el.append fsr.$el

		@listenTo fsr, 'change:results', (responseModel) => 
			project = projects.current
			project.resultSet = responseModel
			project.get('entries').add responseModel.get('results'), merge: true
		@listenTo fsr, 'navigate:entry', (id) =>
			Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{id}", trigger: true
		@listenTo fsr, 'editmultiplemetadata:saved', (entryIds) ->
			console.log entryIds
			@project.get('entries').changed = _.union @project.get('entries').changed, entryIDs

		@

module.exports = Search
Backbone = require 'backbone'
$ = require 'jquery'

StrFn = require 'hilib/src/utils/string'

FacetedSearchResults = require 'elaborate-modules/modules/views/faceted-search-results'
FacetedSearch = require 'huygens-faceted-search'

config = require 'elaborate-modules/modules/models/config'
# currentUser = require '../../models/currentUser'
projects = require '../../collections/projects'

token = require 'hilib/src/managers/token'

Views =
	Base: require 'hilib/src/views/base'
	Submenu: require './search.submenu'

entryMetadataChanged = false

# TODO: Destroy view
class Search extends Views.Base

	className: 'search'

	# ### Initialize
	initialize: (@options) ->
		super

		projects.getCurrent (@project) =>
			@render()
			@listenTo Backbone, 'change:entry-metadata', => entryMetadataChanged = true
			@listenTo Backbone, 'router:search', => @subviews.fsr.reset() if entryMetadataChanged

	# ### Render
	render: ->
		submenu = new Views.Submenu()
		@$el.html submenu.$el

		div = document.createElement 'div'
		div.className = 'faceted-search-placeholder'

		@$el.append div

		levels = [@project.get('level1'), @project.get('level2'), @project.get('level3')]
		sortParameters = (fieldname: level, direction: 'asc' for level in levels)

		@subviews.fs = new FacetedSearch
			el: @$('div.faceted-search-placeholder')
			levels: levels
			entryMetadataFields: @project.get('entrymetadatafields')
			textLayers: @project.get('textLayers')
			baseUrl: "#{config.get('restUrl')}"
			searchPath: "projects/#{@project.id}/search"
			results: true
			authorizationHeaderToken: "#{token.getType()} #{token.get()}"
			textSearchOptions:
				textLayers: @project.get('textLayers')
				searchInAnnotations: true
				searchInTranscriptions: true
			queryOptions:
				sortParameters: sortParameters
				resultFields: levels

		@subviews.fs.search()

		# @$el.append @subviews.fs.el

		@listenTo submenu, 'newsearch', -> @subviews.fs.reset()
		# @listenTo submenu, 'editmetadata', -> @subviews.fsr.toggleEditMultipleMetadata()

		# @subviews.fsr = new FacetedSearchResults
		# 	levels: [@project.get('level1'), @project.get('level2'), @project.get('level3')]
		# 	entryMetadataFields: @project.get('entrymetadatafields')
		# 	textLayers: @project.get('textLayers')
		# 	searchUrl: "#{config.get('restUrl')}projects/#{@project.id}/search"
		# 	editMultipleMetadataUrl: "#{config.get('restUrl')}projects/#{@project.id}/multipleentrysettings"
		# @$el.append @subviews.fsr.$el

		# @listenToOnce @subviews.fsr, 'change:results', => submenu.enableEditMetadataButton()

		@listenTo @subviews.fs, 'change:results', (responseModel) =>
			project = projects.current
			project.resultSet = responseModel
			project.get('entries').add responseModel.get('results'), merge: true

		# 	# Set the height of div.entries dynamically
		# 	entries = @subviews.fsr.$el.find('div.entries')
		# 	entries.height $(window).height() - entries.offset().top

		@listenTo @subviews.fs, 'result:click', (data) =>
			console.log data
			# TODO get href from model
			url = "projects/#{@project.get('name')}/entries/#{data.id}"
			Backbone.history.navigate url, trigger: true

		@listenTo @subviews.fs, 'result:layer-click', (layer, data) =>
			console.log layer, data
		# 	if textLayer?
		# 		splitLayer = textLayer.split(' ')
		# 		if splitLayer[splitLayer.length - 1] is 'annotations'
		# 			splitLayer.pop()
		# 			textLayer = splitLayer.join(' ')
		# 		textLayerSlug = StrFn.slugify textLayer

		# 		url += "/transcriptions/#{textLayerSlug}"


		# @listenTo @subviews.fsr, 'editmultiplemetadata:saved', (entryIds) ->
		# 	@project.get('entries').changed = _.union @project.get('entries').changed, entryIDs

		# @subscribe 'faceted-search:refresh', => @subviews.fsr.refresh()

		@

module.exports = Search
Backbone = require 'backbone'
$ = require 'jquery'

StrFn = require 'hilib/src/utils/string'

# FacetedSearchResults = require 'elaborate-modules/modules/views/faceted-search-results'
FacetedSearch = require 'huygens-faceted-search'

config = require '../../../models/config'
projects = require '../../../collections/projects'

token = require 'hilib/src/managers/token'

Views =
	Base: require 'hilib/src/views/base'
	Submenu: require './submenu'
	EditMetadata: require './edit-metadata'

entryMetadataChanged = false

# TODO: Destroy view
class Search extends Views.Base

	className: 'search'

	# ### Initialize
	initialize: (@options) ->
		super

		@subviews = {}

		projects.getCurrent (@project) =>
			@render()

			# If the project's entry metadata fields change, the faceted search
			# has to be updated to render the sort fields correctly.
			@listenTo @project, 'change:entrymetadatafields', (values) =>
				@subviews.fs.config.set entryMetadataFields: values

			@listenTo @project, 'change:level1 change:level2 change:level3', =>
				@subviews.fs.config.set levels: [
					@project.get('level1')
					@project.get('level2')
					@project.get('level3')
				]
			# TODO fix for new FS
			# @listenTo Backbone, 'change:entry-metadata', => entryMetadataChanged = true
			# @listenTo Backbone, 'router:search', => @subviews.fsr.reset() if entryMetadataChanged

	# ### Render
	render: ->
		@renderSubmenu()
		@renderFacetedSearch()

		@_addListeners()

		@

	renderSubmenu: ->
		@subviews.submenu = new Views.Submenu()
		@$el.html @subviews.submenu.$el

	renderFacetedSearch: ->
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
				term: '*:*'
				caseSensitive: true
				fuzzy: true
			queryOptions:
				sortParameters: sortParameters
				resultFields: levels
			resultRows: @project.get('settings').get('results-per-page')

		@subviews.fs.search()

		# @$el.append @subviews.fs.el


		# @listenTo submenu, 'editmetadata', -> @subviews.fsr.toggleEditMultipleMetadata()

		# @subviews.fsr = new FacetedSearchResults
		# 	levels: [@project.get('level1'), @project.get('level2'), @project.get('level3')]
		# 	entryMetadataFields: @project.get('entrymetadatafields')
		# 	textLayers: @project.get('textLayers')
		# 	searchUrl: "#{config.get('restUrl')}projects/#{@project.id}/search"
		# 	editMultipleMetadataUrl: "#{config.get('restUrl')}projects/#{@project.id}/multipleentrysettings"
		# @$el.append @subviews.fsr.$el


		# 	# Set the height of div.entries dynamically
		# 	entries = @subviews.fsr.$el.find('div.entries')
		# 	entries.height $(window).height() - entries.offset().top


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

	_addListeners: ->
		@listenTo @subviews.submenu, 'newsearch', => 
			@subviews.fs.reset()

		@listenTo @subviews.submenu, 'edit-metadata', =>
			@_showEditMetadata()

		@listenTo @subviews.submenu, 'save-edit-metadata', =>
			@subviews.editMetadata.save()

		@listenTo @subviews.submenu, 'cancel-edit-metadata', =>
			@_hideEditMetadata()
		
		@listenToOnce @subviews.fs, 'change:results', => 
			@subviews.submenu.enableEditMetadataButton()

		@listenTo @subviews.fs, 'change:results', (responseModel) =>
			project = projects.current
			project.resultSet = responseModel
			project.get('entries').add responseModel.get('results'), merge: true

		@listenTo @subviews.fs, 'result:click', (data) =>
			# console.log data
			# TODO get href from model
			url = "projects/#{@project.get('name')}/entries/#{data.id}"
			Backbone.history.navigate url, trigger: true

		@listenTo @subviews.fs, 'result:layer-click', (textLayer, data) =>
			if textLayer?
				# TODO Move logic to model
				splitLayer = textLayer.split(' ')
				if splitLayer[splitLayer.length - 1] is 'annotations'
					splitLayer.pop()
					textLayer = splitLayer.join(' ')
				textLayerSlug = StrFn.slugify textLayer

				url = "projects/#{@project.get('name')}/entries/#{data.id}"
				url += "/transcriptions/#{textLayerSlug}"

				Backbone.history.navigate url, trigger: true

	_showEditMetadata: ->
		@subviews.submenu.$el.addClass 'submenu-edit-metadata'
		
		@$('.faceted-search-placeholder').hide()

		@subviews.editMetadata = new Views.EditMetadata
			entryMetadataFields: @project.get('entrymetadatafields')
			resultModel: @subviews.fs.searchResults.getCurrent()
			isMetadataVisible: @subviews.fs.results.isMetadataVisible
		@$el.append @subviews.editMetadata.el

		@listenTo @subviews.editMetadata, 'activate-save-button', =>
			@subviews.submenu.activateEditMetadataSaveButton()

		@listenTo @subviews.editMetadata, 'deactivate-save-button', =>
			@subviews.submenu.deactivateEditMetadataSaveButton()

		@listenTo @subviews.editMetadata, 'saved', =>
			@_hideEditMetadata()
			@subviews.fs.reset()

	_hideEditMetadata: ->
		@subviews.submenu.$el.removeClass 'submenu-edit-metadata'

		@$('.faceted-search-placeholder').show()

		@subviews.editMetadata.destroy()
		delete @subviews.editMetadata

module.exports = Search
Backbone = require 'backbone'
$ = require 'jquery'
_ = require 'underscore'

Fn = require 'hilib/src/utils/general'
dom = require 'hilib/src/utils/dom'
token = require 'hilib/src/managers/token'


config = require '../../models/config'

Entry = require '../../models/entry'

Views =
	Base: require 'hilib/src/views/base'
	FacetedSearch: require 'huygens-faceted-search'
	EditMultipleMetadata: require './views/edit-multiple-metadata'
	SearchResult: require '../search-result'

tpl = require './templates/main.jade'

editMultipleMetadataActive = false

class FacetedSearchResults extends Views.Base

	className: 'faceted-search-results'

	# ### Initialize
	initialize: ->
		super

		@resultRows = 50

		@listenTo Backbone, 'entrymetadatafields:update', (fields) =>
			@options.entryMetadataFields = fields

		@render()

	# ### Render
	render: ->
		rtpl = tpl
			entryTermSingular: config.get('entryTermSingular')
		@$el.html rtpl

		@renderFacetedSearch()

		@

	renderFacetedSearch: ->
		sortParameters = []
		sortParameters.push fieldname: level, direction: 'asc' for level in @options.levels

		@subviews.facetedSearch = new Views.FacetedSearch
			# baseUrl: config.get('baseUrl')
			# searchPath: 'projects/'+@project.id+'/search'
			textSearch: @options.textSearch
			searchPath: @options.searchUrl
			token: token.get()
			textSearchOptions:
				textLayers: @options.textLayers
				searchInAnnotations: true
				searchInTranscriptions: true
			queryOptions:
				sortParameters: sortParameters
				resultRows: @resultRows
				resultFields: @options.levels
		@$('.faceted-search-placeholder').html @subviews.facetedSearch.el

		@listenTo @subviews.facetedSearch, 'unauthorized', => Backbone.history.navigate 'login', trigger: true

		@listenTo @subviews.facetedSearch, 'change:page', (responseModel) =>
			@subviews.searchResult.renderListItemsPage responseModel

			# Send the result to the parent view.
			@trigger 'change:results', responseModel

		@listenTo @subviews.facetedSearch, 'change:results', (responseModel) =>
			@renderResult responseModel

			# We check the flag to see if the editMultipleMetadata form was active when the results changed.
			if editMultipleMetadataActive
				console.log "TODO"
				# TODO Restore editMultipleMetadata form. Not easy because it is rerendered by result:change,
				# but we need it's state (filled in inputs, selected checkboxes, etc)

			# Send the result to the parent view.
			@trigger 'change:results', responseModel

	renderResult: (responseModel) ->
		unless @subviews.searchResult?
			@subviews.searchResult = new Views.SearchResult
				responseModel: responseModel
				levels: @options.levels
				entryMetadataFields: @options.entryMetadataFields
				resultRows: @resultRows
			@$('.resultview').html @subviews.searchResult.$el

			@listenTo @subviews.searchResult, 'change:sort-levels', (sortParameters) => 
				newQueryOptions =
					sortParameters: sortParameters
					resultFields: _.pluck(sortParameters, 'fieldname')

				@subviews.facetedSearch.refresh newQueryOptions
			@listenTo @subviews.searchResult, 'change:pagination', (pagenumber) => @subviews.facetedSearch.page pagenumber
			@listenTo @subviews.searchResult, 'navigate:entry', (id, terms, textLayer) => @trigger 'navigate:entry', id, terms, textLayer
			@listenTo @subviews.searchResult, 'check:entryListItem', (id) => @subviews.editMultipleEntryMetadata.activateSaveButton()
		else
			@subviews.searchResult.renderListItems responseModel

	# ### Events
	events:
		'change li.select-all input': (ev) -> Fn.checkCheckboxes '.entries input[type="checkbox"]', ev.currentTarget.checked, @el
		'change li.display-keywords input': (ev) -> if ev.currentTarget.checked then @$('.keywords').show() else @$('.keywords').hide()
		# TODO: Move change event to entry-list-item.coffee
		'change .entry input[type="checkbox"]': -> @subviews.editMultipleEntryMetadata.activateSaveButton()

	changePage: (ev) ->
		cl = ev.currentTarget.classList
		return if cl.contains 'inactive'

		@el.querySelector('li.prev').classList.remove 'inactive'
		@el.querySelector('li.next').classList.remove 'inactive'

		if cl.contains 'prev'
			@subviews.facetedSearch.prev()
		else if cl.contains 'next'
			@subviews.facetedSearch.next()


	# navToEntry: (ev) ->
	# 	# If edit multiple metadata is active, we don't navigate to the entry when it is clicked,
	# 	# instead a click toggles a checkbox which is used by edit multiple metadata.
	# 	placeholder = @el.querySelector('.editselection-placeholder')
	# 	return if placeholder? and placeholder.style.display is 'block'

	# 	entryID = ev.currentTarget.getAttribute 'data-id'
	# 	Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entryID}", trigger: true

	# ### Methods

	uncheckCheckboxes: -> Fn.checkCheckboxes '.entries input[type="checkbox"]', false, @el

	reset: -> @subviews.facetedSearch.reset()
	refresh: (queryOptions) -> @subviews.facetedSearch.refresh(queryOptions)

	toggleEditMultipleMetadata: ->
		# ul.entries is used twice so we define it on top.
		entries = $('div.entries')

		@$('.resultview').toggleClass 'edit-multiple-entry-metadata'

		editMultipleMetadataActive = @$('.resultview').hasClass 'edit-multiple-entry-metadata'

		# Class has been added, so we add the form
		if editMultipleMetadataActive		
			# Create the form.
			@subviews.editMultipleEntryMetadata = new Views.EditMultipleMetadata
				entryMetadataFields: @options.entryMetadataFields
				editMultipleMetadataUrl: @options.editMultipleMetadataUrl
			@$('.editselection-placeholder').html @subviews.editMultipleEntryMetadata.el
			
			# Add listeners.
			@listenToOnce @subviews.editMultipleEntryMetadata, 'close', => @toggleEditMultipleMetadata()
			@listenToOnce @subviews.editMultipleEntryMetadata, 'saved', (entryIds) => 
				@subviews.facetedSearch.reset()
				@trigger 'editmultipleentrymetadata:saved', entryIds
		# Class has been removed, so we remove the form
		else
			# Uncheck all checkboxes in the result list.
			Fn.checkCheckboxes null, false, entries[0]

			# Remove the form.
			@stopListening @subviews.editMultipleEntryMetadata
			@subviews.editMultipleEntryMetadata.destroy()

		# Resize result list, because result list height is dynamically calculated on render and the appearance
		# and removal of the edit multiple metadata form alters the top position of the result list.
		entries.height $(window).height() - entries.offset().top

module.exports = FacetedSearchResults
# TODO: cache search result

define (require) ->

	Fn = require 'helpers2/general'

	config = require 'config'
	token = require 'managers/token'

	Models =
		Search: require 'models/project/search'
		state: require 'models/state'

	Views =
		Base: require 'views/base'
		FacetedSearch: require 'faceted-search'

	Templates =
		Search: require 'text!html/project/search.html'
		Results: require 'text!html/project/search.results.html'

	class ProjectSearch extends Views.Base

		className: 'projectsearch'

		# ### Initialize
		initialize: ->
			super

			# The model of ProjectSearch holds the serverResponse generated by the FacetedSearch
			@model = new Models.Search()
			@listenTo @model, 'change', (model, options) =>
				# Reset the entries with the newly fetched results
				@project.get('entries').set model.get 'results'
				
				@updateHeader()
				@renderResult()
				

			Models.state.getCurrentProject (project) =>
				### console.log 'callback called' # FIX Callback is called twice on login! But initialize is only run once ###
				@project = project
				@render()

		# ### Render
		render: ->
			rtpl = _.template Templates.Search, @project.attributes
			@$el.html rtpl

			@facetedSearch = new Views.FacetedSearch
				el: @$('.faceted-search-placeholder')
				baseUrl: config.baseUrl
				searchPath: 'projects/'+@project.id+'/search'
				token: token.get()
				textSearchOptions:
					textLayers: @project.get 'textLayers'
					searchInAnnotations: true
					searchInTranscriptions: true
				queryOptions:
					resultRows: 12
			@listenTo @facetedSearch, 'results:change', (response, queryOptions) => 
				@model.queryOptions = queryOptions
				@model.set response

			@

		renderResult: ->
			rtpl = _.template Templates.Results, model: @model
			@$('ul.entries').html rtpl
			
			if @model.queryOptions.term? and @model.queryOptions.term isnt ''
				document.getElementById('cb_showkeywords').checked = true
				@$('.keywords').show()
			else 
				document.getElementById('cb_showkeywords').checked = false
				@$('.keywords').hide()

			@

		# ### Events
		events:
			'click li.entry label': 'goToEntry'
			'click .pagination li.prev': 'changePage'
			'click .pagination li.next': 'changePage'
			'click li[data-key="selectall"]': => Fn.checkCheckboxes '.entries input[type="checkbox"]', true, @el
			'click li[data-key="deselectall"]': => Fn.checkCheckboxes '.entries input[type="checkbox"]', false, @el
			'change #cb_showkeywords': 'toggleKeywords'

		toggleKeywords: (ev) ->
			if ev.currentTarget.checked then @$('.keywords').show() else @$('.keywords').hide()

		changePage: (ev) ->
			ct = $(ev.currentTarget)
			return if ct.hasClass 'inactive'

			$('.pagination li').removeClass 'inactive'

			if ct.hasClass 'prev'
				@facetedSearch.prev()
			else if ct.hasClass 'next'
				@facetedSearch.next()


		goToEntry: (ev) ->
			entryID = ev.currentTarget.getAttribute 'data-id'
			@project.get('entries').setCurrent entryID
			# id = ev.currentTarget.id.replace 'entry', ''
			@publish 'navigate:entry', entryID
			

		# ### Methods

		updateHeader: ->
			@$('h3.numfound').html @model.get('numFound') + ' letters found'
				
			currentpage = (@model.get('start') / @model.get('rows')) + 1
			pagecount = Math.ceil @model.get('numFound') / @model.get('rows')

			if pagecount > 1
				@$('.pagination li.prev').addClass 'inactive' if not @facetedSearch.hasPrev()
				@$('.pagination li.next').addClass 'inactive' if not @facetedSearch.hasNext()

				@$('.pagination li.currentpage').html currentpage
				@$('.pagination li.pagecount').html pagecount

				@$('.pagination').show()
			else
				@$('.pagination').hide()
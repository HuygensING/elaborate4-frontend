# TODO: cache search result

define (require) ->

	Fn = require 'hilib/functions/general'

	config = require 'config'
	token = require 'hilib/managers/token'

	# Models =
	# 	Search: require 'models/project/search'
		# state: require 'models/state'

	Collections = 
		projects: require 'collections/projects'

	Views =
		Base: require 'views/base'
		FacetedSearch: require 'faceted-search'
		Modal: require 'hilib/views/modal/main'
		EditSelection: require 'views/project/editselection'

	# Templates =
	# 	Search: require 'text!html/project/main.html'
	# 	Results: require 'text!html/project/results.html'

	tpls = require 'tpls'

	class ProjectSearch extends Views.Base

		className: 'projectsearch'

		# ### Initialize
		initialize: ->
			super

			Collections.projects.getCurrent (@project) => @render()

		# ### Render
		render: ->
			rtpl = tpls['project/main']
			@$el.html rtpl()

			# Render the EditSelection view. Is toggled in the menu and can be used
			# to edit the metadata of multiple entries at once.
			@editSelection = new Views.EditSelection
				el: @el.querySelector '.editselection-placeholder'
				model: @project
			@listenTo @editSelection, 'close', @uncheckCheckboxes

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
					resultRows: 50
			@listenTo @facetedSearch, 'unauthorized', => @publish 'unauthorized'
			@listenTo @facetedSearch, 'results:change', (responseModel, queryOptions) =>
				@project.get('entries').set responseModel.get 'results'
				@listenTo @project.get('entries'), 'current:change', (entry) =>
					Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entry.id}", trigger: true
				
				@renderHeader responseModel
				@renderResults responseModel, queryOptions

			@


		renderHeader: (responseModel) ->
			@el.querySelector('h3.numfound').innerHTML = responseModel.get('numFound') + ' entries found'
				
			currentpage = (responseModel.get('start') / responseModel.get('rows')) + 1
			pagecount = Math.ceil responseModel.get('numFound') / responseModel.get('rows')

			if pagecount > 1
				@$('.pagination li.prev').addClass 'inactive' unless @facetedSearch.hasPrev()
				@$('.pagination li.next').addClass 'inactive' unless @facetedSearch.hasNext()

				@$('.pagination li.currentpage').html currentpage
				@$('.pagination li.pagecount').html pagecount

				@$('.pagination').show()
			else
				@$('.pagination').hide()

		renderResults: (responseModel, queryOptions) ->
			rtpl = tpls['project/results']
				model: responseModel
				generateID: Fn.generateID
			@$('ul.entries').html rtpl
			
			if queryOptions.term? and queryOptions.term isnt ''
				document.getElementById('cb_showkeywords').checked = true
				@$('.keywords').show()
			else 
				document.getElementById('cb_showkeywords').checked = false
				@$('.keywords').hide()

			@

		# ### Events
		events:
			'click .submenu li[data-key="newsearch"]': -> @facetedSearch.reset()
			'click .submenu li[data-key="newentry"]': 'newEntry'
			'click .submenu li[data-key="editselection"]': 'showEditMetadata'
			'click .submenu li[data-key="publish"]': 'publishProject'
			'click li.entry label': 'changeCurrentEntry'
			'click .pagination li.prev': 'changePage'
			'click .pagination li.next': 'changePage'
			'click li[data-key="selectall"]': -> Fn.checkCheckboxes '.entries input[type="checkbox"]', true, @el
			'click li[data-key="deselectall"]': 'uncheckCheckboxes'
			'change #cb_showkeywords': (ev) -> if ev.currentTarget.checked then @$('.keywords').show() else @$('.keywords').hide()
			'change .entry input[type="checkbox"]': -> @editSelection.toggleInactive()

		publishProject: (ev) ->
			busyText = 'Publishing...'
			return false if ev.currentTarget.innerHTML is busyText
			ev.currentTarget.innerHTML = busyText
			ev.currentTarget.classList.add 'active'
			
			@project.createDraft =>
				ev.currentTarget.innerHTML = 'Publish'
				ev.currentTarget.classList.remove 'active'

		showEditMetadata: (ev) ->
			# show hide checkboxes
			# @$('.editselection-placeholder').toggle()

			editmetadataPlaceholder = @el.querySelector('.editselection-placeholder')

			visible = editmetadataPlaceholder.style.display is 'block'

			display = if visible then 'none' else 'block'
			opacity = if visible then 0 else 1

			editmetadataPlaceholder.style.display = display
			checkboxes = @el.querySelectorAll('ul.entries input[type="checkbox"]')
			cb.style.opacity = opacity for cb in checkboxes

			# When hiding edit metadata, reset (uncheck) all checkboxes
			Fn.checkCheckboxes null, false if visible

		newEntry: (ev) ->
			$html = $('<form><ul><li><label>Name</label><input type="text" name="name" /></li></ul></form>')

			modal = new Views.Modal
				title: "Create a new entry"
				$html: $html
				submitValue: 'Create entry'
				width: '300px'
			modal.on 'submit', =>
				entries = @project.get('entries')
				
				modal.message 'success', 'Creating new entry...'
				
				@listenToOnce entries, 'add', (entry) =>
					modal.close()
					@publish 'message', 'New entry added to project.'
					Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entry.id}", trigger: true

				entries.create {name: modal.$('input[name="name"]').val()}, wait: true

		changePage: (ev) ->
			cl = ev.currentTarget.classList
			return if cl.contains 'inactive'

			@el.querySelector('li.prev').classList.remove 'inactive'
			@el.querySelector('li.next').classList.remove 'inactive'

			if cl.contains 'prev'
				@facetedSearch.prev()
			else if cl.contains 'next'
				@facetedSearch.next()


		changeCurrentEntry: (ev) ->
			# Only change current entry if the edit metadata isn't active.
			unless @el.querySelector('.editselection-placeholder').style.display is 'block'
				entryID = ev.currentTarget.getAttribute 'data-id'
				@project.get('entries').setCurrent entryID
				# id = ev.currentTarget.id.replace 'entry', ''
			
			

		# ### Methods

		uncheckCheckboxes: -> Fn.checkCheckboxes '.entries input[type="checkbox"]', false, @el
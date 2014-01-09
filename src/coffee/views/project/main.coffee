define (require) ->

	Fn = require 'hilib/functions/general'
	viewManager = require 'hilib/managers/view2'
	dom = require 'hilib/functions/DOM'

	config = require 'config'
	token = require 'hilib/managers/token'

	currentUser = require 'models/currentUser'

	Entry = require 'models/entry'

	Collections = 
		projects: require 'collections/projects'

	Views =
		Base: require 'hilib/views/base'
		FacetedSearch: require 'faceted-search'
		Modal: require 'hilib/views/modal/main'
		Pagination: require 'hilib/views/pagination/main'
		EditSelection: require 'views/project/editselection'
		EntryListitem: require 'views/entry/listitem'

	tpls = require 'tpls'

	class ProjectMain extends Views.Base

		className: 'projectsearch'

		# ### Initialize
		initialize: ->
			super

			@resultRows = 50

			Collections.projects.getCurrent (@project) => @render()

		# ### Render
		render: ->
			rtpl = tpls['project/main']
				user: currentUser
				settings: @project.get('settings')
			@$el.html rtpl

			@renderFacetedSearch()

			# Check if a draft is in the process of being published.
			@pollDraft()

			@

		renderFacetedSearch: ->
			# @subviews.facetedSearch = new Views.FacetedSearch
			@subviews.facetedSearch = new Views.FacetedSearch
				baseUrl: config.baseUrl
				searchPath: 'projects/'+@project.id+'/search'
				token: token.get()
				textSearchOptions:
					textLayers: @project.get 'textLayers'
					searchInAnnotations: true
					searchInTranscriptions: true
				queryOptions:
					resultRows: @resultRows
			@$('.faceted-search-placeholder').html @subviews.facetedSearch.el

			@listenTo @subviews.facetedSearch, 'unauthorized', => Backbone.history.navigate 'login', trigger: true
			# # Render the header only on the first change of results (init), after that, the user will update
			# # the header when using pagination.
			# @listenToOnce @subviews.facetedSearch, 'results:change', (responseModel) => 
			@listenTo @subviews.facetedSearch, 'results:change', (responseModel) =>
				@project.resultSet = responseModel
				@renderHeader responseModel
				@renderResults responseModel

		renderHeader: (responseModel) ->
			@el.querySelector('h3.numfound').innerHTML = responseModel.get('numFound') + " #{@project.get('settings').get('entry.term_plural')} found"

			if @subviews.pagination?
				@stopListening @subviews.pagination
				@subviews.pagination.destroy()

			@subviews.pagination = new Views.Pagination
				start: responseModel.get('start')
				rowCount: @resultRows
				resultCount: responseModel.get('numFound')
			@listenTo @subviews.pagination, 'change:pagenumber', (pagenumber) => @subviews.facetedSearch.page pagenumber
			@$('.pagination').html @subviews.pagination.el

		renderResults: (responseModel) ->
			queryOptions = responseModel.options.queryOptions ? {}
			fulltext = queryOptions.term? and queryOptions.term isnt ''

			# Add the results to this project's entries.
			entries = @project.get('entries')
			entries.add responseModel.get('results')

			# Create a document fragment and append entry listitem views.
			frag = document.createDocumentFragment()
			for result in responseModel.get 'results'
				entry = entries.get result.id
				entry.project = @project

				entryListitem = new Views.EntryListitem
					model: entry
					fulltext: fulltext
				frag.appendChild entryListitem.el

			# Add the frag to the dom
			ulentries = @el.querySelector('ul.entries')
			ulentries.innerHTML = ''
			ulentries.appendChild frag
			ulentries.style.height = document.documentElement.clientHeight - dom(ulentries).position().top + 'px'

			# Toggle the display keywords checkbox and keywords per result.	
			document.getElementById('cb_showkeywords').checked = fulltext

			@

		# ### Events
		events:
			'click .submenu li[data-key="newsearch"]': -> @subviews.facetedSearch.reset()
			'click .submenu li[data-key="newentry"]': 'newEntry'
			'click .submenu li[data-key="editmetadata"]': 'toggleEditMultipleMetadata'
			'click .submenu li[data-key="publish"]': 'publishDraft' # Method is located under "Methods"
			# 'click li.entry label[data-id]': 'navToEntry'
			# 'click .pagination li.prev': 'changePage'
			# 'click .pagination li.next': 'changePage'
			'click li[data-key="selectall"]': -> Fn.checkCheckboxes '.entries input[type="checkbox"]', true, @el
			'click li[data-key="deselectall"]': 'uncheckCheckboxes'
			'change #cb_showkeywords': (ev) -> if ev.currentTarget.checked then @$('.keywords').show() else @$('.keywords').hide()
			'change .entry input[type="checkbox"]': -> @subviews.editMultipleEntryMetadata.toggleInactive()

		# Use IIFE to remember visibility.
		toggleEditMultipleMetadata: (ev) ->
			# ul.entries is used twice so we define it on top.
			entries = @el.querySelector('ul.entries')

			@$('.resultview').toggleClass 'edit-multiple-entry-metadata'

			# Class has been added, so we add the form
			if @$('.resultview').hasClass 'edit-multiple-entry-metadata'				
				# Create the form.
				@subviews.editMultipleEntryMetadata = new Views.EditSelection model: @project
				@$('.editselection-placeholder').html @subviews.editMultipleEntryMetadata.el
				
				# Add listeners.
				@listenToOnce @subviews.editMultipleEntryMetadata, 'close', => @toggleEditMultipleMetadata()
				@listenToOnce @subviews.editMultipleEntryMetadata, 'saved', => @subviews.facetedSearch.reset()
			# Class has been removed, so we remove the form
			else
				# Uncheck all checkboxes in the result list.
				Fn.checkCheckboxes null, false, entries

				# Remove the form.
				@stopListening @subviews.editMultipleEntryMetadata
				@subviews.editMultipleEntryMetadata.destroy()

			# Toggle visibility.
			visible = not visible

			# Resize result list, because result list height is dynamically calculated on render and the appearance
			# and removal of the edit multiple metadata form alters the top position of the result list.
			entries.style.height = document.documentElement.clientHeight - dom(entries).position().top + 'px'

		newEntry: (ev) ->
			modal = new Views.Modal
				title: "Create a new #{@project.get('settings').get('entry.term_singular')}"
				html: '<form><ul><li><label>Name</label><input type="text" name="name" /></li></ul></form>'
				submitValue: "Create #{@project.get('settings').get('entry.term_singular')}"
				width: '300px'
			modal.on 'submit', =>
				modal.message 'success', "Creating a new #{@project.get('settings').get('entry.term_singular')}..."
				
				# @listenToOnce entries, 'add', (entry) =>

				entry = new Entry
					name: modal.$('input[name="name"]').val()
				,
					projectID: @project.id

				entry.save [], 
					success: (model) =>
						# When we navigate, the current enty will change. This view listens to entries current:change and navigates
						# so we have to stop listening before we navigate and change the current entry.
						@stopListening()
						@project.get('entries').add model
						modal.close()
						@publish 'message', "New #{@project.get('settings').get('entry.term_singular')} added to project."
						Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entry.id}", trigger: true

				# entries.create {name: modal.$('input[name="name"]').val()}, wait: true

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

		destroy: ->
			@subviews.facetedSearch.remove()
			@remove()

		activatePublishDraftButton: ->
			busyText = 'Publishing draft...'
			button = @el.querySelector('li[data-key="publish"]')
			
			return false if button.innerHTML is busyText

			button.innerHTML = busyText
			button.classList.add 'active'

		deactivatePublishDraftButton: ->
			button = @el.querySelector('li[data-key="publish"]')
			button.innerHTML = 'Publish draft'
			button.classList.remove 'active'
			
		publishDraft: (ev) ->
			@activatePublishDraftButton()
			@project.publishDraft => @deactivatePublishDraftButton()

		# pollDraft is used to start polling when a draft is in the process of being published.
		# This can happen when a user refreshes the browser while the draft is not finished.
		pollDraft: ->
			locationUrl = localStorage.getItem 'publishDraftLocation'

			if locationUrl?
				@activatePublishDraftButton()
				@project.pollDraft locationUrl, => @deactivatePublishDraftButton()
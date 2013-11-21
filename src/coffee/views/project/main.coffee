# TODO: cache search result

define (require) ->

	Fn = require 'hilib/functions/general'
	viewManager = require 'hilib/managers/view'

	config = require 'config'
	token = require 'hilib/managers/token'

	# Models =
	# 	Search: require 'models/project/search'
		# state: require 'models/state'
	currentUser = require 'models/currentUser'

	# Tplzz = require 'text!hilib/views/modal/main.html'

	Entry = require 'models/entry'

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

			@resultRows = 50

			Collections.projects.getCurrent (@project) => @render()

		# ### Render
		render: ->
			rtpl = tpls['project/main'] user: currentUser
			@$el.html rtpl

			# Render the EditSelection view. Is toggled in the menu and can be used
			# to edit the metadata of multiple entries at once.
			@editSelection = viewManager.show @el.querySelector('.editselection-placeholder'),  Views.EditSelection,
				model: @project
			@listenTo @editSelection, 'close', @toggleEditMultipleMetadata

			# @facetedSearch = new Views.FacetedSearch
			@facetedSearch = viewManager.show @el.querySelector('.faceted-search-placeholder'), Views.FacetedSearch,
				baseUrl: config.baseUrl
				searchPath: 'projects/'+@project.id+'/search'
				token: token.get()
				textSearchOptions:
					textLayers: @project.get 'textLayers'
					searchInAnnotations: true
					searchInTranscriptions: true
				queryOptions:
					resultRows: @resultRows

			@listenTo @facetedSearch, 'unauthorized', => @publish 'unauthorized'
			@listenTo @facetedSearch, 'results:change', (responseModel, queryOptions) =>
				@project.get('entries').set responseModel.get 'results'
				@listenTo @project.get('entries'), 'current:change', (entry) =>
					Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entry.id}", trigger: true
				
				@renderHeader responseModel
				@renderResults responseModel, queryOptions

			# Check if a draft is in the process of being published.
			@pollDraft()

			@

		renderHeader: (responseModel) ->
			@el.querySelector('h3.numfound').innerHTML = responseModel.get('numFound') + ' entries found'
				
			currentpage = (responseModel.get('start') / @resultRows) + 1
			pagecount = Math.ceil responseModel.get('numFound') / @resultRows

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
			'click .submenu li[data-key="editselection"]': 'toggleEditMultipleMetadata'
			'click .submenu li[data-key="publish"]': 'publishDraft' # Method is located under "Methods"
			'click li.entry label[data-id]': 'changeCurrentEntry'
			'click .pagination li.prev': 'changePage'
			'click .pagination li.next': 'changePage'
			'click li[data-key="selectall"]': -> Fn.checkCheckboxes '.entries input[type="checkbox"]', true, @el
			'click li[data-key="deselectall"]': 'uncheckCheckboxes'
			'change #cb_showkeywords': (ev) -> if ev.currentTarget.checked then @$('.keywords').show() else @$('.keywords').hide()
			'change .entry input[type="checkbox"]': -> @editSelection.toggleInactive()

		toggleEditMultipleMetadata: (ev) ->
			@$('.resultview').toggleClass 'editmetadata'
			
			# Empty text inputs
			textInput.value = '' for textInput in @el.querySelectorAll('.editselection-placeholder form input[type="text"]')
				
			# Clear checkboxes
			Fn.checkCheckboxes null, false

			# return false
			# editmetadataPlaceholder = @el.querySelector('.editselection-placeholder')

			# visible = editmetadataPlaceholder.style.display is 'block'

			# display = if visible then 'none' else 'block'
			# opacity = if visible then 0 else 1

			# editmetadataPlaceholder.style.display = display
			# checkboxes = @el.querySelectorAll('ul.entries input[type="checkbox"]')
			# cb.style.opacity = opacity for cb in checkboxes

			# When hiding edit metadata, reset (uncheck) all checkboxes

		newEntry: (ev) ->
			$html = $('<form><ul><li><label>Name</label><input type="text" name="name" /></li></ul></form>')

			modal = new Views.Modal
				title: "Create a new entry"
				$html: $html
				submitValue: 'Create entry'
				width: '300px'
			modal.on 'submit', =>
				modal.message 'success', 'Creating new entry...'
				
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
						@publish 'message', 'New entry added to project.'
						Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entry.id}", trigger: true

				# entries.create {name: modal.$('input[name="name"]').val()}, wait: true

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
			placeholder = @el.querySelector('.editselection-placeholder')
			# Only change current entry if the edit metadata isn't active.
			# console.log placeholder?
			# console.log placeholder.style.display isnt 'block'
			return if placeholder? and placeholder.style.display is 'block'

			entryID = ev.currentTarget.getAttribute 'data-id'
			@project.get('entries').setCurrent entryID
				# id = ev.currentTarget.id.replace 'entry', ''
			
			

		# ### Methods

		uncheckCheckboxes: -> Fn.checkCheckboxes '.entries input[type="checkbox"]', false, @el

		destroy: ->
			@facetedSearch.remove()
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
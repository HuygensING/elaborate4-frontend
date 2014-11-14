Backbone = require 'backbone'

config = require 'elaborate-modules/modules/models/config'
currentUser = require '../../../models/currentUser'
projects = require '../../../collections/projects'

Entry = require '../../../models/entry'

Views =
	Base: require 'hilib/src/views/base'
	Modal: require 'hilib/src/views/modal'

tpl = require './submenu.jade'

class SearchSubmenu extends Views.Base

	className: 'submenu'

	# ### Initialize
	initialize: (@options) ->
		super

		@listenTo config, 'change:entryTermSingular', @render

		projects.getCurrent (@project) =>
			@render()

	# ### Render
	render: ->
		rtpl = tpl
			user: currentUser
			config: config
			projects: projects

		@$el.html rtpl

		# Check if a draft is in the process of being published.
		@pollDraft()

		@

	# The edit multiple metadata button can only function once the faceted search results
	# have been loaded. This method is called from this views parent after the first results are rendered.
	enableEditMetadataButton: -> @$('li[data-key="editmetadata"]').addClass 'enabled'

	# ### Events
	events: ->
		'click li[data-key="newsearch"]': -> @trigger 'newsearch'
		'click li[data-key="newentry"]': 'newEntry'
		'click li[data-key="save-edit-metadata"]:not(.inactive)': (ev) ->
			@trigger 'save-edit-metadata'
		'click li[data-key="cancel-edit-metadata"]': -> 
			@trigger 'cancel-edit-metadata'
		'click li[data-key="editmetadata"].enabled': -> 
			# console.log 'here'
			# Backbone.history.navigate "projects/#{@project.get('name')}/edit-metadata", trigger: true
			@trigger 'edit-metadata'
		'click li[data-key="delete"]': 'deleteProject'
		'click li[data-key="publish"]': 'publishDraft' # Method is located under "Methods"

	deleteProject: do ->
		modal = null

		(ev) ->
			return if modal?

			modal = new Views.Modal
				title: 'Caution!'
				html: "You are about to <b>REMOVE</b> project: \"#{@project.get('title')}\" <small>(id: #{@project.id})</small>.<br><br>All #{config.get('entryTermPlural')} will be <b>PERMANENTLY</b> removed!"
				submitValue: 'Remove project'
				width: 'auto'
			modal.on 'submit', => 
				@project.destroy
					wait: true
					success: =>
						modal.close()
						projects.setCurrent(projects.first().id)
						@publish 'message', "Removed #{@project.get('title')}."
			modal.on 'close', -> modal = null

	publishDraft: (ev) ->
		@activatePublishDraftButton()

		@project.publishDraft =>
			@deactivatePublishDraftButton()


	newEntry: (ev) ->
		modal = new Views.Modal
			title: "Create a new #{config.get('entryTermSingular')}"
			html: '<form><ul><li><label>Name</label><input type="text" name="name" /></li></ul></form>'
			submitValue: "Create #{config.get('entryTermSingular')}"
			width: '300px'
		modal.on 'submit', =>
			modal.message 'success', "Creating a new #{config.get('entryTermSingular')}..."
			
			# @listenToOnce entries, 'add', (entry) =>

			entry = new Entry
				name: modal.$('input[name="name"]').val()
			entry.project = @project
			# return console.log entry
			entry.save [], 
				success: (model) =>
					# When we navigate, the current enty will change. This view listens to entries current:change and navigates
					# so we have to stop listening before we navigate and change the current entry.
					@stopListening()
					@project.get('entries').add model
					modal.close()
					@publish 'faceted-search:refresh'
					@publish 'message', "New #{config.get('entryTermSingular')} added to project."
					Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entry.id}", trigger: true

			# entries.create {name: modal.$('input[name="name"]').val()}, wait: true

	# ### Methods
	activatePublishDraftButton: ->
		busyText = 'Publishing draft'
		button = @$('li[data-key="publish"]')
		
		span = button.find('span')
		return false if span.html() is busyText

		span.html busyText
		button.addClass 'active'

	deactivatePublishDraftButton: ->
		button = @el.querySelector('li[data-key="publish"]')
		button.innerHTML = 'Publish draft'
		button.classList.remove 'active'

	activateEditMetadataSaveButton: ->
		@$('li[data-key="save-edit-metadata"]').removeClass 'inactive'

	deactivateEditMetadataSaveButton: ->
		@$('li[data-key="save-edit-metadata"]').addClass 'inactive'

	# pollDraft is used to start polling when a draft is in the process of being published.
	# This can happen when a user refreshes the browser while the draft is not finished.
	pollDraft: ->
		locationUrl = localStorage.getItem 'publishDraftLocation'

		if locationUrl?
			@activatePublishDraftButton()
			@project.pollDraft locationUrl, => @deactivatePublishDraftButton()

module.exports = SearchSubmenu
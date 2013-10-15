define (require) ->

	Async = require 'hilib/managers/async'
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	# EntryMetadata is not a collection, it just reads and writes an array from and to the server.
	EntryMetadata = require 'entry.metadata'

	Views =
		Base: require 'views/base'
		SubMenu: require 'views/ui/settings.submenu'
		EditableList: require 'hilib/views/form/editablelist/main'
		ComboList: require 'hilib/views/form/combolist/main'
		Form: require 'hilib/views/form/main'

	Models =
		Statistics: require 'models/project/statistics'
		Settings: require 'models/project/settings'
		# state: require 'models/state'
		User: require 'models/user'

	Collections =
		projects: require 'collections/projects'
		AnnotationTypes: require 'collections/project/annotationtypes'
		ProjectUsers: require 'collections/project/users'
		AllUsers: require 'collections/users'

	Templates =
		Settings: require 'text!html/project/settings/main.html'
		# EntryMetadata: require 'text!html/project/metadata_entries.html'
		AnnotationTypes: require 'text!html/project/settings/metadata_annotations.html'
		AddUser: require 'text!html/project/settings/adduser.html'
	
	class ProjectSettings extends Views.Base

		className: 'projectsettings'

		# ### Initialize
		initialize: ->
			super

			Collections.projects.getCurrent (@project) =>
				@model = new Models.Settings null,
					projectID: @project.id
				@model.fetch success: => @render()

		# ### Render
		render: ->
			rtpl = _.template Templates.Settings, 
				settings: @model.attributes
				projectMembers: @project.get('users')
			@$el.html rtpl

			@renderSubMenu()

			@renderTabs()
			@loadStatistics()

			@showTab @options.tabName if @options.tabName

			@

		renderSubMenu: ->
			subMenu = new Views.SubMenu()
			@$el.prepend subMenu.$el

			@listenTo @model, 'change', => $('input[name="savesettings"]').removeClass 'inactive'
			# @listenTo subMenu, 'clicked', (menuItem) =>
			# 	if menuItem.key is 'save'
			# 		@model.save()
			# 		subMenu.setState 'save', 'inactive'

		renderTabs: ->
			# Entry metadata
			list = new Views.EditableList
				value: @project.get('entrymetadatafields')
			@listenTo list, 'change', (values) => new EntryMetadata(@project.id).save values
			@$('div[data-tab="metadata-entries"]').append list.el

			# Annotation types
			rtpl = _.template Templates.AnnotationTypes, annotationTypes: @project.get('annotationtypes')
			@$('div[data-tab="metadata-annotations"]').html rtpl

			# Users
			@allusers = new Collections.AllUsers()
			@allusers.fetch success: (collection) => @renderUserTab collection

		# * TODO: Add to separate view
		renderUserTab: (collection) ->
			combolist = new Views.ComboList
				value: @project.get 'users'
				config:
					data: collection
					settings:
						placeholder: 'Add new member'
			@listenTo combolist, 'change', (userIDs) => console.log userIDs

			@$('div[data-tab="users"] .userlist').append combolist.el

			form = new Views.Form
				Model: Models.User
				tpl: Templates.AddUser

			@listenTo form, 'save:success', (model, response, options) =>
				ajax.token = token.get()
				jqXHR = ajax.put
					url: "projects/#{@project.get('name')}/projectusers/#{model.id}"
					dataType: 'text'
				jqXHR.done => combolist.addSelected model
			@listenTo form, 'save:error', (a, b, c) => console.log 'erro', a, b, c

			@$('div[data-tab="users"] .adduser').append form.el

		# ### Events
		events:
			'click input[name="addannotationtype"]': 'addAnnotationType'
			'click li[data-tab]': 'showTab'
			'change div[data-tab="project"] input': 'updateModel'
			'change div[data-tab="project"] select': 'updateModel'
			'click input[name="savesettings"]': 'saveSettings'

		saveSettings: (ev) -> 
			ev.preventDefault()

			unless $(ev.currentTarget).hasClass 'inactive'
				@model.save null, success: => $(ev.currentTarget).addClass 'inactive'

		updateModel: (ev) -> @model.set ev.currentTarget.getAttribute('data-attr'), ev.currentTarget.value

		showTab: (ev) ->
			if _.isString ev
				tabName = ev
			else
				$ct = $(ev.currentTarget)
				tabName = $ct.attr('data-tab')
			
			# Change URL to reflect the new tab
			index = Backbone.history.fragment.indexOf '/settings'
			Backbone.history.navigate Backbone.history.fragment.substr(0, index) + '/settings/' + tabName

			@$(".active[data-tab]").removeClass 'active'
			@$("[data-tab='#{tabName}']").addClass 'active'


		addAnnotationType: (ev) ->
			ev.preventDefault()

			console.log 'NOT IMPLEMENTED'


		# ### Methods

		loadStatistics: ->
			start = new Date().getTime()

			stats = new Models.Statistics @project.id
			stats.fetch (data) =>
				str = JSON.stringify(data, null, 4)
				
				str = str.replace /{/g, ''
				str = str.replace /}/g, ''
				str = str.replace /\"/g, ''
				str = str.replace /,/g, ''

				end = new Date().getTime()
				delta = end - start

				if delta < 1000
					remaining = 1000 - delta
					setTimeout (=> 
						@$('img.loader').css 'visibility', 'hidden' # ! display: none does not work in Chrome
						@$('.statistics').html str
					), remaining

				

define (require) ->

	Async = require 'hilib/managers/async'
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
		# projects: require 'collections/projects'
		AnnotationTypes: require 'collections/project/annotation.types'
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

			@model = new Models.Settings null,
				projectID: Collections.projects.current.id
			@model.fetch
				success: => @render()
				error: => console.log 'Error fetching settings'

		# ### Render
		render: ->
			rtpl = _.template Templates.Settings, settings: @model.attributes
			@$el.html rtpl

			@renderSubMenu()

			@renderTabs()
			@loadStatistics()

			@showTab @options.tabName if @options.tabName

			@

		renderSubMenu: ->
			subMenu = new Views.SubMenu()
			@$el.prepend subMenu.$el

			@listenTo @model, 'change', => subMenu.setState 'save', 'active'
			@listenTo subMenu, 'clicked', (menuItem) =>
				if menuItem.key is 'save'
					@model.save()
					subMenu.setState 'save', 'inactive'

		renderTabs: ->
			# Entry metadata
			list = new Views.EditableList
				value: Collections.projects.current.get('entrymetadatafields')
			@listenTo list, 'change', (values) => @entryMetadata.save values
			@$('div[data-tab="metadata-entries"]').append list.el

			# Annotation types
			rtpl = _.template Templates.AnnotationTypes, annotationTypes: Collections.projects.current.get('annotationtypes')
			@$('div[data-tab="metadata-annotations"]').html rtpl

			# Users
			@allusers = new Collections.AllUsers()
			@allusers.fetch success: (collection) => @renderUserTab collection

		renderUserTab: (collection) ->
			combolist = new Views.ComboList
				value: Collections.projects.current.get 'users'
				config:
					data: collection
			@listenTo combolist, 'change', (userIDs) => console.log userIDs

			@$('div[data-tab="users"] .userlist').append combolist.el

			form = new Views.Form
				Model: Models.User
				tpl: Templates.AddUser

			@listenTo form, 'save:success', (model, response, options) =>
				combolist.addSelected model
			@listenTo form, 'save:error', (a, b, c) => console.log 'erro', a, b, c

			@$('div[data-tab="users"] .adduser').append form.el

		# ### Events
		events:
			'click input[name="addannotationtype"]': 'addAnnotationType'
			'click li[data-tab]': 'showTab'
			'change div[data-tab] input': (ev) -> @model.set ev.currentTarget.getAttribute('data-attr'), ev.currentTarget.value

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

			# console.log ev
			# @annotationTypes.create



		# ### Methods

		loadStatistics: ->
			start = new Date().getTime()

			stats = new Models.Statistics()
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

				

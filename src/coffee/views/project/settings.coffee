define (require) ->

	Async = require 'managers/async'

	Views =
		Base: require 'views/base'
		SubMenu: require 'views/ui/settings.submenu'

	Models =
		Statistics: require 'models/project/statistics'
		Settings: require 'models/project/settings'
		state: require 'models/state'

	Collections =
		Entries: require 'collections/project/metadata_entries'
		Annotations: require 'collections/project/metadata_annotations'
		ProjectUsers: require 'collections/project/users'
		AllUsers: require 'collections/users'

	Templates =
		Settings: require 'text!html/project/settings.html'
		Entries: require 'text!html/project/metadata_entries.html'
		Annotations: require 'text!html/project/metadata_annotations.html'
		Users: require 'text!html/project/users.html'
	
	class ProjectSettings extends Views.Base

		className: 'projectsettings'

		events:
			'click li[data-tab]': 'showTab'
			'change div[data-tab] input': (ev) -> @model.set ev.currentTarget.getAttribute('data-attr'), ev.currentTarget.value

		showTab: (ev) ->
			$ct = $(ev.currentTarget)
			tabName = $ct.attr('data-tab')

			@$(".active[data-tab]").removeClass 'active'
			@$("[data-tab='#{tabName}']").addClass 'active'

		initialize: ->
			super

			@model = new Models.Settings()

			Models.state.getCurrentProject (project) =>
				@project = project

				@model.fetch
					success: (model) => @render()
					error: => console.log 'Error fetching settings'

		render: ->
			rtpl = _.template Templates.Settings, settings: @model.attributes
			@$el.html rtpl

			@renderSubMenu()

			@loadTabData()
			@loadStatistics()

			@

		renderSubMenu: ->
			subMenu = new Views.SubMenu()
			@$el.prepend subMenu.$el

			@listenTo @model, 'change', => subMenu.setState 'save', 'active'
			@listenTo subMenu, 'clicked', (menuItem) =>
				if menuItem.key is 'save'
					@model.save()
					subMenu.setState 'save', 'inactive'

			# @subscribe 'submenu:save', @saveSettings

			# @publish 'submenu:render',
			# 	left: @$('.sub-menu-buttons .left').html()

			# $('header.main .sub .center').html @$('.sub-menu-buttons .center').html()
			# $('header.main .sub .right').html @$('.sub-menu-buttons .right').html()


		loadTabData: ->
			@entries = new Collections.Entries()
			@entries.fetch (data) =>
				rtpl = _.template Templates.Entries, entries: data
				@$('div[data-tab="metadata-entries"]').html rtpl

			@annotations = new Collections.Annotations()
			@annotations.fetch
				success: (collection, value, options) =>
					rtpl = _.template Templates.Annotations, annotations: collection
					@$('div[data-tab="metadata-annotations"]').html rtpl
				error: =>

			async = new Async ['projectusers', 'allusers']

			@projectusers = new Collections.ProjectUsers()
			@projectusers.fetch
				success: (collection, value, options) =>
					async.called 'projectusers', collection
				error: =>

			@allusers = new Collections.AllUsers()
			@allusers.fetch
				success: (collection, value, options) =>
					async.called 'allusers', collection
				error: =>

			async.on 'ready', (data) =>
				rtpl = _.template Templates.Users, data
				@$('div[data-tab="users"]').html rtpl
				
				console.log data

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

				

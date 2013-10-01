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
		state: require 'models/state'
		User: require 'models/user'

	Collections =
		AnnotationTypes: require 'collections/project/annotation.types'
		ProjectUsers: require 'collections/project/users'
		AllUsers: require 'collections/users'

	Templates =
		Settings: require 'text!html/project/settings.html'
		# EntryMetadata: require 'text!html/project/metadata_entries.html'
		AnnotationTypes: require 'text!html/project/metadata_annotations.html'
		AddUser: require 'text!html/project/adduser.html'
	
	class ProjectSettings extends Views.Base

		className: 'projectsettings'



		# ### Initialize
		initialize: ->
			super

			@model = new Models.Settings()

			Models.state.getCurrentProject (project) =>
				# @project = project
				@model.projectID = project.id
				@model.fetch
					success: => @render()
					error: => console.log 'Error fetching settings'

		# ### Render
		render: ->
			rtpl = _.template Templates.Settings, settings: @model.attributes
			@$el.html rtpl

			@renderSubMenu()

			@loadTabData()
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

			# @subscribe 'submenu:save', @saveSettings

			# @publish 'submenu:render',
			# 	left: @$('.sub-menu-buttons .left').html()

			# $('header.main .sub .center').html @$('.sub-menu-buttons .center').html()
			# $('header.main .sub .right').html @$('.sub-menu-buttons .right').html()


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

		loadTabData: ->
			@entryMetadata = new EntryMetadata @model.projectID
			@entryMetadata.fetch (data) =>
				list = new Views.EditableList
					value: data
				@listenTo list, 'change', (values) => @entryMetadata.save values
				@$('div[data-tab="metadata-entries"]').append list.el

			@annotationTypes = new Collections.AnnotationTypes [], projectId: @model.projectID
			@annotationTypes.fetch
				success: (collection, value, options) =>
					rtpl = _.template Templates.AnnotationTypes, annotationTypes: collection
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
				combolist = new Views.ComboList
					value: data.projectusers
					config:
						data: data.allusers
				@listenTo combolist, 'change', (userIDs) => console.log userIDs
				# rtpl = _.template Templates.Users, data
				@$('div[data-tab="users"] .userlist').append combolist.el

				form = new Views.Form
					Model: Models.User
					tpl: Templates.AddUser
				# @listenTo form, 'change', (a, b, c) => console.log 'cahnge', a, b, c
				@listenTo form, 'save:success', (model, response, options) =>
					combolist.addSelected model
				@listenTo form, 'save:error', (a, b, c) => console.log 'erro', a, b, c

				@$('div[data-tab="users"] .adduser').append form.el

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

				

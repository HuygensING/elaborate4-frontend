define (require) ->
	BaseView = require 'views/base'

	Models =
		currentUser: require 'models/currentUser'
		state: require 'models/state'

	Collections =
		projects: require 'collections/projects'

	# Views =
	# 	ProjectNav: require 'views/ui/nav.project'
	# 	UserNav: require 'views/ui/nav.user'

	Templates =
		Header: require 'text!html/ui/header.html'
	
	class Header extends BaseView

		tagName: 'header'

		className: 'main'

		# ### Events
		events:
			'click .user .logout': -> Models.currentUser.logout() 
			'click .user .project': 'setProject'
			'click .project .projecttitle': 'navigateToProject'
			'click .project .settings': 'navigateToProjectSettings'
			'click .project .search': 'navigateToProject'
			'click .project .history': 'navigateToProjectHistory'
			'click .message': -> @$('.message').removeClass 'active'

		navigateToProject: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}", trigger: true
		navigateToProjectSettings: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}/settings", trigger: true
		# navigateToProjectSearch: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}"
		navigateToProjectHistory: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}/history", trigger: true

			# 'click .sub li': (ev) -> @publish 'header:submenu:'+ev.currentTarget.getAttribute('data-id')

		initialize: ->
			super
			
			@listenTo Collections.projects, 'current:change', (project) => @render()

			Collections.projects.getCurrent (@project) =>

			@subscribe 'message', @showMessage, @

		# 	@listenToOnce Models.currentUser, 'authorized', @render

			# @subscribe 'header:renderSubmenu', @renderSubmenu

		# renderSubmenu: (menus) ->
		# 	@$('.sub .left').html menus.left
		# 	@$('.sub .center').html menus.center
		# 	@$('.sub .right').html menus.right

		render: ->
			rtpl = _.template Templates.Header, 
				projects: Collections.projects
				user: Models.currentUser.attributes
			@$el.html rtpl

			# projectNav = new Views.ProjectNav
			# 	managed: false
			# 	state: Models.state.attributes
			# userNav = new Views.UserNav managed: false

			# @$('nav.project').html projectNav.$el
			# @$('nav.user').html userNav.$el

			# @publish 'header:render:complete'

			@

		# ### Methods
		setProject: (ev) ->
			id = ev.currentTarget.getAttribute 'data-id'
			Collections.projects.setCurrent id
			# * TODO: navigate always when current changes? ie listener in router?
			# @publish 'navigate:project'

		showMessage: (msg) ->
			$message = @$('.message')
			$message.addClass 'active'
			$message.html msg

			timer = setTimeout (=>
				$message.removeClass 'active'
				clearTimeout timer
			), 5000
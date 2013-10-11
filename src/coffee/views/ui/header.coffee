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

		events:
			'click .user .logout': -> Models.currentUser.logout() 
			'click .user .project': 'setProject'
			'click .project .projecttitle': -> @publish 'navigate:project'
			'click .project .settings': -> @publish 'navigate:project:settings'
			'click .project .search': -> @publish 'navigate:project'
			'click .project .history': -> @publish 'navigate:project:history'
			# 'click .sub li': (ev) -> @publish 'header:submenu:'+ev.currentTarget.getAttribute('data-id')

		# initialize: ->
		# 	super
			
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
			@publish 'navigate:project'
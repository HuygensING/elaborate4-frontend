define (require) ->
	BaseView = require 'views/base'

	Models =
		currentUser: require 'models/currentUser'
		state: require 'models/state'

	Views =
		ProjectNav: require 'views/ui/nav.project'
		UserNav: require 'views/ui/nav.user'

	Templates =
		Header: require 'text!html/ui/header.html'
	
	class Header extends BaseView

		tagName: 'header'

		className: 'main'

		events:
			'click .projecttitle': -> @publish 'navigate:project'
			# 'click .sub li': (ev) -> @publish 'header:submenu:'+ev.currentTarget.getAttribute('data-id')

		initialize: ->
			super
			
			@listenTo Models.state, 'change:currentProject', @render

			@subscribe 'header:renderSubmenu', @renderSubmenu

		renderSubmenu: (menus) ->
			@$('.sub .left').html menus.left
			@$('.sub .center').html menus.center
			@$('.sub .right').html menus.right

		render: ->
			rtpl = _.template Templates.Header, state: Models.state.attributes
			@$el.html rtpl

			projectNav = new Views.ProjectNav managed: false
			userNav = new Views.UserNav managed: false

			@$('nav.project').html projectNav.$el
			@$('nav.user').html userNav.$el

			@publish 'header:render:complete'

			@
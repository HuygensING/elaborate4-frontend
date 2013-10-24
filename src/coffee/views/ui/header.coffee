define (require) ->
	BaseView = require 'views/base'

	config = require 'config'

	Fn = require 'hilib/functions/general'
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Models =
		currentUser: require 'models/currentUser'
		# state: require 'models/state'

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

		# ### Initialize
		initialize: ->
			super
			
			@listenTo Collections.projects, 'current:change', (@project) => @render()

			# Collections.projects.getCurrent (@project) =>

			@subscribe 'message', @showMessage, @

		# ### Events
		events:
			'click .user .logout': -> Models.currentUser.logout() 
			'click .user .project': 'setProject'
			'click .project .projecttitle': 'navigateToProject'
			'click .project .settings': 'navigateToProjectSettings'
			'click .project .search': 'navigateToProject'
			'click .project .history': 'navigateToProjectHistory'
			'click .project .publish': 'publishProject'
			'click .message': -> @$('.message').removeClass 'active'

		navigateToProject: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}", trigger: true
		navigateToProjectSettings: (ev) -> 
			console.log @project.get('name')
			Backbone.history.navigate "projects/#{@project.get('name')}/settings", trigger: true
		# navigateToProjectSearch: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}"
		navigateToProjectHistory: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}/history", trigger: true

		publishProject: (ev) ->
			busyText = 'Publishing...'
			return false if ev.currentTarget.innerHTML is busyText
			ev.currentTarget.innerHTML = busyText
			
			ajax.token = token.get()
			jqXHR = ajax.post
				url: config.baseUrl+"projects/#{@project.id}/publication"
				dataType: 'text'
			jqXHR.done => ajax.poll
				url: jqXHR.getResponseHeader('Location')
				testFn: (data) => data.done
				done: (data, textStatus, jqXHR) =>
					settings = @project.get('settings')
					settings.set 'publicationURL', data.url
					settings.save null,
						success: =>
							ev.currentTarget.innerHTML = 'Publish'
							@publish 'message', "Publication <a href='#{data.url}' target='_blank' data-bypass>ready</a>."
			jqXHR.fail => console.log arguments


			# 'click .sub li': (ev) -> @publish 'header:submenu:'+ev.currentTarget.getAttribute('data-id')

		# 	@listenToOnce Models.currentUser, 'authorized', @render

			# @subscribe 'header:renderSubmenu', @renderSubmenu

		# renderSubmenu: (menus) ->
		# 	@$('.sub .left').html menus.left
		# 	@$('.sub .center').html menus.center
		# 	@$('.sub .right').html menus.right

		# ### Render
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
			return false if msg.trim().length is 0

			$message = @$('.message')
			$message.addClass 'active' unless $message.hasClass 'active'
			$message.html msg

			Fn.timeoutWithReset 5000, (=> $message.removeClass 'active'), => 
				$message.addClass 'pulse'
				setTimeout (=> $message.removeClass 'pulse'), 1000
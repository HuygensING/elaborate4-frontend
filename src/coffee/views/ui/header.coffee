define (require) ->
	BaseView = require 'views/base'

	config = require 'config'

	Fn = require 'hilib/functions/general'
	StringFn = require 'hilib/functions/string'
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Models =
		currentUser: require 'models/currentUser'
		# state: require 'models/state'

	Collections =
		projects: require 'collections/projects'

	tpls = require 'tpls'
	
	class Header extends BaseView

		className: 'row span3'

		# ### Initialize
		initialize: ->
			super

			@project = @options.project

			@listenTo Collections.projects, 'current:change', (@project) =>	@render()

			@subscribe 'message', @showMessage, @

			@render()

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
		navigateToProjectHistory: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}/history", trigger: true

		# ### Render
		render: ->
			rtpl = tpls['ui/header']
				projects: Collections.projects
				user: Models.currentUser
				singular: StringFn.ucfirst @project.get('settings').get('entry.term_singular')
			@$el.html rtpl

			@

		# ### Methods
		setProject: (ev) ->
			id = ev.currentTarget.getAttribute 'data-id'
			Collections.projects.setCurrent id

		showMessage: (msg) ->
			return false if msg.trim().length is 0

			$message = @$('.message')
			$message.addClass 'active' unless $message.hasClass 'active'
			$message.html msg

			Fn.timeoutWithReset 5000, (=> $message.removeClass 'active'), => 
				$message.addClass 'pulse'
				setTimeout (=> $message.removeClass 'pulse'), 1000

		remove: ->
			console.log 'removing header'
			super
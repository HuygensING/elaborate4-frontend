define (require) ->
	BaseView = require 'views/base'

	Models =
		currentUser: require 'models/currentUser'
		state: require 'models/state'

	Templates =
		'UserNav': require 'text!html/ui/nav.user.html'
	
	class NavUser extends BaseView

		events:
			'click .logout': 'logout'
			'click .project': 'selectProject'

		selectProject: (ev) ->
			$ct = $(ev.currentTarget)
			$ct.addClass 'active'
			id = $ct.attr 'data-id'
			Models.state.setCurrentProject id
			@publish 'navigate:project'

		logout: (ev) ->
			Models.currentUser.logout()

		initialize: ->
			super
			
			@render()

		render: ->
			rtpl = _.template Templates.UserNav,
				user: Models.currentUser.attributes
				state: Models.state.attributes

			@$el.html rtpl

			@
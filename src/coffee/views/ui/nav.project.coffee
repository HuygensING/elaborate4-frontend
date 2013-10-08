define (require) ->
	BaseView = require 'views/base'

	Templates =
		'ProjectNav': require 'text!html/ui/nav.project.html'
	
	class ProjectNav extends BaseView

		events:
			'click .settings': -> @publish 'navigate:project:settings'
			'click .search': -> @publish 'navigate:project'
			'click .history': -> @publish 'navigate:project:history'
	
		initialize: ->
			super
			
			@render()

		render: ->
			rtpl = _.template Templates.ProjectNav, state: @options.state
			@$el.html rtpl

			@


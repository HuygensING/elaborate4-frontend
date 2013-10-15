define (require) ->
	BaseView = require 'views/base'

	# ajax = require 'hilib/managers/ajax'

	# Models =
	# 	state: require 'models/state'

	Collections =
		History: require 'collections/project/history'
		projects: require 'collections/projects'

	Templates =
		History: require 'text!html/project/history.html'
	
	class ProjectHistory extends BaseView

		className: 'projecthistory'

		initialize: ->
			super

			Collections.projects.getCurrent (project) =>
				@collection = new Collections.History [], projectID: project.id
				@collection.fetch success: => @render()

		render: ->
			rtpl = _.template Templates.History, logEntries: @collection.groupBy 'dateString'
			@$el.html rtpl

			@
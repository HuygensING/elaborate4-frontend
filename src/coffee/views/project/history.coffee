define (require) ->
	BaseView = require 'views/base'

	ajax = require 'managers/ajax'

	Models =
		state: require 'models/state'

	Collections =
		History: require 'collections/project/history'

	Templates =
		History: require 'text!html/project/history.html'
	
	class ProjectHistory extends BaseView

		className: 'projecthistory'

		initialize: ->
			super

			@collection = new Collections.History()

			Models.state.getCurrentProject (project) =>
				@collection.fetch
					success: => @render()

		render: ->
			rtpl = _.template Templates.History, collection: @collection
			@$el.html rtpl

			@
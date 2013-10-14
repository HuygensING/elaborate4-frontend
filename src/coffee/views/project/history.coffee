define (require) ->
	BaseView = require 'views/base'

	# ajax = require 'hilib/managers/ajax'

	# Models =
	# 	state: require 'models/state'

	Collections =
		History: require 'collections/project/history'

	Templates =
		History: require 'text!html/project/settings/history.html'
	
	class ProjectHistory extends BaseView

		className: 'projecthistory'

		initialize: ->
			super

			@collection = new Collections.History()

			@collection.fetch success: => @render()

		render: ->
			rtpl = _.template Templates.History, collection: @collection
			@$el.html rtpl

			@
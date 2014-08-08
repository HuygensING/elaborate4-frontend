BaseView = require 'hilib/src/views/base'

Models =
	Statistics: require '../../models/project/statistics'

Collections =
	projects: require '../../collections/projects'

tpl = require '../../../jade/project/statistics.jade'

class Statistics extends BaseView

	className: 'statistics'

	initialize: (@options) ->
		super			

		Collections.projects.getCurrent (@project) =>
			stats = new Models.Statistics null, projectID: @project.id
			stats.fetch success: (data) =>
				@statString = JSON.stringify(data, null, 4)
				
				@statString = @statString.replace /{/g, ''
				@statString = @statString.replace /}/g, ''
				@statString = @statString.replace /\"/g, ''
				@statString = @statString.replace /,/g, ''

				@render()

	# ### Render
	render: ->
		rtpl = tpl statistics: @statString
		@el.innerHTML = rtpl

		@

module.exports = Statistics
define (require) ->
	BaseView = require 'views/base'

	Models =
		Statistics: require 'models/project/statistics'

	Collections =
		projects: require 'collections/projects'

	tpls = require 'tpls'
	
	class Statistics extends BaseView

		className: 'statistics'

		initialize: ->
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
			rtpl = tpls['project/statistics'] statistics: @statString
			@el.innerHTML = rtpl

			@

		# loadStatistics: ->
		# 	start = new Date().getTime()


		# 		end = new Date().getTime()
		# 		delta = end - start

		# 		if delta < 1000
		# 			remaining = 1000 - delta
		# 			setTimeout (=> 
		# 				@$('img.loader').css 'visibility', 'hidden' # ! display: none does not work in Chrome
		# 				@$('.statistics').html str
		# 			), remaining
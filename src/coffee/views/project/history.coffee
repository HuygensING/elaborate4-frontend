define (require) ->
	BaseView = require 'views/base'

	# ajax = require 'hilib/managers/ajax'

	# Models =
	# 	state: require 'models/state'

	Collections =
		History: require 'collections/project/history'
		projects: require 'collections/projects'

	# Templates =
	# 	History: require 'text!html/project/history.html'

	tpls = require 'tpls'
	
	class ProjectHistory extends BaseView

		className: 'projecthistory'

		initialize: ->
			super

			@index = 0

			Collections.projects.getCurrent (@project) =>
				@all = new Collections.History @project.id
				@all.fetch (response) => 
					@historyChunks = []
					@historyChunks.push(response.splice(0, 500)) while response.length > 0

					@render()

		# ### Render
		render: ->
			# Hide the 'more' button when we are rendering the last chunk
			@el.querySelector('button.more').style.display = 'none' if @index+1 is @historyChunks.length
			# Get the next chunk
			chunk = @historyChunks[@index]
			# Add a dateString to every entry
			_.each chunk, (entry) -> entry.dateString = new Date(entry.createdOn).toDateString()
			# Group the entries by dateString
			chunks = _.groupBy(chunk, 'dateString')

			# Render the html with the logEntries
			rtpl = tpls['project/history'] logEntries: chunks
			@el.innerHTML = rtpl

			@


		# ### Events
		events: ->
			'click button.more': 'more'

		more: (ev) -> 
			@index++
			@renderEntries()


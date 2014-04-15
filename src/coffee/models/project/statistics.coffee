Backbone = require 'backbone'

config = require 'elaborate-modules/modules/models/config'
ajax = require 'hilib/src/managers/ajax'
# token = require 'hilib/src/managers/token'

Base = require '../base'

class ProjectStatistics extends Base

	url: -> "#{config.get('restUrl')}projects/#{@projectID}/statistics"

	initialize: (attrs, options) ->
		super

		@projectID = options.projectID

	sync: (method, model, options) ->
		if method is 'read'
			# ajax.token = token.get()
			jqXHR = ajax.get
				url: @url()
			jqXHR.done (response) => options.success response
			jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401
		else
			super method, model, options

module.exports = ProjectStatistics
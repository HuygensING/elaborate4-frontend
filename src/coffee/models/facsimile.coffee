define (require) ->

	ajax = require 'managers/ajax'
	token = require 'managers/token'

	config = require 'config'

	Models = 
		Base: require 'models/base'

	class Facsimile extends Models.Base

		defaults: ->
			name: ''
			filename: ''
			zoomableUrl: ''

		sync: (method, model, options) ->
			if method is 'create'
				ajax.token = token.get()
				jqXHR = ajax.post
					url: @url()
					dataType: 'text'
					data: JSON.stringify 
						name: model.get 'name'
						filename: model.get 'filename'
						zoomableUrl: model.get 'zoomableUrl'

				jqXHR.done (data, textStatus, jqXHR) =>
					if jqXHR.status is 201
						url = jqXHR.getResponseHeader('Location')

						xhr = ajax.get url: url
						xhr.done (data, textStatus, jqXHR) =>
							@trigger 'sync'
							options.success data

				jqXHR.fail (response) => console.log 'fail', response
			else
				super

		# defaults: ->
		# 	name: ''
		# 	publishable: false

		# parse: (attrs) ->
		# 	attrs.transcriptions = new Collections.Transcriptions([], entryId: attrs.id)

		# 	attrs
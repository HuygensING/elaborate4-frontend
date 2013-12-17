# @options
# 	fulltext	Boolean		Is the list a result of a fulltext search? Defaults to false.

define (require) ->
	Fn = require 'hilib/functions/general'

	Base = require 'views/base'

	# Tpl = require 'text!html/entry/metadata.html'
	tpls = require 'tpls'

	# ## EntryMetadata
	class EntryListitem extends Base

		# ### Initialize
		initialize: ->
			super

			@options.fulltext ?= false

			@render()

		# ### Render
		render: ->
			data = _.extend @options,
				entry: @model.toJSON()
				projectName: @model.project.get('name')
				generateID: Fn.generateID

			rtpl = tpls['entry/listitem'] data
			@$el.html rtpl

			@
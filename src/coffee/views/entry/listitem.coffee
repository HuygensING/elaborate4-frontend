# @options
# 	fulltext	Boolean		Is the list a result of a fulltext search? Defaults to false.

Fn = require 'hilib/src/utils/general'

Base = require 'hilib/src/views/base'

# Tpl = require 'text!html/entry/metadata.html'
tpl = require '../../../jade/entry/listitem.jade'

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

		rtpl = tpl data
		@$el.html rtpl

		@

module.exports = EntryListitem
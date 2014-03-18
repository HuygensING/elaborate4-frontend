Backbone = require 'backbone'

config = require '../../../config'

ajax = require 'hilib/src/managers/ajax'

# EntryMetadata is not a collection, it just reads and writes an array from and to the server.
EntryMetadata = require '../../../entry.metadata'

Views =
	Base: require 'hilib/src/views/base'
	EditableList: require 'hilib/src/views/form/editablelist/main'

tpl = require '../../../../jade/project/settings/entries.jade'
sortLevelsTpl = require '../../../../jade/project/settings/entries.sort-levels.jade'

class ProjectSettingsEntries extends Views.Base

	className: 'entries'

	initialize: ->
		super

		@project = @options.project

		@render()

	render: ->
		@el.innerHTML = tpl settings: @project.get('settings').attributes

		@renderSortLevels()

		EntryMetadataList = new Views.EditableList
			value: @project.get('entrymetadatafields')
			config:
				settings:
					placeholder: 'Add field'
					confirmRemove: true

		@listenTo EntryMetadataList, 'confirmRemove', (id, confirm) =>
			@trigger 'confirm', confirm,
				html: 'You are about to delete entry metadata field: '+id
				submitValue: 'Remove field '+id

		@listenTo EntryMetadataList, 'change', (values) =>
			new EntryMetadata(@project.id).save values,
				success: =>
					@project.set 'entrymetadatafields', values
					Backbone.trigger 'entrymetadatafields:update', values
					@publish 'message', 'Entry metadata fields updated.'
					@renderSortLevels()
		@$('.entrylist').append EntryMetadataList.el

		@

	renderSortLevels: ->
		@$('.sort-levels').html sortLevelsTpl
			level1: @project.get 'level1'
			level2: @project.get 'level2'
			level3: @project.get 'level3'
			entrymetadatafields: @project.get('entrymetadatafields')

	events: ->
		'click button.savesortlevels': 'saveSortLevels'
		'click .setnames form input[type="submit"]': 'submitSetCustomNames'
		'keyup .setnames form input[type="text"]': (ev) ->	@$('.setnames form input[type="submit"]').removeClass 'inactive'
		'change .sort-levels select': (ev) -> @$('.sort-levels form button').removeClass 'inactive'

	submitSetCustomNames: (ev) ->
		ev.preventDefault()

		@project.get('settings').set input.name, input.value for input in @el.querySelectorAll('.setnames form input[type="text"]')
		
		@trigger 'savesettings', ev

	saveSortLevels: (ev) ->
		ev.preventDefault()

		return if @$('.sort-levels form button').hasClass 'inactive'

		sortlevels = []
		sortlevels.push select.value for select in @$('.sort-levels select')

		jqXHR = ajax.put
			url: config.baseUrl + "projects/#{@project.id}/sortlevels"
			data: JSON.stringify sortlevels
		jqXHR.done =>
			# Update project attributes
			@project.set 'level1', sortlevels[0]
			@project.set 'level2', sortlevels[1]
			@project.set 'level3', sortlevels[2]

			@$('.sort-levels form button').addClass 'inactive'
			
			@publish 'message', 'Entry sort levels saved.'
			
			# Send message to project main view, so it can re-render the levels.
			Backbone.trigger 'sortlevels:update', sortlevels

module.exports = ProjectSettingsEntries
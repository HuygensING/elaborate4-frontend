Backbone = require 'backbone'

config = require '../../../models/config'

ajax = require 'hilib/src/managers/ajax'

# EntryMetadata is not a collection, it just reads and writes an array from and to the server.
EntryMetadata = require '../../../entry.metadata'

Views =
	Base: require 'hilib/src/views/base'
	EditableList: require 'hilib/src/views/form/editablelist/main'
	Form: require 'hilib/src/views/form/main'

tpl = require '../../../../jade/project/settings/entries.jade'
sortLevelsTpl = require '../../../../jade/project/settings/entries.sort-levels.jade'
setNamesTpl = require '../../../../jade/project/settings/entries.set-names.jade'

class ProjectSettingsEntries extends Views.Base

	className: 'entries'

	initialize: (@options) ->
		super

		@project = @options.project

		@render()

	render: ->
		@el.innerHTML = tpl settings: @project.get('settings').attributes

		@renderSetNames()

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
		@$('.entry-list').append EntryMetadataList.el

		@

	renderSetNames: ->
		setNamesForm = new Views.Form
			tpl: setNamesTpl
			model: @project.get('settings')
			validationAttributes: ['entry.term_singular', 'entry.term_plural']

		@listenTo setNamesForm, 'save:success', (model) => 
			# Update the config.
			config.set 'entryTermSingular', model.get 'entry.term_singular'
			config.set 'entryTermPlural', model.get 'entry.term_plural'

			# Show message.
			Backbone.trigger 'message', 'Entries names saved.'

		@$('.set-names').html setNamesForm.el

	renderSortLevels: ->
		@$('.sort-levels').html sortLevelsTpl
			level1: @project.get 'level1'
			level2: @project.get 'level2'
			level3: @project.get 'level3'
			entrymetadatafields: @project.get('entrymetadatafields')

	events: ->
		'click button.savesortlevels': 'saveSortLevels'
		'click .set-names form input[type="submit"]': 'submitSetCustomNames'
		'keyup .set-names form input[type="text"]': (ev) ->	@$('.set-names form input[type="submit"]').removeClass 'inactive'
		'change .sort-levels select': (ev) -> @$('.sort-levels form button').removeClass 'inactive'

	submitSetCustomNames: (ev) ->
		ev.preventDefault()

		@project.get('settings').set input.name, input.value for input in @el.querySelectorAll('.set-names form input[type="text"]')
		
		@trigger 'savesettings', ev

	saveSortLevels: (ev) ->
		ev.preventDefault()

		return if @$('.sort-levels form button').hasClass 'inactive'

		sortlevels = []
		sortlevels.push select.value for select in @$('.sort-levels select')

		@$('button.savesortlevels').addClass 'loading'

		jqXHR = ajax.put
			url: "#{config.get('restUrl')}projects/#{@project.id}/sortlevels"
			data: JSON.stringify sortlevels
		jqXHR.done =>
			@$('button.savesortlevels').removeClass 'loading'
			# Update project attributes
			@project.set 
				level1: sortlevels[0]
				level2: sortlevels[1]
				level3: sortlevels[2]

			@$('.sort-levels form button').addClass 'inactive'
			
			@publish 'message', 'Entry sort levels saved.'
			
			# Send message to project main view, so it can re-render the levels.
			# Backbone.trigger 'sortlevels:update', sortlevels
		jqXHR.fail =>
			@$('button.savesortlevels').removeClass 'loading'


module.exports = ProjectSettingsEntries
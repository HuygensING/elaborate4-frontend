Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'

Fn = require 'hilib/src/utils/general'
StringFn = require 'hilib/src/utils/string'
Async = require 'hilib/src/managers/async'

config = require '../../models/config'

Base = require 'hilib/src/views/base'

# Tpl = require 'text!html/entry/metadata.html'
tpl = require '../../../jade/entry/main.submenu.jade'
metadataTpl = require '../../../jade/entry/metadata.jade'

Views =
	Form: require 'hilib/src/views/form/main'
	Modal: require 'hilib/src/views/modal'

# ## EntryMetadata
class EntrySubmenu extends Base

	className: 'submenu'

	# ### Initialize
	initialize: (@options) ->
		super()

		{@entry, @user, @project} = @options

		# @render is called from parent (entry.renderTranscriptionEditor)

	# ### Render
	render: ->
		rtpl = tpl
			entry: @entry
			user: @user
		@$el.html rtpl

		@entry.setPrevNext =>
			# prevID and nextID are set on the model.
			@activatePrevNext()

		@

	events: ->
		'click .menu li.active[data-key="previous"]': '_goToPreviousEntry'
		'click .menu li.active[data-key="next"]': '_goToNextEntry'
		'click .menu li[data-key="delete"]': 'deleteEntry'
		'click .menu li[data-key="metadata"]': 'editEntryMetadata'
		'click .menu li[data-key="facsimiles"] li[data-key="facsimile"]': 'changeFacsimile'

	changeFacsimile: (ev) ->
		# Remove reference to any entry-left-preview, so when the user navigates to prev/next entry
		# the left pane will show the facsimile and not a transcription.
		config.set 'entry-left-preview', null

		# Check if ev is an Event, else assume ev is an ID
		facsimileID = if ev.hasOwnProperty 'target' then ev.currentTarget.getAttribute 'data-value' else ev

		@$('.left-menu .facsimiles li.active').removeClass('active')
		@$('.left-menu .textlayers li.active').removeClass('active')
		@$('.left-menu .facsimiles li[data-value="'+facsimileID+'"]').addClass('active')

		newFacsimile = @entry.get('facsimiles').get facsimileID
		@entry.get('facsimiles').setCurrent newFacsimile if newFacsimile?

	activatePrevNext: ->
		if @entry.prevID?
			@$('li[data-key="previous"]').addClass 'active'

		if @entry.nextID?
			@$('li[data-key="next"]').addClass 'active' 

	_goToPreviousEntry: ->
		projectName = @entry.project.get('name')
		transcription = StringFn.slugify @entry.get('transcriptions').current.get 'textLayer'

		Backbone.history.navigate "projects/#{projectName}/entries/#{@entry.prevID}/transcriptions/#{transcription}", trigger: true

	_goToNextEntry: ->
		projectName = @entry.project.get('name')
		transcription = StringFn.slugify @entry.get('transcriptions').current.get 'textLayer'

		Backbone.history.navigate "projects/#{projectName}/entries/#{@entry.nextID}/transcriptions/#{transcription}", trigger: true

	deleteEntry: do ->
		modal = null

		(ev) ->
			return if modal?

			modal = new Views.Modal
				title: 'Caution!'
				html: "You are about to <b>REMOVE</b> entry: \"#{@entry.get('name')}\" <small>(id: #{@entry.id})</small>.<br><br>All text and annotations will be <b>PERMANENTLY</b> removed!"
				submitValue: 'Remove entry'
				width: 'auto'
			modal.on 'submit', =>
				jqXHR = @entry.destroy()
				jqXHR.done =>
					modal.close()
					@publish 'faceted-search:refresh'
					@publish 'message', "Removed entry #{@entry.id} from project."
					Backbone.history.navigate "projects/#{@project.get('name')}", trigger: true
			modal.on 'close', -> modal = null


	editEntryMetadata: do ->
		# Create a reference to the modal, so we can check if a modal is active.
		modal = null

		(ev) ->
			return if modal?

			entryMetadata = new Views.Form
				tpl: metadataTpl
				tplData:
					user: @user
					# Pass the entrymetadatafields array to keep the same order/sequence as is used on the settings page.
					entrymetadatafields: @project.get('entrymetadatafields')
					generateID: Fn.generateID
				model: @entry.clone()

			modal = new Views.Modal
				title: "Edit #{config.get('entryTermSingular')} metadata"
				html: entryMetadata.el
				submitValue: 'Save metadata'
				width: '50vw'
				customClassName: 'entry-metadata'

			modal.on 'submit', =>
				@entry.updateFromClone entryMetadata.model

				async = new Async ['entry', 'settings']
				@listenToOnce async, 'ready', =>
					# TODO metadata changed!
					modal.close()
					@publish 'message', "Saved metadata for entry: #{@entry.get('name')}."

				@entry.get('settings').save null, success: ->  async.called 'settings'
				@entry.save null, success: -> async.called 'entry'

			modal.on 'close', ->
				modal = null
				$('.entry-metadata form.hilib textarea').off 'keydown', @adjustTextareaHeight

			$('.entry-metadata form.hilib textarea').each (i, te) => @adjustTextareaHeight te
			$('.entry-metadata form.hilib textarea').on 'keydown', @adjustTextareaHeight

	adjustTextareaHeight: (ev) ->
		target = if ev.hasOwnProperty 'currentTarget' then ev.currentTarget else ev

		target.style.height = '24px'
		target.style.height = target.scrollHeight + 12 + 'px'

module.exports = EntrySubmenu

Backbone = require 'backbone'
_ = require 'underscore'

Fn = require 'hilib/src/utils/general'
StringFn = require 'hilib/src/utils/string'
Async = require 'hilib/src/managers/async'

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
	initialize: ->
		super

		{@entry, @user, @project} = @options

	# ### Render
	render: ->
		rtpl = tpl
			entry: @entry
			user: @user
		@$el.html rtpl

		if @project.resultSet?
			@entry.setPrevNext => @activatePrevNext()
		else
			unless @entry.prevID? and @entry.nextID?
				@entry.fetchPrevNext => @activatePrevNext()
					
		@

	events: ->
		'click .menu li.active[data-key="previous"]': 'previousEntry'
		'click .menu li.active[data-key="next"]': 'nextEntry'
		'click .menu li[data-key="print"]': 'printEntry'
		'click .menu li[data-key="delete"]': 'deleteEntry'
		'click .menu li[data-key="metadata"]': 'editEntryMetadata'

	activatePrevNext: ->
		@$('li[data-key="previous"]').addClass 'active' if @entry.prevID > 0
		@$('li[data-key="next"]').addClass 'active' if @entry.nextID > 0

	previousEntry: ->
		projectName = @entry.project.get('name')
		transcription = StringFn.slugify @entry.get('transcriptions').current.get 'textLayer'

		Backbone.history.navigate "projects/#{projectName}/entries/#{@entry.prevID}/transcriptions/#{transcription}", trigger: true

	nextEntry: ->
		projectName = @entry.project.get('name')
		transcription = StringFn.slugify @entry.get('transcriptions').current.get 'textLayer'

		Backbone.history.navigate "projects/#{projectName}/entries/#{@entry.nextID}/transcriptions/#{transcription}", trigger: true

	# When the user wants to print we create a div#printpreview directly under <body> and show
	# a clone of the preview body and an ordered list of the annotations.
	printEntry: (ev) ->
		pp = document.querySelector('#printpreview')
		pp.parentNode.removeChild pp if pp?

		currentTranscription = @entry.get('transcriptions').current
		annotations = currentTranscription.get('annotations')

		mainDiv = document.createElement('div')
		mainDiv.id = 'printpreview'

		h1 = document.createElement('h1')
		h1.innerHTML = 'Preview entry: ' + @entry.get('name')

		h2 = document.createElement('h2')
		h2.innerHTML = 'Project: '+ @project.get('title')

		mainDiv.appendChild h1
		mainDiv.appendChild h2
		mainDiv.appendChild document.querySelector('.preview').cloneNode true

		ol = document.createElement('ol')
		ol.className = 'annotations'
		
		sups = document.querySelectorAll('sup[data-marker="end"]')
		_.each sups, (sup) =>
			annotation = annotations.findWhere annotationNo: +sup.getAttribute('data-id')
			
			li = document.createElement('li')
			li.innerHTML = annotation.get('body')
			
			ol.appendChild li

		h2 = document.createElement('h2')
		h2.innerHTML = 'Annotations'

		mainDiv.appendChild h2
		mainDiv.appendChild ol

		document.body.appendChild mainDiv

		window.print()

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
				title: "Edit #{@project.get('settings').get('entry.term_singular')} metadata"
				html: entryMetadata.el
				submitValue: 'Save metadata'
				width: '500px'
			modal.on 'submit', =>
				@entry.updateFromClone entryMetadata.model

				async = new Async ['entry', 'settings']
				@listenToOnce async, 'ready', => 
					modal.close()
					@publish 'message', "Saved metadata for entry: #{@entry.get('name')}."

				@entry.get('settings').save null, success: ->  async.called 'settings'
				@entry.save null, success: -> async.called 'entry'
			modal.on 'close', -> modal = null

module.exports = EntrySubmenu
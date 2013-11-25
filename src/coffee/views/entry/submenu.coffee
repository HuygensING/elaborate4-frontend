# Description...
define (require) ->
	Fn = require 'hilib/functions/general'
	StringFn = require 'hilib/functions/string'

	Base = require 'views/base'

	# Tpl = require 'text!html/entry/metadata.html'
	tpls = require 'tpls'

	Views =
		Form: require 'hilib/views/form/main'
		Modal: require 'hilib/views/modal/main'

	# ## EntryMetadata
	class EntrySubmenu extends Base

		className: 'submenu'

		# ### Initialize
		initialize: ->
			super

			{@entry, @user, @project} = @options

			@render()

		# ### Render
		render: ->
			rtpl = tpls['entry/submenu']
				entry: @entry
				user: @user
			@$el.html rtpl

			@

		events: ->
			'click .menu li[data-key="previous"]': 'previousEntry'
			'click .menu li[data-key="next"]': 'nextEntry'
			'click .menu li[data-key="metadata"]': 'editEntryMetadata'
			'click .menu li[data-key="print"]': 'printEntry'

		previousEntry: ->
			# @entry.collection.previous() returns an entry model
			entryID = @entry.collection.previous().id
			currentTranscription = @entry.get('transcriptions').current
			textLayer = StringFn.slugify currentTranscription.get 'textLayer'

			Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entryID}/transcriptions/#{textLayer}", trigger: true

		nextEntry: ->
			entryID = @entry.collection.next().id
			currentTranscription = @entry.get('transcriptions').current
			textLayer = StringFn.slugify currentTranscription.get 'textLayer'

			Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entryID}/transcriptions/#{textLayer}", trigger: true

		editEntryMetadata: do ->
			# Create a reference to the modal, so we can check if a modal is active.
			modal = null

			(ev) ->
				console.log modal
				return if modal?

				entryMetadata = new Views.Form
					tpl: tpls['entry/metadata']
					tplData:
						user: @user
					model: @entry.clone()

				modal = new Views.Modal
					title: "Edit #{@project.get('settings').get('entry.term_singular')} metadata"
					html: entryMetadata.el
					submitValue: 'Save metadata'
					width: '300px'
				modal.on 'submit', =>
					@entry.updateFromClone entryMetadata.model

					async = new Async ['entry', 'settings']
					@listenToOnce async, 'ready', => 
						modal.close()
						@publish 'message', "Saved metadata for entry: #{@entry.get('name')}."

					@entry.get('settings').save null, success: ->  async.called 'settings'
					@entry.save null, success: -> async.called 'entry'
				modal.on 'close', -> modal = null

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
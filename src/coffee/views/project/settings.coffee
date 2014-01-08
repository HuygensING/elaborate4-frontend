define (require) ->

	config = require 'config'
	Async = require 'hilib/managers/async'
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	# EntryMetadata is not a collection, it just reads and writes an array from and to the server.
	EntryMetadata = require 'entry.metadata'

	Views =
		Base: require 'hilib/views/base'
		# SubMenu: require 'views/ui/settings.submenu'
		EditableList: require 'hilib/views/form/editablelist/main'
		ComboList: require 'hilib/views/form/combolist/main'
		Form: require 'hilib/views/form/main'
		Modal: require 'hilib/views/modal/main'
		TextlayersTab: require 'views/project/settings.textlayers'
		EntriesTab: require 'views/project/settings.entries'

	Models =
		Statistics: require 'models/project/statistics'
		Settings: require 'models/project/settings'
		# state: require 'models/state'
		User: require 'models/user'
		Annotationtype: require 'models/project/annotationtype'

	Collections =
		projects: require 'collections/projects'
		AnnotationTypes: require 'collections/project/annotationtypes'
		ProjectUsers: require 'collections/project/users'
		Users: require 'collections/users'

	ProjectUserIDs = require 'project.user.ids'

	tpls = require 'tpls'
	
	class ProjectSettings extends Views.Base

		className: 'projectsettings'

		# ### Initialize
		initialize: ->
			super

			Collections.projects.getCurrent (@project) =>
				@model = @project.get 'settings'
				@render()

		# ### Render
		render: ->
			rtpl = tpls['project/settings/main']
				settings: @model.attributes
				projectMembers: @project.get('members')
			@$el.html rtpl

			@renderUserTab()
			@renderEntriesTab()
			@renderTextlayersTab()
			@renderAnnotationsTab()

			@showTab @options.tabName if @options.tabName

			@

			@listenTo @model, 'change', => @$('input[name="savesettings"]').removeClass 'inactive'

		renderEntriesTab: ->
			entriesTab = new Views.EntriesTab
				project: @project

			@listenTo entriesTab, 'confirm', @renderConfirmModal
			@listenTo entriesTab, 'savesettings', @saveSettings

			@$('div[data-tab="entries"]').html entriesTab.el

		renderTextlayersTab: ->
			textlayersTab = new Views.TextlayersTab
				project: @project

			@listenTo textlayersTab, 'confirm', @renderConfirmModal

			@$('div[data-tab="textlayers"]').html textlayersTab.el

		# * TODO: Add to separate view
		renderAnnotationsTab: ->
			annotationTypes = @project.get 'annotationtypes'

			combolist = new Views.ComboList
				value: annotationTypes
				config:
					data: @project.allannotationtypes
					settings:
						placeholder: 'Add annotation type'
						confirmRemove: true
			@$('div[data-tab="annotationtypes"] .annotationtypelist').append combolist.el

			form = new Views.Form
				Model: Models.Annotationtype
				tpl: tpls['project/settings/addannotationtype']
			@$('div[data-tab="annotationtypes"] .addannotationtype').append form.el

			@listenTo combolist, 'confirmRemove', (id, confirm) =>
				@renderConfirmModal confirm,
					title: 'Caution!'
					html: "You are about to <b>remove</b> annotation type: #{annotationTypes.get(id).get('title')}.<br><br>All annotations of type #{annotationTypes.get(id).get('title')} will be <b>permanently</b> removed!"
					submitValue: 'Remove annotation type'

			@listenTo combolist, 'change', (changes) =>
				if changes.added?
					annotationType = changes.collection.get changes.added
					@project.addAnnotationType annotationType, =>
						@publish 'message', "Added #{annotationType.get('name')} to #{@project.get('title')}."
				else if changes.removed?
					name = @project.allannotationtypes.get(changes.removed).get('name')
					@project.removeAnnotationType changes.removed, =>
						@publish 'message', "Removed #{name} from #{@project.get('title')}."
				
			@listenTo form, 'save:success', (model) => @project.get('annotationtypes').add model
			@listenTo form, 'save:error', (model, xhr, options) => @publish 'message', xhr.responseText

		# * TODO: Add to separate view
		renderUserTab: ->
			members = @project.get 'members'
			combolist = new Views.ComboList
				value: members
				config:
					data: @project.allusers
					settings:
						placeholder: 'Add member'
						confirmRemove: true
			@$('div[data-tab="users"] .userlist').append combolist.el

			form = new Views.Form
				Model: Models.User
				tpl: tpls['project/settings/adduser']
			@$('div[data-tab="users"] .adduser').append form.el

			@listenTo combolist, 'confirmRemove', (id, confirm) =>
				@renderConfirmModal confirm,
					html: 'You are about to remove <u>'+members.get(id).get('title')+'</u> from your project.'
					submitValue: 'Remove user'
			@listenTo combolist, 'change', (changes) =>
				if changes.added?
					userAttrs = _.findWhere changes.selected, id: changes.added
					user = new Models.User userAttrs
					@project.addUser user, => @publish 'message', "Added #{user.getShortName()} to #{@project.get('title')}."
				else if changes.removed?
					user = @project.allusers.get changes.removed
					shortName = user.getShortName()
					@project.removeUser changes.removed, =>
						@publish 'message', "Removed #{shortName} from #{@project.get('title')}."


			@listenTo form, 'save:success', (model) => @project.get('members').add model
			@listenTo form, 'save:error', (model, xhr, options) => @publish 'message', xhr.responseText

		renderConfirmModal: (confirm, options) ->
			modal = new Views.Modal _.extend options, width: 'auto'
			modal.on 'submit', => 
				modal.close()
				confirm()

		# ### Events
		events:
			# 'click input[name="addannotationtype"]': 'addAnnotationType'
			'click li[data-tab]': 'showTab'
			'keyup div[data-tab="project"] input': -> @$('input[name="savesettings"]').removeClass 'inactive'
			'change div[data-tab="project"] input': 'updateModel'
			'change div[data-tab="project"] select': 'updateModel'
			'click input[name="savesettings"]': 'saveSettings'

		saveSettings: (ev) -> 
			ev.preventDefault()

			unless $(ev.currentTarget).hasClass 'inactive'
				@model.save null, success: => 
					$(ev.currentTarget).addClass 'inactive'
					@publish 'message', 'Settings saved.'

		updateModel: (ev) -> @model.set ev.currentTarget.getAttribute('data-attr'), ev.currentTarget.value

		showTab: (ev) ->
			if _.isString ev
				tabName = ev
			else
				$ct = $(ev.currentTarget)
				tabName = $ct.attr('data-tab')
			
			# Change URL to reflect the new tab
			index = Backbone.history.fragment.indexOf '/settings'
			Backbone.history.navigate Backbone.history.fragment.substr(0, index) + '/settings/' + tabName

			@$(".active[data-tab]").removeClass 'active'
			@$("[data-tab='#{tabName}']").addClass 'active'


		# addAnnotationType: (ev) ->
		# 	ev.preventDefault()

		# 	name = @el.querySelector('input[name="annotationname"]').value
		# 	description = @el.querySelector('input[name="annotationdescription"]').value
		# 	if name? and name isnt ''
		# 		ajax.token = token.get()
		# 		jqXHR = ajax.post
		# 			url: config.baseUrl+"annotationtypes"
		# 			# dataType: 'text'
		# 		jqXHR.done =>
		# 			console.log 'done!'


		# ### Methods



				

define (require) ->

	config = require 'config'
	Async = require 'hilib/managers/async'
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	# EntryMetadata is not a collection, it just reads and writes an array from and to the server.
	EntryMetadata = require 'entry.metadata'

	Views =
		Base: require 'views/base'
		# SubMenu: require 'views/ui/settings.submenu'
		EditableList: require 'hilib/views/form/editablelist/main'
		ComboList: require 'hilib/views/form/combolist/main'
		Form: require 'hilib/views/form/main'
		Modal: require 'hilib/views/modal/main'

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

	# Templates =
	# 	Settings: require 'text!html/project/settings/main.html'
	# 	# EntryMetadata: require 'text!html/project/metadata_entries.html'
	# 	AnnotationTypes: require 'text!html/project/settings/metadata_annotations.html'
	# 	AddUser: require 'text!html/project/settings/adduser.html'

	tpls = require 'tpls'
	
	class ProjectSettings extends Views.Base

		className: 'projectsettings'

		# ### Initialize
		initialize: ->
			super

			Collections.projects.getCurrent (@project) =>
				@model = @project.get 'settings'
				@render()
				# async = new Async ['annotationtypes', 'users']
				# async.on 'ready', => @render()

				# @allannotationtypes = new Collections.AnnotationTypes()
				# @allannotationtypes.fetch
				# 	success: (collection) => async.called 'annotationtypes'

				# @allusers = new Collections.Users()
				# @allusers.fetch 
				# 	success: (collection) =>
				# 		@project.set 'members', new Collections.Users collection.filter (model) => @project.get('userIDs').indexOf(model.id) > -1
				# 		async.called 'users'

				# @model = new Models.Settings null,
				# 	projectID: @project.id
				# @model.fetch success: => @render()

		# ### Render
		render: ->
			rtpl = tpls['project/settings/main']
				settings: @model.attributes
				projectMembers: @project.get('members')
			@$el.html rtpl

			# @renderSubMenu()

			@renderTabs()
			@renderAnnotationsTab()
			@renderUserTab()

			@loadStatistics()

			@showTab @options.tabName if @options.tabName

			@

		# renderSubMenu: ->
		# 	subMenu = new Views.SubMenu()
		# 	@$el.prepend subMenu.$el

			@listenTo @model, 'change', => @$('input[name="savesettings"]').removeClass 'inactive'
			# @listenTo subMenu, 'clicked', (menuItem) =>
			# 	if menuItem.key is 'save'
			# 		@model.save()
			# 		subMenu.setState 'save', 'inactive'

		renderTabs: ->
			# Text layers
			textLayerList = new Views.EditableList
				value: @project.get('textLayers')
				config:
					settings:
						placeholder: 'Add layer'
						confirmRemove: true
			@listenTo textLayerList, 'confirmRemove', (id, confirm) =>
				modal = new Views.Modal
					$html: 'You are about to delete the '+id+' layer'
					submitValue: 'Remove '+id+' layer'
					width: 'auto'
				modal.on 'submit', => 
					modal.close()
					confirm()
			@listenTo textLayerList, 'change', (values) =>
				@project.set 'textLayers', values
				@project.saveTextlayers => @publish 'message', 'Text layers updated.'
				# @project.save null,
				# 	success: @publish 'message', 'Text layers updated.'
			@$('div[data-tab="textlayers"]').append textLayerList.el

			# Entry metadata
			EntryMetadataList = new Views.EditableList
				value: @project.get('entrymetadatafields')
				config:
					settings:
						placeholder: 'Add field'
						confirmRemove: true
			@listenTo EntryMetadataList, 'confirmRemove', (fieldName, confirm) =>
				modal = new Views.Modal
					$html: 'You are about to delete entry metadata field: '+fieldName
					submitValue: 'Remove field '+fieldName
					width: 'auto'
				modal.on 'submit', => 
					modal.close()
					confirm()
			@listenTo EntryMetadataList, 'change', (values) => 
				new EntryMetadata(@project.id).save values,
					success: => @publish 'message', 'Entry metadata fields updated.'
			@$('div[data-tab="metadata-entries"] .entrylist').append EntryMetadataList.el

			# # Annotation types
			# rtpl = tpls['project/settings/metadata_annotations'] annotationTypes: @project.get('annotationtypes')
			# @$('div[data-tab="metadata-annotations"]').html rtpl

		# * TODO: Add to separate view
		renderAnnotationsTab: ->
			annotationTypes = @project.get 'annotationtypes'

			combolist = new Views.ComboList
				value: annotationTypes
				config:
					data: @project.allannotationtypes
					settings:
						placeholder: 'Add annotation type'
			@$('div[data-tab="annotationtypes"] .annotationtypelist').append combolist.el

			form = new Views.Form
				Model: Models.Annotationtype
				tpl: tpls['project/settings/addannotationtype']
			@$('div[data-tab="annotationtypes"] .addannotationtype').append form.el

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
			@$('div[data-tab="users"] .userlist').append combolist.el

			form = new Views.Form
				Model: Models.User
				tpl: tpls['project/settings/adduser']
			@$('div[data-tab="users"] .adduser').append form.el

			@listenTo combolist, 'change', (changes) =>
				if changes.added?
					user = changes.collection.get changes.added
					@project.addUser user, =>
						@publish 'message', "Added #{user.getShortName()} to #{@project.get('title')}."
				else if changes.removed?
					user = @project.allusers.get changes.removed
					shortName = user.getShortName()
					@project.removeUser changes.removed, =>
						@publish 'message', "Removed #{shortName} from #{@project.get('title')}."


			@listenTo form, 'save:success', (model) => @project.get('members').add model
			@listenTo form, 'save:error', (model, xhr, options) => @publish 'message', xhr.responseText

		# ### Events
		events:
			# 'click input[name="addannotationtype"]': 'addAnnotationType'
			'click li[data-tab]': 'showTab'
			'keyup div[data-tab="project"] input': -> @$('input[name="savesettings"]').removeClass 'inactive'
			'change div[data-tab="project"] input': 'updateModel'
			'change div[data-tab="project"] select': 'updateModel'
			'click input[name="savesettings"]': 'saveSettings'
			'click .setnames form input[type="submit"]': 'submitSetCustomNames'
			'change .setnames form input[type="text"]': (ev) ->	@$('.setnames form input[type="submit"]').removeClass 'inactive'

		submitSetCustomNames: (ev) ->
			ev.preventDefault()

			@model.set input.name, input.value for input in @el.querySelectorAll('.setnames form input[type="text"]')
			@saveSettings ev

		saveSettings: (ev) -> 
			ev.preventDefault()

			unless $(ev.currentTarget).hasClass 'inactive'
				@model.save null, success: => $(ev.currentTarget).addClass 'inactive'

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

		loadStatistics: ->
			start = new Date().getTime()

			stats = new Models.Statistics @project.id
			stats.fetch (data) =>
				str = JSON.stringify(data, null, 4)
				
				str = str.replace /{/g, ''
				str = str.replace /}/g, ''
				str = str.replace /\"/g, ''
				str = str.replace /,/g, ''

				end = new Date().getTime()
				delta = end - start

				if delta < 1000
					remaining = 1000 - delta
					setTimeout (=> 
						@$('img.loader').css 'visibility', 'hidden' # ! display: none does not work in Chrome
						@$('.statistics').html str
					), remaining

				

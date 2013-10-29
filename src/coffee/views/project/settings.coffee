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

				@allusers = new Collections.Users()
				@allusers.fetch success: (collection) =>
					@project.set 'members', new Collections.Users collection.filter (model) => @project.get('userIDs').indexOf(model.id) > -1
					@render()

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
			@renderUserTab()

			@loadStatistics()

			@showTab @options.tabName if @options.tabName

			@

		# renderSubMenu: ->
		# 	subMenu = new Views.SubMenu()
		# 	@$el.prepend subMenu.$el

		# 	@listenTo @model, 'change', => $('input[name="savesettings"]').removeClass 'inactive'
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
				@project.save null,
					success: @publish 'message', 'Text layers updated.'
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
			@$('div[data-tab="metadata-entries"]').append EntryMetadataList.el

			# Annotation types
			rtpl = tpls['project/settings/metadata_annotations'] annotationTypes: @project.get('annotationtypes')
			@$('div[data-tab="metadata-annotations"]').html rtpl

		# * TODO: Add to separate view
		renderUserTab: ->
			combolist = new Views.ComboList
				value: @project.get 'members'
				config:
					data: @allusers
					settings:
						placeholder: 'Add member'
			@listenTo combolist, 'change', (changes) =>
				id = if changes.added? then changes.added else changes.removed

				name = @allusers.get(id).get('firstName')
				name = @allusers.get(id).get('lastName') if name.length is 0
				name = 'user' if name.length is 0

				message = if changes.added? then "Added #{name} to #{@project.get('title')}." else	"Removed #{name} from #{@project.get('title')}."

				new ProjectUserIDs(@project.id).save changes.values,
					success: => @publish 'message', message
						


			@$('div[data-tab="users"] .userlist').append combolist.el

			form = new Views.Form
				Model: Models.User
				tpl: tpls['project/settings/adduser']

			@listenTo form, 'save:success', (model, response, options) =>
				ajax.token = token.get()
				jqXHR = ajax.put
					url: config.baseUrl+"projects/#{@project.get('name')}/projectusers/#{model.id}"
					dataType: 'text'
				jqXHR.done => combolist.addSelected model
			@listenTo form, 'save:error', (a, b, c) => console.log 'erro', a, b, c

			@$('div[data-tab="users"] .adduser').append form.el

		# ### Events
		events:
			'click input[name="addannotationtype"]': 'addAnnotationType'
			'click li[data-tab]': 'showTab'
			'change div[data-tab="project"] input': 'updateModel'
			'change div[data-tab="project"] select': 'updateModel'
			'click input[name="savesettings"]': 'saveSettings'

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


		addAnnotationType: (ev) ->
			ev.preventDefault()

			console.log 'NOT IMPLEMENTED'


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

				

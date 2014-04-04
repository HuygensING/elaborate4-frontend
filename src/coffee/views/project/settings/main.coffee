Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'

config = require 'elaborate-modules/modules/models/config'
Async = require 'hilib/src/managers/async'
ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

# EntryMetadata is not a collection, it just reads and writes an array from and to the server.
EntryMetadata = require '../../../entry.metadata'

Views =
	Base: require 'hilib/src/views/base'
	# SubMenu: require 'views/ui/settings.submenu'
	EditableList: require 'hilib/src/views/form/editablelist/main'
	ComboList: require 'hilib/src/views/form/combolist/main'
	Form: require 'hilib/src/views/form/main'
	Modal: require 'hilib/src/views/modal'
	TextlayersTab: require './textlayers'
	EntriesTab: require './entries'
	UsersTab: require './users'
	GeneralTab: require './general'

Models =
	Statistics: require '../../../models/project/statistics'
	Settings: require '../../../models/project/settings'
	# state: require '../../../models/state'
	User: require '../../../models/user'
	Annotationtype: require '../../../models/project/annotationtype'
	currentUser: require '../../../models/currentUser'

Collections =
	projects: require '../../../collections/projects'

ProjectUserIDs = require '../../../project.user.ids'

tpl = require '../../../../jade/project/settings/main.jade'
generalTpl = require '../../../../jade/project/settings/general.jade'
addAnnotationTypeTpl = require '../../../../jade/project/settings/annotations.add.jade'
customTagNamesTpl = require '../../../../jade/project/settings/annotations.set-custom-tag-names.jade'

class ProjectSettings extends Views.Base

	className: 'projectsettings'

	# ### Initialize
	initialize: ->
		super

		Collections.projects.getCurrent (@project) =>
			@listenTo @project.get('members'), 'add', => @renderGeneralTab()
			@listenTo @project.get('members'), 'remove', => @renderGeneralTab()
			
			@model = @project.get 'settings'
			
			@render()


	# ### Render
	render: ->
		rtpl = tpl
			settings: @model.attributes
			roleNo: Models.currentUser.get('roleNo')
		@$el.html rtpl

		# @renderGeneralTab()
		@renderGeneralTab()
		@renderUserTab()
		@renderEntriesTab()
		@renderTextlayersTab()
		@renderAnnotationsTab()

		@showTab @options.tabName if @options.tabName

		@

		@listenTo @model, 'change', => @$('input[name="savesettings"]').removeClass 'inactive'

	renderGeneralTab: ->
		# rtpl = generalTpl
		# 	settings: @model.attributes
		# 	projectMembers: @project.get('members')
		generalTab = new Views.GeneralTab project: @project
		@$('div[data-tab="general"]').html generalTab.el

	# renderGeneralTab: ->
	# 	rtpl = generalTpl
	# 		settings: @model.attributes
	# 		projectMembers: @project.get('members')
	# 	@$('div[data-tab="project"]').html rtpl

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

	renderUserTab: ->
		usersTab = new Views.UsersTab project: @project

		@listenTo usersTab, 'confirm', @renderConfirmModal

		@$('div[data-tab="users"]').html usersTab.el

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
		@$('div[data-tab="annotations"] .annotation-type-list').append combolist.el

		@listenTo combolist, 'confirmRemove', (id, confirm) =>
			@renderConfirmModal confirm,
				title: 'Caution!'
				html: "You are about to <b>remove</b> annotation type: #{annotationTypes.get(id).get('title')}.<br><br>All annotations of type #{annotationTypes.get(id).get('title')} will be <b>permanently</b> removed!"
				submitValue: 'Remove annotation type'

		@listenTo combolist, 'change', (changes) =>
			if changes.added?
				selected = new Backbone.Collection changes.selected
				annotationType = selected.get changes.added
				@project.addAnnotationType annotationType, =>
					@publish 'message', "Added #{annotationType.get('name')} to #{@project.get('title')}."
			else if changes.removed?
				name = @project.allannotationtypes.get(changes.removed).get('name')
				@project.removeAnnotationType changes.removed, =>
					@publish 'message', "Removed #{name} from #{@project.get('title')}."

		addAnnotationTypeForm = new Views.Form
			Model: Models.Annotationtype
			tpl: addAnnotationTypeTpl
		@$('div[data-tab="annotations"] .add-annotation-type').append addAnnotationTypeForm.el
			
		@listenTo addAnnotationTypeForm, 'save:success', (model) => 
			@project.get('annotationtypes').add model
			addAnnotationTypeForm.el.reset()
		@listenTo addAnnotationTypeForm, 'save:error', (model, xhr, options) => @publish 'message', xhr.responseText

		customTagNamesForm = new Views.Form
			model: @project.get('settings')
			tpl: customTagNamesTpl
		@$('div[data-tab="annotations"] .set-custom-tag-names').append customTagNamesForm.el

	renderConfirmModal: (confirm, options) ->
		modal = new Views.Modal _.extend options, width: 'auto'
		modal.on 'submit', => 
			modal.close()
			confirm()

	# ### Events
	events:
		# 'click input[name="addannotationtype"]': 'addAnnotationType'
		'click li[data-tab]': 'showTab'
		# 'keyup div[data-tab="project"] input': -> @$('input[name="savesettings"]').removeClass 'inactive'
		# 'change div[data-tab="project"] input': 'updateModel'
		# 'change div[data-tab="project"] select': 'updateModel'
		# 'click input[name="savesettings"]': 'saveSettings'

	# saveSettings: (ev) -> 
	# 	ev.preventDefault()

	# 	unless $(ev.currentTarget).hasClass 'inactive'
	# 		@model.save null, success: => 
	# 			$(ev.currentTarget).addClass 'inactive'
	# 			@publish 'message', 'Settings saved.'

	# updateModel: (ev) ->
	# 	if ev.currentTarget.getAttribute('data-attr') is 'text.font'
	# 		@$('img[name="text.font"]').attr 'src', "/images/fonts/#{ev.currentTarget.value}.png"

	# 	@model.set ev.currentTarget.getAttribute('data-attr'), ev.currentTarget.value

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
	# 			url: config.get('restUrl')+"annotationtypes"
	# 			# dataType: 'text'
	# 		jqXHR.done =>
	# 			console.log 'done!'


	# ### Methods



			
module.exports = ProjectSettings
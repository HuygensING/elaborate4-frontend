Backbone = require 'backbone'
$ = require 'jquery'

BaseView = require 'hilib/src/views/base'

config = require 'elaborate-modules/modules/models/config'

Fn = require 'hilib/src/utils/general'
StringFn = require 'hilib/src/utils/string'
ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

Views =
	Modal: require 'hilib/src/views/modal'

currentUser = require '../../models/currentUser'
	# state: require 'models/state'

projects = require '../../collections/projects'

tpl = require '../../../jade/ui/header.jade'

class Header extends BaseView

	className: 'main'

	tagName: 'header'

	# ### Initialize
	initialize: ->
		super

		@project = @options.project

		@listenTo projects, 'current:change', (@project) =>	@render()
		@listenTo config, 'change:entryTermPlural', @render

		@subscribe 'message', @showMessage, @

		@render()

	# ### Events
	events:
		'click .left .projecttitle': 'navigateToProject'
		'click .left .settings': 'navigateToProjectSettings'
		'click .left .search': 'navigateToProject'
		'click .left .statistics': 'navigateToProjectStatistics'
		'click .left .history': 'navigateToProjectHistory'
		'click .middle .message': -> @$('.message').removeClass 'active'
		'click .right .logout': -> currentUser.logout() 
		'click .right .project:not(.active)': 'setProject'
		'click .right .addproject': 'addProject'

	navigateToProject: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}", trigger: true
	navigateToProjectSettings: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}/settings", trigger: true
	navigateToProjectStatistics: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}/statistics", trigger: true
	navigateToProjectHistory: (ev) -> Backbone.history.navigate "projects/#{@project.get('name')}/history", trigger: true

	# ### Render
	render: ->
		rtpl = tpl
			projects: projects
			user: currentUser
			plural: StringFn.ucfirst config.get('entryTermPlural')
		@$el.html rtpl

		@

	addProject: do ->
		modal = null

		(ev) ->
			return if modal?

			modal = new Views.Modal
				title: "Add project"
				html: '<form><ul><li><label>Name</label><input name="project-title" type="text" /></li></ul></form>'
				submitValue: 'Add project'
				width: '300px'
			modal.on 'submit', =>
				projects.create
					title: $('input[name="project-title"]').val()
				,
					wait: true
					# We don't have to call an update of the UI, because the UI is updated when the current
					# project changes. This is done by the projects collection listening to the sync event.
					success: (model) => modal.close()
					error: (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401
			modal.on 'close', -> modal = null


	# ### Methods
	setProject: (ev) ->
		@$('span.projecttitle').html $('<i class="fa fa-spinner fa-spin" />')
		id = if ev.hasOwnProperty 'currentTarget' then +ev.currentTarget.getAttribute 'data-id' else ev
		projects.setCurrent id

	showMessage: (msg) ->
		return false if msg.trim().length is 0

		$message = @$('.message')
		$message.addClass 'active' unless $message.hasClass 'active'
		$message.html msg

		Fn.timeoutWithReset 5000, (=> $message.removeClass 'active'), => 
			$message.addClass 'pulse'
			setTimeout (=> $message.removeClass 'pulse'), 1000

module.exports = Header
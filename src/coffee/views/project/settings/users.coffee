_ = require 'underscore'

Models =
	User: require '../../../models/user'

Views =
	Base: require 'hilib/src/views/base'
	ComboList: require 'hilib/src/views/form/combolist/main'
	Form: require 'hilib/src/views/form/main'

tpl = require '../../../../jade/project/settings/users.jade'
rolesTpl = require '../../../../jade/project/settings/users.roles.jade'
addUserTpl = require '../../../../jade/project/settings/users.add.jade'

class ProjectSettingsUsers extends Views.Base

	className: 'users'

	initialize: ->
		super

		@project = @options.project
		@members = @project.get 'members'

		@listenTo @members, 'add remove', @renderUserroles

		@render()

	render: ->
		@el.innerHTML = tpl()

		@renderUserroles()

		@renderCombolist()
		
		@renderAddUserForm()

		@

	renderUserroles: ->
		@$('.userroles ul').html rolesTpl members: @members

	renderCombolist: ->
		combolist = new Views.ComboList
			value: @members
			config:
				data: @project.allusers
				settings:
					placeholder: 'Add member'
					confirmRemove: true
		@$('.userlist').append combolist.el

		@listenTo combolist, 'confirmRemove', (id, confirm) => @trigger 'confirm', confirm,
			html: 'You are about to remove <u>'+@members.get(id).get('title')+'</u> from your project.'
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

	renderAddUserForm: ->
		form = new Views.Form
			Model: Models.User
			tpl: addUserTpl
		@$('.adduser').append form.el

		@listenTo form, 'save:success', (model) => @project.get('members').add model
		@listenTo form, 'save:error', (model, xhr, options) => @publish 'message', xhr.responseText

	events: ->
		'change select': 'roleChanged'

	roleChanged: (ev) ->
		id = ev.currentTarget.getAttribute 'data-id'
		role = ev.currentTarget.options[ev.currentTarget.selectedIndex].value

		jqXHR = @members.get(id).set('role', role).save()
		jqXHR.done => @publish 'message', 'Changed role to '+role
		jqXHR.fail => @publish 'message', 'Changing role failed!'

module.exports = ProjectSettingsUsers
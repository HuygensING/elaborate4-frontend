Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'

Form = require 'hilib/src/views/form/main'

tpl = require '../../../../jade/project/settings/general2.jade'

class ProjectSettingsGeneral extends Backbone.View

	className: 'generalprojectsettings'

	# ### Initialize
	initialize: (@options) -> @render()

	# ### Render
	render: ->
		form = new Form
			model: @options.project.get('settings')
			tpl: tpl
			tplData:
				projectMembers: @options.project.get('members')

		# @listenTo form, 'change', => form.$('button[name="submit"]').removeClass 'disabled'
		@listenTo form, 'save:success', (model, response, options, changedAttributes) =>
			@options.project.get('settings').trigger 'settings:saved', model, changedAttributes
			Backbone.trigger 'message', 'Settings saved.'

		@$el.html form.el

		@

	# ### Events
	events: ->
		"change select": (ev) => @$('img[name="text.font"]').attr 'src', "/images/fonts/#{ev.currentTarget.value}.png"


	# ### Methods




module.exports = ProjectSettingsGeneral
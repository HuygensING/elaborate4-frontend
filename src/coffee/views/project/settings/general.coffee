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
		model = @options.project.get('settings')
		prop = model.get('name') + ':publicationErrors:value'
		errors = localStorage.getItem(prop)

		form = new Form
			model: model
			tpl: tpl
			tplData:
				projectMembers: @options.project.get('members')
				hasErrors: errors != null && errors.length
				errorsUrl: "/projects/#{model.get('name')}/publication-errors"

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
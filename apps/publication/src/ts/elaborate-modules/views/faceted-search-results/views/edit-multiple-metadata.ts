import Backbone from "backbone"
import $ from "jquery"
import _ from "underscore"
import { BaseView, token, ajax } from "@elaborate4-frontend/hilib"

// Templates =
// 	EditSelection: require 'text!html/project/editselection.html'
import tpl from "../templates/edit-multiple-metadata.jade"
import { config } from "../../../../models/config"

// ## EditMultipleMetadata
export class EditMultipleMetadata extends BaseView {
  settings
  // ### Initialize
  constructor(private options: any = {}) {
    super(options)
    this.listenTo(Backbone, 'entrymetadatafields:update', (fields) => {
      this.options.entryMetadataFields = fields;
      this.render()
    })
    this.render()
  }

  // ### Render
  render() {
    var rtpl;
    rtpl = tpl({
      entrymetadatafields: this.options.entryMetadataFields,
      config,
    })
    this.el.innerHTML = rtpl;
    // Subtract 70 for the header and the footer.
    if ($('.resultview').length > 0) {
      this.$('.row').css('max-height', (($(window).height() - $('.resultview').offset().top) / 2) - 70)
    }
    return this;
  }

  // ### Events
  events() {
    return {
      'click button[name="savemetadata"]': 'saveMetadata',
      'click button[name="cancel"]': function() {
        return this.trigger('close')
      },
      'keyup input[type="text"]': 'toggleCheckboxes',
      'change input[type="checkbox"]': 'toggleCheckboxes',
      'click i.fa': 'toggleIncludeCheckboxes'
    }
  }

  emptyInput(name) {
    var input;
    input = this.el.querySelector('input[name="' + name + '"]')
    if (input.type === 'checkbox') {
      return input.checked = false;
    } else {
      return input.value = '';
    }
  }

  toggleIncludeCheckboxes(ev) {
    var $target;
    $target = $(ev.currentTarget)
    $target.toggleClass('fa-square-o')
    $target.toggleClass('fa-check-square-o')
    if ($target.hasClass('fa-square-o')) {
      this.emptyInput($target.attr('data-name'))
      $target.removeClass('include')
    } else {
      $target.addClass('include')
    }
    this.updateSettings()
  }

  // 	'change input.empty[type="checkbox"]': 'disableInput'

    // disableInput: (ev) ->
  // 	name = ev.currentTarget.getAttribute 'data-name'
  // 	input = @el.querySelector "input[name='#{name}']"

    // 	if input.hasAttribute 'disabled'
  // 		input.removeAttribute 'disabled'
  // 		input.removeAttribute 'placeholder'
  // 	else
  // 		input.value = ''
  // 		input.setAttribute 'disabled', 'disabled'
  // 		input.setAttribute 'placeholder', 'Text will be cleared.'

    // 	@toggleInactive()

    // 'change input[type="checkbox"]': 'toggleInactive'

    // If the input has a value, the checkbox next to input should be checked
  // checkInput: (ev) ->
  // 	cb = ev.currentTarget.nextSibling
  // 	cb.checked = ev.currentTarget.value.trim().length > 0
  // 	@toggleInactive()

    // Check if there are checkboxes checked, if so, activate the submit button,
  // if not, deactivate the submit button.
  /* TODO */
  // - in the input loop, check .active checkboxes
  // - on change .active, toggleInactive
  /* TODO */
  toggleCheckboxes() {
    var $cb, check, input, j, len, ref;
    ref = this.el.querySelectorAll('input')
    for (j = 0, len = ref.length; j < len; j++) {
      input = ref[j];
      check = false;
      if (input.type === 'checkbox') {
        if (input.checked) {
          check = true;
        }
      } else {
        if (input.value.length > 0) {
          check = true;
        }
      }
      $cb = this.$('i[data-name="' + input.name + '"]')
      if (check) {
        $cb.removeClass('fa-square-o')
        $cb.addClass('fa-check-square-o')
      } else if (!$cb.hasClass('include')) {
        $cb.addClass('fa-square-o')
        $cb.removeClass('fa-check-square-o')
      }
    }
    return this.updateSettings()
  }

  updateSettings() {
    var i, input, j, k, len, len1, name, ref, ref1;
    this.settings = {}
    ref = this.el.querySelectorAll('input')
    for (j = 0, len = ref.length; j < len; j++) {
      input = ref[j];
      if (input.type === 'checkbox') {
        if (input.checked) {
          this.settings[input.name] = true;
        }
      } else {
        if (input.value.length > 0) {
          this.settings[input.name] = input.value;
        }
      }
    }
    ref1 = this.el.querySelectorAll('i.fa-check-square-o')
    // Loop over all checked icons, if the icon data-name is not
    // present in @settings, an empty string is the value: this means
    // the user wants to empty this field for selected entries.
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      i = ref1[k];
      name = i.getAttribute('data-name')
      if (!this.settings.hasOwnProperty(name)) {
        this.settings[name] = '';
      }
    }
    return this.activateSaveButton()
  }

  activateSaveButton() {
    if (_.isEmpty(this.settings) || document.querySelectorAll('.entries input[type="checkbox"]:checked').length === 0) {
      return this.$('button[name="savemetadata"]').addClass('inactive')
    } else {
      return this.$('button[name="savemetadata"]').removeClass('inactive')
    }
  }

  saveMetadata(ev) {
    var entryIDs, jqXHR, saveButton;
    ev.preventDefault()
    if (!$(ev.currentTarget).hasClass('inactive')) {
      // Get all entry IDs from the result list that are checked
      entryIDs = _.map(document.querySelectorAll('.entries input[type="checkbox"]:checked'), (cb) => {
        return +cb.getAttribute('data-id')
      })
      if (entryIDs.length > 0 && !_.isEmpty(this.settings)) {
        // Show loader
        saveButton = this.$('button[name="savemetadata"]')
        saveButton.addClass('loader')
        ajax.token = token.get()
        jqXHR = ajax.put({
          url: this.options.editMultipleMetadataUrl,
          data: JSON.stringify({
            projectEntryIds: entryIDs,
            settings: this.settings
          }),
          dataType: 'text'
        })
        jqXHR.done(() => {
          this.publish('message', 'Metadata of multiple entries saved.')
          saveButton.removeClass('loader')
          this.trigger('saved', entryIDs)
          return this.trigger('close')
        })
        return jqXHR.fail((response) => {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            })
          }
        })
      }
    }
  }
}

import Backbone from "backbone";
import _ from "underscore";
import $ from "jquery";
import BaseView from "hilib/views/base";
import ajax from "hilib/managers/ajax";
import token from "hilib/managers/token";
import config from "../../../../models/config";
import projects from "../../../../collections/projects";
import tpl from "./index.jade";
export default class EditMetadata extends BaseView {
    options;
    project;
    data;
    initialize(options) {
        this.options = options;
        super.initialize();
        return projects.getCurrent((project) => {
            this.project = project;
            return this.render();
        });
    }
    render() {
        this.el.innerHTML = tpl({
            entrymetadatafields: this.options.entryMetadataFields,
            resultModel: this.options.resultModel
        });
        if (this.options.isMetadataVisible) {
            this.$('input#edit-results-metadata-show-metadata').attr('checked', 'checked');
            this.$('.results').addClass('show-metadata');
        }
        return this;
    }
    onSelectAll(ev) {
        var cb, checkboxes, i, len;
        checkboxes = this.$('.results li.result > input[type="checkbox"]');
        for (i = 0, len = checkboxes.length; i < len; i++) {
            cb = checkboxes[i];
            cb.checked = ev.currentTarget.checked;
        }
        return this.updateData();
    }
    onShowMetadata(ev) {
        return this.$('.results').toggleClass('show-metadata');
    }
    updateData() {
        var checkbox, i, input, j, len, len1, name, ref, ref1;
        this.data = {
            projectEntryIds: (function () {
                var i, len, ref, results;
                ref = this.el.querySelectorAll('.results li input[type="checkbox"]:checked');
                results = [];
                for (i = 0, len = ref.length; i < len; i++) {
                    checkbox = ref[i];
                    results.push(checkbox.id.substr("entry-".length));
                }
                return results;
            }).call(this),
            settings: {}
        };
        ref = this.el.querySelectorAll('input.value');
        for (i = 0, len = ref.length; i < len; i++) {
            input = ref[i];
            if (input.type === 'checkbox') {
                if (input.checked) {
                    this.data.settings[input.name] = true;
                }
            }
            else {
                if (input.value.length > 0) {
                    this.data.settings[input.name] = input.value;
                }
            }
        }
        ref1 = this.el.querySelectorAll('input.empty');
        for (j = 0, len1 = ref1.length; j < len1; j++) {
            checkbox = ref1[j];
            name = checkbox.getAttribute('data-name');
            input = this.el.querySelector(`input[name=\"${name}\"]`);
            if (checkbox.checked) {
                if (input.type === 'checkbox') {
                    input.checked = false;
                    input.setAttribute('disabled', "disabled");
                    this.data.settings[name] = false;
                }
                else {
                    input.value = "";
                    input.setAttribute('placeholder', "To be emptied.");
                    input.setAttribute('disabled', "disabled");
                    this.data.settings[name] = "";
                }
            }
            else {
                if (input.value === "") {
                    input.removeAttribute('placeholder');
                }
                input.removeAttribute('disabled');
            }
        }
        return this.saveButtonIsActive();
    }
    saveButtonIsActive() {
        var eventStr, isActive;
        isActive = this.data.projectEntryIds.length > 0 && !_.isEmpty(this.data.settings);
        eventStr = isActive ? 'activate-save-button' : 'deactivate-save-button';
        return this.trigger(eventStr);
    }
    save() {
        var jqXHR, saveButton;
        if (this.saveButtonIsActive()) {
            saveButton = $('li[data-key="save-edit-metadata"]');
            saveButton.addClass('loader');
            ajax.token = token.get();
            jqXHR = ajax.put({
                url: `${config.get('restUrl')}projects/${this.project.id}/multipleentrysettings`,
                data: JSON.stringify(this.data),
                dataType: 'text'
            });
            jqXHR.done(() => {
                this.publish('message', 'Metadata of multiple entries saved.');
                saveButton.removeClass('loader');
                return this.trigger('saved');
            });
            return jqXHR.fail((response) => {
                if (response.status === 401) {
                    return Backbone.history.navigate('login', {
                        trigger: true
                    });
                }
            });
        }
    }
}
;
EditMetadata.prototype.className = 'edit-metadata';
EditMetadata.prototype.events = () => ({
    "change .results input[type=\"checkbox\"]": "updateData",
    "change .form li .publishable-checkbox-container input[type=\"checkbox\"]": "updateData",
    "change .form li input.empty[type=\"checkbox\"]": "updateData",
    "keyup .form li > label + input[type=\"text\"]": "updateData",
    "change .results .head input#edit-results-metadata-select-all": "onSelectAll",
    "change .results .head input#edit-results-metadata-show-metadata": "onShowMetadata"
});

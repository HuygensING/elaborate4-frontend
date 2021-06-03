import Backbone from "backbone";
import config from "../../../models/config";
import currentUser from "../../../models/currentUser";
import projects from "../../../collections/projects";
import Entry from "../../../models/entry";
import Base from "hilib/views/base";
import Modal from "hilib/views/modal";
import tpl from "./submenu.jade";
class SearchSubmenu extends Base {
    initialize(options) {
        this.options = options;
        super.initialize();
        this.listenTo(config, 'change:entryTermSingular', this.render);
        return projects.getCurrent((project) => {
            this.project = project;
            return this.render();
        });
    }
    render() {
        var rtpl;
        rtpl = tpl({
            user: currentUser,
            config: config,
            projects: projects
        });
        this.$el.html(rtpl);
        this.pollDraft();
        return this;
    }
    enableEditMetadataButton() {
        return this.$('li[data-key="editmetadata"]').addClass('enabled');
    }
    events() {
        return {
            'click li[data-key="newsearch"]': function () {
                return this.trigger('newsearch');
            },
            'click li[data-key="newentry"]': 'newEntry',
            'click li[data-key="save-edit-metadata"]:not(.inactive)': function (ev) {
                return this.trigger('save-edit-metadata');
            },
            'click li[data-key="cancel-edit-metadata"]': function () {
                return this.trigger('cancel-edit-metadata');
            },
            'click li[data-key="editmetadata"].enabled': function () {
                return this.trigger('edit-metadata');
            },
            'click li[data-key="delete"]': 'deleteProject',
            'click li[data-key="publish"]': 'publishDraft'
        };
    }
    publishDraft(ev) {
        this.activatePublishDraftButton();
        return this.project.publishDraft(() => {
            return this.deactivatePublishDraftButton();
        });
    }
    newEntry(ev) {
        var modal;
        modal = new Modal({
            title: `Create a new ${config.get('entryTermSingular')}`,
            html: '<form><ul><li><label>Name</label><input type="text" name="name" /></li></ul></form>',
            submitValue: `Create ${config.get('entryTermSingular')}`,
            width: '300px'
        });
        return modal.on('submit', () => {
            var entry;
            modal.message('success', `Creating a new ${config.get('entryTermSingular')}...`);
            entry = new Entry({
                name: modal.$('input[name="name"]').val()
            });
            entry.project = this.project;
            return entry.save([], {
                success: (model) => {
                    this.stopListening();
                    this.project.get('entries').add(model);
                    modal.close();
                    this.publish('faceted-search:refresh');
                    this.publish('message', `New ${config.get('entryTermSingular')} added to project.`);
                    return Backbone.history.navigate(`projects/${this.project.get('name')}/entries/${entry.id}`, {
                        trigger: true
                    });
                }
            });
        });
    }
    activatePublishDraftButton() {
        var busyText, button, span;
        busyText = 'Publishing draft';
        button = this.$('li[data-key="publish"]');
        span = button.find('span');
        if (span.html() === busyText) {
            return false;
        }
        span.html(busyText);
        return button.addClass('active');
    }
    deactivatePublishDraftButton() {
        var button;
        button = this.el.querySelector('li[data-key="publish"]');
        button.innerHTML = 'Publish draft';
        return button.classList.remove('active');
    }
    activateEditMetadataSaveButton() {
        return this.$('li[data-key="save-edit-metadata"]').removeClass('inactive');
    }
    deactivateEditMetadataSaveButton() {
        return this.$('li[data-key="save-edit-metadata"]').addClass('inactive');
    }
    pollDraft() {
        var locationUrl;
        locationUrl = localStorage.getItem('publishDraftLocation');
        if (locationUrl != null) {
            this.activatePublishDraftButton();
            return this.project.pollDraft(locationUrl, () => {
                return this.deactivatePublishDraftButton();
            });
        }
    }
    deleteProject = () => {
        var modal;
        modal = null;
        return function (ev) {
            if (modal != null) {
                return;
            }
            modal = new Modal({
                title: 'Caution!',
                html: `You are about to <b>REMOVE</b> project: \"${this.project.get('title')}\" <small>(id: ${this.project.id})</small>.<br><br>All ${config.get('entryTermPlural')} will be <b>PERMANENTLY</b> removed!`,
                submitValue: 'Remove project',
                width: 'auto'
            });
            modal.on('submit', () => {
                return this.project.destroy({
                    wait: true,
                    success: () => {
                        modal.close();
                        projects.setCurrent(projects.first().id);
                        return this.publish('message', `Removed ${this.project.get('title')}.`);
                    }
                });
            });
            return modal.on('close', function () {
                return modal = null;
            });
        };
    };
}
;
SearchSubmenu.prototype.className = 'submenu';

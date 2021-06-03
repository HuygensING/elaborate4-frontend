import Backbone from "backbone";
import _ from "underscore";
import $ from "jquery";
import Base from "hilib/views/base";
import ComboList from "hilib/views/form/combolist/main";
import Form from "hilib/views/form/main";
import Modal from "hilib/views/modal";
import TextlayersTab from "./textlayers";
import EntriesTab from "./entries";
import UsersTab from "./users";
import GeneralTab from "./general";
import Annotationtype from "../../../models/project/annotationtype";
import currentUser from "../../../models/currentUser";
import projects from "../../../collections/projects";
import tpl from "../../../../jade/project/settings/main.jade";
import addAnnotationTypeTpl from "../../../../jade/project/settings/annotations.add.jade";
import customTagNamesTpl from "../../../../jade/project/settings/annotations.set-custom-tag-names.jade";
class ProjectSettings extends Base {
    options;
    initialize(options1) {
        this.options = options1;
        super.initialize();
        return projects.getCurrent((project) => {
            this.project = project;
            this.listenTo(this.project.get('members'), 'add', () => {
                return this.renderGeneralTab();
            });
            this.listenTo(this.project.get('members'), 'remove', () => {
                return this.renderGeneralTab();
            });
            this.model = this.project.get('settings');
            return this.render();
        });
    }
    render() {
        var rtpl;
        rtpl = tpl({
            settings: this.model.attributes,
            roleNo: currentUser.get('roleNo')
        });
        this.$el.html(rtpl);
        this.renderGeneralTab();
        this.renderUserTab();
        this.renderEntriesTab();
        this.renderTextlayersTab();
        this.renderAnnotationsTab();
        if (this.options.tabName) {
            this.showTab(this.options.tabName);
        }
        this;
        return this.listenTo(this.model, 'change', () => {
            return this.$('input[name="savesettings"]').removeClass('inactive');
        });
    }
    renderGeneralTab() {
        var generalTab;
        generalTab = new GeneralTab({
            project: this.project
        });
        return this.$('div[data-tab="general"]').html(generalTab.el);
    }
    renderEntriesTab() {
        var entriesTab;
        entriesTab = new EntriesTab({
            project: this.project
        });
        this.listenTo(entriesTab, 'confirm', this.renderConfirmModal);
        this.listenTo(entriesTab, 'savesettings', this.saveSettings);
        return this.$('div[data-tab="entries"]').html(entriesTab.el);
    }
    renderTextlayersTab() {
        var textlayersTab;
        textlayersTab = new TextlayersTab({
            project: this.project
        });
        this.listenTo(textlayersTab, 'confirm', this.renderConfirmModal);
        return this.$('div[data-tab="textlayers"]').html(textlayersTab.el);
    }
    renderUserTab() {
        var usersTab;
        usersTab = new UsersTab({
            project: this.project
        });
        this.listenTo(usersTab, 'confirm', this.renderConfirmModal);
        return this.$('div[data-tab="users"]').html(usersTab.el);
    }
    renderAnnotationsTab() {
        var addAnnotationTypeForm, annotationTypes, combolist, customTagNamesForm;
        annotationTypes = this.project.get('annotationtypes');
        combolist = new ComboList({
            value: annotationTypes,
            config: {
                data: this.project.allannotationtypes,
                settings: {
                    placeholder: 'Add annotation type',
                    confirmRemove: true
                }
            }
        });
        this.$('div[data-tab="annotations"] .annotation-type-list').append(combolist.el);
        this.listenTo(combolist, 'confirmRemove', (id, confirm) => {
            return this.renderConfirmModal(confirm, {
                title: 'Caution!',
                html: `You are about to <b>remove</b> annotation type: ${annotationTypes.get(id).get('title')}.<br><br>All annotations of type ${annotationTypes.get(id).get('title')} will be <b>permanently</b> removed!`,
                submitValue: 'Remove annotation type'
            });
        });
        this.listenTo(combolist, 'change', (changes) => {
            var annotationType, name, selected;
            if (changes.added != null) {
                selected = new Backbone.Collection(changes.selected);
                annotationType = selected.get(changes.added);
                return this.project.addAnnotationType(annotationType, () => {
                    return this.publish('message', `Added ${annotationType.get('name')} to ${this.project.get('title')}.`);
                });
            }
            else if (changes.removed != null) {
                name = this.project.allannotationtypes.get(changes.removed).get('name');
                return this.project.removeAnnotationType(changes.removed, () => {
                    return this.publish('message', `Removed ${name} from ${this.project.get('title')}.`);
                });
            }
        });
        addAnnotationTypeForm = new Form({
            model: new Annotationtype(),
            tpl: addAnnotationTypeTpl
        });
        this.$('div[data-tab="annotations"] .add-annotation-type').append(addAnnotationTypeForm.el);
        this.listenTo(addAnnotationTypeForm, 'save:success', (model) => {
            this.project.get('annotationtypes').add(model);
            return addAnnotationTypeForm.reset();
        });
        this.listenTo(addAnnotationTypeForm, 'save:error', (model, xhr, options) => {
            return this.publish('message', xhr.responseText);
        });
        customTagNamesForm = new Form({
            model: this.project.get('settings'),
            tpl: customTagNamesTpl
        });
        return this.$('div[data-tab="annotations"] .set-custom-tag-names').append(customTagNamesForm.el);
    }
    renderConfirmModal(confirm, options) {
        var modal;
        modal = new Modal(_.extend(options, {
            width: 'auto'
        }));
        return modal.on('submit', () => {
            modal.close();
            return confirm();
        });
    }
    showTab(ev) {
        var $ct, index, tabName;
        if (_.isString(ev)) {
            tabName = ev;
        }
        else {
            $ct = $(ev.currentTarget);
            tabName = $ct.attr('data-tab');
        }
        index = Backbone.history.fragment.indexOf('/settings');
        Backbone.history.navigate(Backbone.history.fragment.substr(0, index) + '/settings/' + tabName);
        this.$(".active[data-tab]").removeClass('active');
        return this.$(`[data-tab='${tabName}']`).addClass('active');
    }
}
ProjectSettings.prototype.className = 'projectsettings';
ProjectSettings.prototype.events = {
    'click li[data-tab]': 'showTab'
};

import Backbone from "backbone";
import $ from "jquery";
import Fn from "hilib/utils/general";
import StringFn from "hilib/utils/string";
import Async from "hilib/managers/async";
import config from "../../models/config";
import Base from "hilib/views/base";
import tpl from "../../../jade/entry/main.submenu.jade";
import metadataTpl from "../../../jade/entry/metadata.jade";
import Form from "hilib/views/form/main";
import Modal from "hilib/views/modal";
export default class EntrySubmenu extends Base {
    options;
    entry;
    user;
    project;
    initialize(options) {
        this.options = options;
        super.initialize();
        return ({ entry: this.entry, user: this.user, project: this.project } = this.options);
    }
    render() {
        var rtpl;
        rtpl = tpl({
            entry: this.entry,
            user: this.user
        });
        this.$el.html(rtpl);
        this.entry.setPrevNext(() => {
            return this.activatePrevNext();
        });
        return this;
    }
    events() {
        return {
            'click .menu li.active[data-key="previous"]': '_goToPreviousEntry',
            'click .menu li.active[data-key="next"]': '_goToNextEntry',
            'click .menu li[data-key="delete"]': 'deleteEntry',
            'click .menu li[data-key="metadata"]': 'editEntryMetadata',
            'click .menu li[data-key="facsimiles"] li[data-key="facsimile"]': 'changeFacsimile'
        };
    }
    changeFacsimile(ev) {
        var facsimileID, newFacsimile;
        config.set('entry-left-preview', null);
        facsimileID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
        this.$('.left-menu .facsimiles li.active').removeClass('active');
        this.$('.left-menu .textlayers li.active').removeClass('active');
        this.$('.left-menu .facsimiles li[data-value="' + facsimileID + '"]').addClass('active');
        newFacsimile = this.entry.get('facsimiles').get(facsimileID);
        if (newFacsimile != null) {
            return this.entry.get('facsimiles').setCurrent(newFacsimile);
        }
    }
    activatePrevNext() {
        if (this.entry.prevID != null) {
            this.$('li[data-key="previous"]').addClass('active');
        }
        if (this.entry.nextID != null) {
            return this.$('li[data-key="next"]').addClass('active');
        }
    }
    _goToPreviousEntry() {
        var projectName, transcription;
        projectName = this.entry.project.get('name');
        transcription = StringFn.slugify(this.entry.get('transcriptions').current.get('textLayer'));
        return Backbone.history.navigate(`projects/${projectName}/entries/${this.entry.prevID}/transcriptions/${transcription}`, {
            trigger: true
        });
    }
    _goToNextEntry() {
        var projectName, transcription;
        projectName = this.entry.project.get('name');
        transcription = StringFn.slugify(this.entry.get('transcriptions').current.get('textLayer'));
        return Backbone.history.navigate(`projects/${projectName}/entries/${this.entry.nextID}/transcriptions/${transcription}`, {
            trigger: true
        });
    }
    adjustTextareaHeight(ev) {
        var target;
        target = ev.hasOwnProperty('currentTarget') ? ev.currentTarget : ev;
        target.style.height = '24px';
        return target.style.height = target.scrollHeight + 12 + 'px';
    }
    deleteEntry = () => {
        var modal;
        modal = null;
        return function (ev) {
            if (modal != null) {
                return;
            }
            modal = new Modal({
                title: 'Caution!',
                html: `You are about to <b>REMOVE</b> entry: \"${this.entry.get('name')}\" <small>(id: ${this.entry.id})</small>.<br><br>All text and annotations will be <b>PERMANENTLY</b> removed!`,
                submitValue: 'Remove entry',
                width: 'auto'
            });
            modal.on('submit', () => {
                var jqXHR;
                jqXHR = this.entry.destroy();
                return jqXHR.done(() => {
                    modal.close();
                    this.publish('faceted-search:refresh');
                    this.publish('message', `Removed entry ${this.entry.id} from project.`);
                    return Backbone.history.navigate(`projects/${this.project.get('name')}`, {
                        trigger: true
                    });
                });
            });
            return modal.on('close', function () {
                return modal = null;
            });
        };
    };
    editEntryMetadata = () => {
        var modal;
        modal = null;
        return function (ev) {
            var entryMetadata;
            if (modal != null) {
                return;
            }
            entryMetadata = new Form({
                tpl: metadataTpl,
                tplData: {
                    user: this.user,
                    entrymetadatafields: this.project.get('entrymetadatafields'),
                    generateID: Fn.generateID
                },
                model: this.entry.clone()
            });
            modal = new Modal({
                title: `Edit ${config.get('entryTermSingular')} metadata`,
                html: entryMetadata.el,
                submitValue: 'Save metadata',
                width: '50vw',
                customClassName: 'entry-metadata'
            });
            modal.on('submit', () => {
                var async;
                this.entry.updateFromClone(entryMetadata.model);
                async = new Async(['entry', 'settings']);
                this.listenToOnce(async, 'ready', () => {
                    modal.close();
                    return this.publish('message', `Saved metadata for entry: ${this.entry.get('name')}.`);
                });
                this.entry.get('settings').save(null, {
                    success: function () {
                        return async.called('settings');
                    }
                });
                return this.entry.save(null, {
                    success: function () {
                        return async.called('entry');
                    }
                });
            });
            modal.on('close', function () {
                modal = null;
                return $('.entry-metadata form.hilib textarea').off('keydown', this.adjustTextareaHeight);
            });
            $('.entry-metadata form.hilib textarea').each((i, te) => {
                return this.adjustTextareaHeight(te);
            });
            return $('.entry-metadata form.hilib textarea').on('keydown', this.adjustTextareaHeight);
        };
    };
}
;
EntrySubmenu.prototype.className = 'submenu';

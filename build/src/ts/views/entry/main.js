import Backbone from "backbone";
import $ from "jquery";
import Fn from "hilib/utils/general";
import 'hilib/utils/jquery.mixin';
import Async from "hilib/managers/async";
import config from "../../models/config";
import EntryModel from "../../models/entry";
import currentUser from "../../models/currentUser";
import projects from "../../collections/projects";
import Base from "hilib/views/base";
import Submenu from "./main.submenu";
import Preview from "./preview/main";
import EditFacsimiles from "./subsubmenu/facsimiles.edit";
import Modal from "hilib/views/modal";
import AnnotationEditor from "./editors/annotation";
import LayerEditor from "./editors/layer";
import tpl from "../../../jade/entry/main.jade";
export default class Entry extends Base {
    options;
    project;
    entry;
    currentTranscription;
    initialize(options1) {
        var async;
        this.options = options1;
        super.initialize();
        async = new Async(['transcriptions', 'facsimiles', 'settings']);
        this.listenToOnce(async, 'ready', () => {
            return this.render();
        });
        return projects.getCurrent((project) => {
            var jqXHR;
            this.project = project;
            this.entry = this.project.get('entries').get(this.options.entryId);
            if (this.entry == null) {
                this.entry = new EntryModel({
                    id: this.options.entryId,
                    projectID: this.project.id
                });
                this.project.get('entries').add(this.entry);
            }
            this.entry.project = this.project;
            jqXHR = this.entry.fetch({
                success: (model, response, options) => {
                    this.entry.fetchTranscriptions(this.options.transcriptionName, (currentTranscription) => {
                        this.currentTranscription = currentTranscription;
                        return async.called('transcriptions');
                    });
                    this.entry.fetchFacsimiles(() => {
                        return async.called('facsimiles');
                    });
                    return this.entry.fetchSettings(() => {
                        return async.called('settings');
                    });
                }
            });
            return jqXHR.fail((response) => {
                if (response.status === 401) {
                    return Backbone.history.navigate('login', {
                        trigger: true
                    });
                }
            });
        });
    }
    render() {
        var rtpl, transcription;
        rtpl = tpl({
            entry: this.entry,
            user: currentUser
        });
        this.$el.html(rtpl);
        this.subviews.submenu = new Submenu({
            entry: this.entry,
            user: currentUser,
            project: this.project
        });
        this.$el.prepend(this.subviews.submenu.el);
        this.renderEditFacsimilesMenu();
        if (config.get('entry-left-preview') != null) {
            transcription = this.entry.get('transcriptions').findWhere({
                'textLayer': config.get('entry-left-preview')
            });
            this.showLeftTranscription(transcription.id);
        }
        else {
            this.renderFacsimile();
        }
        this.renderTranscriptionEditor();
        this.addListeners();
        return this.currentTranscription.getAnnotations((annotations) => {
            var annotation;
            if (this.options.annotationID != null) {
                annotation = annotations.get(this.options.annotationID);
                this.subviews.preview.setAnnotatedText(annotation);
                return this.renderAnnotationEditor(annotation);
            }
        });
    }
    renderEditFacsimilesMenu() {
        this.subviews.editFacsimiles = new EditFacsimiles({
            collection: this.entry.get('facsimiles')
        });
        return this.$('.subsubmenu .editfacsimiles').replaceWith(this.subviews.editFacsimiles.el);
    }
    renderFacsimile() {
        var $iframe, url;
        this.el.querySelector('.left-pane iframe').style.display = 'block';
        this.el.querySelector('.left-pane .preview-placeholder').style.display = 'none';
        $iframe = this.$('.left-pane iframe');
        $iframe.attr('src', '');
        if (this.entry.get('facsimiles').current != null) {
            url = this.entry.get('facsimiles').current.get('zoomableUrl');
            $iframe.attr('src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.1/viewer.html?rft_id=' + url);
            return $iframe.height(document.documentElement.clientHeight - 89);
        }
    }
    renderPreview() {
        if (this.subviews.preview != null) {
            return this.subviews.preview.setModel(this.entry);
        }
        else {
            this.subviews.preview = new Preview({
                model: this.entry,
                wordwrap: this.project.get('settings').get('wordwrap')
            });
            return this.$('.right-pane .preview-placeholder').append(this.subviews.preview.el);
        }
    }
    renderTranscriptionEditor() {
        this.renderPreview();
        this.subviews.submenu.render();
        if (!this.subviews.layerEditor) {
            this.subviews.layerEditor = new LayerEditor({
                model: this.currentTranscription,
                height: this.subviews.preview.$el.innerHeight(),
                width: this.subviews.preview.$el.outerWidth(),
                wordwrap: this.project.get('settings').get('wordwrap')
            });
            this.$('.transcription-placeholder').html(this.subviews.layerEditor.el);
        }
        else {
            this.subviews.layerEditor.show(this.currentTranscription);
        }
        if (this.subviews.annotationEditor != null) {
            return this.subviews.annotationEditor.hide();
        }
    }
    renderAnnotationEditor(model) {
        var showAnnotationEditor;
        showAnnotationEditor = () => {
            if (!this.subviews.annotationEditor) {
                this.subviews.annotationEditor = new AnnotationEditor({
                    model: model,
                    height: this.subviews.preview.$el.innerHeight() - 31,
                    width: this.subviews.preview.$el.outerWidth()
                });
                this.$('.annotation-placeholder').html(this.subviews.annotationEditor.el);
                this.listenTo(this.subviews.annotationEditor, 'cancel', () => {
                    return this.showUnsavedChangesModal({
                        model: this.subviews.annotationEditor.model,
                        html: `<p>There are unsaved changes in annotation: ${this.subviews.annotationEditor.model.get('annotationNo')}.<p>`,
                        done: () => {
                            this.subviews.preview.removeNewAnnotationTags();
                            return this.renderTranscriptionEditor();
                        }
                    });
                });
                this.listenTo(this.subviews.annotationEditor, 'newannotation:saved', (annotation) => {
                    this.currentTranscription.get('annotations').add(annotation);
                    return this.subviews.preview.highlightAnnotation(annotation.get('annotationNo'));
                });
                this.listenTo(this.subviews.annotationEditor, 'hide', (annotationNo) => {
                    return this.subviews.preview.unhighlightAnnotation(annotationNo);
                });
            }
            else {
                this.subviews.annotationEditor.show(model);
            }
            this.subviews.preview.highlightAnnotation(model.get('annotationNo'));
            return this.subviews.layerEditor.hide();
        };
        return this.showUnsavedChangesModal({
            model: this.subviews.layerEditor.model,
            html: `<p>There are unsaved changes in the ${this.subviews.layerEditor.model.get('textLayer')} layer.</p>`,
            done: showAnnotationEditor
        });
    }
    events() {
        return {
            'click li[data-key="layer"]': 'changeTranscription',
            'click .left-menu ul.textlayers li[data-key="transcription"]': 'showLeftTranscription',
            'click .middle-menu ul.textlayers li[data-key="transcription"]': 'changeTranscription',
            'click .menu li.subsub': function (ev) {
                return this.subviews.editFacsimiles.$el.slideToggle('fast');
            }
        };
    }
    showLeftTranscription(ev) {
        var transcription, transcriptionID;
        this.$('.left-pane iframe').hide();
        this.$('.left-pane .preview-placeholder').show();
        transcriptionID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
        transcription = this.entry.get('transcriptions').get(transcriptionID);
        config.set('entry-left-preview', transcription.get('textLayer'));
        if (this.subviews.leftPreview != null) {
            this.subviews.leftPreview.destroy();
        }
        this.subviews.leftPreview = new Preview({
            model: this.entry,
            textLayer: transcription,
            wordwrap: true
        });
        this.$('.left-pane .preview-placeholder').html(this.subviews.leftPreview.el);
        this.$('.left-menu .facsimiles li.active').removeClass('active');
        this.$('.left-menu .textlayers li.active').removeClass('active');
        this.$('.left-menu .textlayers li[data-value="' + transcriptionID + '"]').addClass('active');
        return this.entry.get('facsimiles').current = null;
    }
    showUnsavedChangesModal(args) {
        var done, html, model;
        ({ model, html, done } = args);
        if (model.changedSinceLastSave != null) {
            if (this.subviews.modal != null) {
                this.subviews.modal.destroy();
            }
            this.subviews.modal = new Modal({
                title: "Unsaved changes",
                html: html,
                submitValue: 'Discard changes',
                width: '320px'
            });
            return this.subviews.modal.on('submit', () => {
                model.cancelChanges();
                this.subviews.modal.close();
                return done();
            });
        }
        else {
            return done();
        }
    }
    changeTranscription(ev) {
        var showTranscription;
        ev.stopPropagation();
        showTranscription = () => {
            var newTranscription, transcriptionID;
            transcriptionID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
            newTranscription = this.entry.get('transcriptions').get(transcriptionID);
            if (newTranscription !== this.currentTranscription) {
                return this.entry.get('transcriptions').setCurrent(newTranscription);
            }
            else if (!this.subviews.layerEditor.visible()) {
                return this.entry.get('transcriptions').trigger('current:change', this.currentTranscription);
            }
        };
        if ((this.subviews.annotationEditor != null) && this.subviews.annotationEditor.visible()) {
            return this.showUnsavedChangesModal({
                model: this.subviews.annotationEditor.model,
                html: `<p>There are unsaved changes in annotation: ${this.subviews.annotationEditor.model.get('annotationNo')}.</p>`,
                done: showTranscription
            });
        }
        else {
            return this.showUnsavedChangesModal({
                model: this.subviews.layerEditor.model,
                html: `<p>There are unsaved changes in the ${this.subviews.layerEditor.model.get('textLayer')} layer.</p>`,
                done: showTranscription
            });
        }
    }
    addListeners() {
        this.listenTo(this.subviews.preview, 'editAnnotation', this.renderAnnotationEditor);
        this.listenTo(this.subviews.preview, 'annotation:removed', this.renderTranscriptionEditor);
        this.listenTo(this.subviews.preview, 'scrolled', (percentages) => {
            return this.subviews.layerEditor.subviews.editor.setScrollPercentage(percentages);
        });
        this.listenTo(this.subviews.layerEditor.subviews.editor, 'scrolled', (percentages) => {
            return this.subviews.preview.setScroll(percentages);
        });
        this.listenTo(this.subviews.layerEditor, 'wrap', (wrap) => {
            return this.subviews.preview.toggleWrap(wrap);
        });
        this.listenTo(this.entry.get('facsimiles'), 'current:change', (current) => {
            return this.renderFacsimile();
        });
        this.listenTo(this.entry.get('facsimiles'), 'add', this.addFacsimile);
        this.listenTo(this.entry.get('facsimiles'), 'remove', this.removeFacsimile);
        this.listenTo(this.entry.get('transcriptions'), 'current:change', (current) => {
            this.currentTranscription = current;
            return this.currentTranscription.getAnnotations((annotations) => {
                return this.renderTranscriptionEditor();
            });
        });
        this.listenTo(this.entry.get('transcriptions'), 'add', this.addTranscription);
        this.listenTo(this.entry.get('transcriptions'), 'remove', this.removeTranscription);
        return window.addEventListener('resize', (ev) => {
            return Fn.timeoutWithReset(600, () => {
                this.renderFacsimile();
                this.subviews.preview.resize();
                this.subviews.layerEditor.subviews.editor.setIframeHeight(this.subviews.preview.$el.innerHeight());
                this.subviews.layerEditor.subviews.editor.setIframeWidth(this.subviews.preview.$el.outerWidth());
                if (this.subviews.annotationEditor != null) {
                    this.subviews.annotationEditor.subviews.editor.setIframeHeight(this.subviews.preview.$el.innerHeight());
                    return this.subviews.annotationEditor.subviews.editor.setIframeWidth(this.subviews.preview.$el.outerWidth());
                }
            });
        });
    }
    addFacsimile(facsimile, collection) {
        var li;
        this.$('li[data-key="facsimiles"] span').html(`(${collection.length})`);
        li = $(`<li data-key='facsimile' data-value='${facsimile.id}'>${facsimile.get('name')}</li>`);
        this.$('.submenu .facsimiles').append(li);
        this.subviews.submenu.changeFacsimile(facsimile.id);
        this.subviews.editFacsimiles.$el.slideToggle('fast');
        return this.publish('message', `Added facsimile: \"${facsimile.get('name')}\".`);
    }
    removeFacsimile(facsimile, collection) {
        if (this.entry.get('facsimiles').current === facsimile) {
            this.entry.get('facsimiles').setCurrent();
        }
        this.$('li[data-key="facsimiles"] span').html(`(${collection.length})`);
        this.$('.submenu .facsimiles [data-value="' + facsimile.id + '"]').remove();
        return this.publish('message', `Removed facsimile: \"${facsimile.get('name')}\".`);
    }
    removeTranscription(transcription) {
        this.$('.submenu .textlayers [data-value="' + transcription.id + '"]').remove();
        return this.publish('message', `Removed text layer: \"${transcription.get('textLayer')}\".`);
    }
    addTranscription(transcription) {
        var li;
        li = $(`<li data-key='transcription' data-value='${transcription.id}'>${transcription.get('textLayer')} layer</li>`);
        this.$('.submenu .textlayers').append(li);
        this.changeTranscription(transcription.id);
        this.subviews.editFacsimiles.$el.slideToggle('fast');
        return this.publish('message', `Added text layer: \"${transcription.get('textLayer')}\".`);
    }
}
;
Entry.prototype.className = 'entry';

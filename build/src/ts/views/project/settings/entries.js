import Backbone from "backbone";
import config from "../../../models/config";
import ajax from "hilib/managers/ajax";
import EntryMetadata from "../../../entry.metadata";
import Base from "hilib/views/base";
import EditableList from "hilib/views/form/editablelist/main";
import Form from "hilib/views/form/main";
import tpl from "../../../../jade/project/settings/entries.jade";
import sortLevelsTpl from "../../../../jade/project/settings/entries.sort-levels.jade";
import setNamesTpl from "../../../../jade/project/settings/entries.set-names.jade";
export default class ProjectSettingsEntries extends Base {
    project;
    options;
    initialize(options) {
        this.options = options;
        super.initialize();
        this.project = this.options.project;
        return this.render();
    }
    render() {
        var EntryMetadataList;
        this.el.innerHTML = tpl({
            settings: this.project.get('settings').attributes
        });
        this.renderSetNames();
        this.renderSortLevels();
        EntryMetadataList = new EditableList({
            value: this.project.get('entrymetadatafields'),
            config: {
                settings: {
                    placeholder: 'Add field',
                    confirmRemove: true
                }
            }
        });
        this.listenTo(EntryMetadataList, 'confirmRemove', (id, confirm) => {
            return this.trigger('confirm', confirm, {
                html: 'You are about to delete entry metadata field: ' + id,
                submitValue: 'Remove field ' + id
            });
        });
        this.listenTo(EntryMetadataList, 'change', (values) => {
            return new EntryMetadata(this.project.id).save(values, {
                success: () => {
                    this.project.set('entrymetadatafields', values);
                    Backbone.trigger('entrymetadatafields:update', values);
                    this.publish('message', 'Entry metadata fields updated.');
                    return this.renderSortLevels();
                }
            });
        });
        this.$('.entry-list').append(EntryMetadataList.el);
        return this;
    }
    renderSetNames() {
        var setNamesForm;
        setNamesForm = new Form({
            tpl: setNamesTpl,
            model: this.project.get('settings'),
            validationAttributes: ['entry.term_singular', 'entry.term_plural']
        });
        this.listenTo(setNamesForm, 'save:success', (model) => {
            config.set('entryTermSingular', model.get('entry.term_singular'));
            config.set('entryTermPlural', model.get('entry.term_plural'));
            return Backbone.trigger('message', 'Entries names saved.');
        });
        return this.$('.set-names').html(setNamesForm.el);
    }
    renderSortLevels() {
        return this.$('.sort-levels').html(sortLevelsTpl({
            level1: this.project.get('level1'),
            level2: this.project.get('level2'),
            level3: this.project.get('level3'),
            entrymetadatafields: this.project.get('entrymetadatafields')
        }));
    }
    events() {
        return {
            'click button.savesortlevels': 'saveSortLevels',
            'click .set-names form input[type="submit"]': 'submitSetCustomNames',
            'keyup .set-names form input[type="text"]': function (ev) {
                return this.$('.set-names form input[type="submit"]').removeClass('inactive');
            },
            'change .sort-levels select': function (ev) {
                return this.$('.sort-levels form button').removeClass('inactive');
            }
        };
    }
    submitSetCustomNames(ev) {
        var i, input, len, ref;
        ev.preventDefault();
        ref = this.el.querySelectorAll('.set-names form input[type="text"]');
        for (i = 0, len = ref.length; i < len; i++) {
            input = ref[i];
            this.project.get('settings').set(input.name, input.value);
        }
        return this.trigger('savesettings', ev);
    }
    saveSortLevels(ev) {
        var i, jqXHR, len, ref, select, sortlevels;
        ev.preventDefault();
        if (this.$('.sort-levels form button').hasClass('inactive')) {
            return;
        }
        sortlevels = [];
        ref = this.$('.sort-levels select');
        for (i = 0, len = ref.length; i < len; i++) {
            select = ref[i];
            sortlevels.push(select.value);
        }
        this.$('button.savesortlevels').addClass('loading');
        jqXHR = ajax.put({
            url: `${config.get('restUrl')}projects/${this.project.id}/sortlevels`,
            data: JSON.stringify(sortlevels)
        });
        jqXHR.done(() => {
            this.$('button.savesortlevels').removeClass('loading');
            this.project.set({
                level1: sortlevels[0],
                level2: sortlevels[1],
                level3: sortlevels[2]
            });
            this.$('.sort-levels form button').addClass('inactive');
            return this.publish('message', 'Entry sort levels saved.');
        });
        return jqXHR.fail(() => {
            return this.$('button.savesortlevels').removeClass('loading');
        });
    }
}
;
ProjectSettingsEntries.prototype.className = 'entries';

import Backbone from "backbone";
import _ from "underscore";
import Search from "../models/search";
import tpl from "../../jade/text-search.jade";
import funcky from "funcky.util";
export default class TextSearch extends Backbone.View {
    options;
    initialize(options) {
        this.options = options;
        return this.setModel();
    }
    _addFullTextSearchParameters() {
        var ftsp, i, len, param, params;
        ftsp = this.options.config.get('textSearchOptions').fullTextSearchParameters;
        if (ftsp != null) {
            params = [];
            for (i = 0, len = ftsp.length; i < len; i++) {
                param = ftsp[i];
                params.push({
                    name: param,
                    term: "*"
                });
            }
            return this.model.set({
                fullTextSearchParameters: params
            });
        }
    }
    setModel() {
        var attrs, textSearchOptions;
        if (this.model != null) {
            this.stopListening(this.model);
        }
        textSearchOptions = this.options.config.get('textSearchOptions');
        attrs = _.clone(textSearchOptions);
        if (textSearchOptions.caseSensitive) {
            attrs.caseSensitive = false;
        }
        else {
            delete attrs.caseSensitive;
        }
        if (textSearchOptions.fuzzy) {
            attrs.fuzzy = false;
        }
        else {
            delete attrs.fuzzy;
        }
        this.model = new Search(attrs);
        this._addFullTextSearchParameters();
        return this.listenTo(this.options.config, "change:textSearchOptions", () => {
            this._addFullTextSearchParameters();
            return this.render();
        });
    }
    render() {
        if (this.options.config.get('templates').hasOwnProperty('text-search')) {
            tpl = this.options.config.get('templates')['text-search'];
        }
        this.$el.html(tpl({
            model: this.model,
            config: this.options.config,
            generateId: funcky.generateID
        }));
        return this;
    }
    events() {
        return {
            'click i.fa-search': 'search',
            'keyup input[name="search"]': 'onKeyUp',
            'focus input[name="search"]': function () {
                return this.$('.body .menu').slideDown(150);
            },
            'click .menu .fa-times': function () {
                return this.$('.body .menu').slideUp(150);
            },
            'change input[type="checkbox"]': 'checkboxChanged'
        };
    }
    onKeyUp(ev) {
        var clone, field, i, len;
        if (ev.keyCode === 13) {
            ev.preventDefault();
            return this.search(ev);
        }
        if (this.model.has('term')) {
            if (this.model.get('term') !== ev.currentTarget.value) {
                this.model.set({
                    term: ev.currentTarget.value
                });
            }
        }
        else {
            clone = _.clone(this.model.get('fullTextSearchParameters'));
            for (i = 0, len = clone.length; i < len; i++) {
                field = clone[i];
                field.term = ev.currentTarget.value;
            }
            this.model.set({
                fullTextSearchParameters: clone
            });
        }
        return this.updateQueryModel();
    }
    checkboxChanged(ev) {
        var attr, cb, checkedArray, dataAttr, dataAttrArray, i, j, len, len1, ref, ref1;
        dataAttr = ev.currentTarget.getAttribute('data-attr');
        dataAttrArray = ev.currentTarget.getAttribute('data-attr-array');
        if (attr = dataAttr) {
            if (attr === 'searchInTranscriptions') {
                this.$('ul.textlayers').toggle(ev.currentTarget.checked);
            }
            this.model.set(attr, ev.currentTarget.checked);
        }
        else if (dataAttrArray === 'fullTextSearchParameters') {
            checkedArray = [];
            ref = this.el.querySelectorAll('[data-attr-array="fullTextSearchParameters"]');
            for (i = 0, len = ref.length; i < len; i++) {
                cb = ref[i];
                if (cb.checked) {
                    checkedArray.push({
                        name: cb.getAttribute('data-value'),
                        term: this.$('input[name="search"]').val()
                    });
                }
            }
            this.model.set(dataAttrArray, checkedArray);
        }
        else if (dataAttrArray != null) {
            checkedArray = [];
            ref1 = this.el.querySelectorAll(`[data-attr-array=\"${dataAttrArray}\"]`);
            for (j = 0, len1 = ref1.length; j < len1; j++) {
                cb = ref1[j];
                if (cb.checked) {
                    checkedArray.push(cb.getAttribute('data-value'));
                }
            }
            this.model.set(dataAttrArray, checkedArray);
        }
        return this.updateQueryModel();
    }
    search(ev) {
        ev.preventDefault();
        return this.trigger('search');
    }
    updateQueryModel() {
        return this.trigger('change', this.model.attributes);
    }
    reset() {
        this.setModel();
        return this.render();
    }
    destroy() {
        return this.remove();
    }
}
TextSearch.prototype.className = 'text-search';

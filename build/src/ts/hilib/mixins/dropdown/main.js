import Backbone from "backbone";
import _ from "underscore";
import $ from "jquery";
import Fn from "../../utils/general";
import optionMixin from "./options";
import mainTpl from "./main.jade";
export default {
    dropdownInitialize: function () {
        var base, base1, base2, base3, models, ref, ref1;
        if ((base = this.options).config == null) {
            base.config = {};
        }
        this.data = (ref = this.options.config.data) != null ? ref : {};
        this.settings = (ref1 = this.options.config.settings) != null ? ref1 : {};
        if ((base1 = this.settings).mutable == null) {
            base1.mutable = false;
        }
        if ((base2 = this.settings).editable == null) {
            base2.editable = false;
        }
        if ((base3 = this.settings).defaultAdd == null) {
            base3.defaultAdd = true;
        }
        this.selected = null;
        if (this.data instanceof Backbone.Collection) {
            this.collection = this.data;
        }
        else if (_.isArray(this.data) && _.isString(this.data[0])) {
            models = this.strArray2optionArray(this.data);
            this.collection = new Backbone.Collection(models);
        }
        else {
            console.error('No valid data passed to dropdown');
        }
        this.filtered_options = this.collection.clone();
        _.extend(this.filtered_options, optionMixin);
        if (this.settings.mutable) {
            this.listenTo(this.collection, 'add', (model, collection, options) => {
                this.selected = model;
                return this.triggerChange();
            });
        }
        this.listenTo(this.collection, 'add', (model, collection, options) => {
            this.trigger('change:data', this.collection.models);
            return this.filtered_options.add(model);
        });
        this.listenTo(this.filtered_options, 'add', this.renderOptions);
        this.listenTo(this.filtered_options, 'reset', this.renderOptions);
        this.listenTo(this.filtered_options, 'currentOption:change', (model) => {
            return this.$('li[data-id="' + model.id + '"]').addClass('active');
        });
        this.on('change', () => {
            return this.resetOptions();
        });
        return this.delegateEvents();
    },
    dropdownRender: function (tpl) {
        var rtpl;
        if (this.preDropdownRender != null) {
            this.preDropdownRender();
        }
        rtpl = tpl({
            viewId: this.cid,
            selected: this.selected,
            settings: this.settings
        });
        this.$el.html(rtpl);
        this.$optionlist = this.$('ul.list');
        this.renderOptions();
        this.$('input').focus();
        $('body').click((ev) => {
            if (!(this.el === ev.target || Fn.isDescendant(this.el, ev.target))) {
                return this.hideOptionlist();
            }
        });
        if (this.settings.inputClass != null) {
            this.$('input').addClass(this.settings.inputClass);
        }
        if (this.postDropdownRender != null) {
            this.postDropdownRender();
        }
        return this;
    },
    renderOptions: function () {
        var rtpl;
        rtpl = mainTpl({
            collection: this.filtered_options,
            selected: this.selected
        });
        return this.$optionlist.html(rtpl);
    },
    dropdownEvents: function (cid) {
        var evs;
        evs = {
            'click .caret': 'toggleList',
            'click li.list': 'addSelected'
        };
        evs['keyup input[data-view-id="' + cid + '"]'] = 'onKeyup';
        evs['keydown input[data-view-id="' + cid + '"]'] = 'onKeydown';
        return evs;
    },
    toggleList: function (ev) {
        this.$optionlist.toggle();
        return this.$('input').focus();
    },
    onKeydown: function (ev) {
        if (ev.keyCode === 38 && this.$optionlist.is(':visible')) {
            return ev.preventDefault();
        }
    },
    onKeyup: function (ev) {
        this.$('.active').removeClass('active');
        if (ev.keyCode === 38) {
            this.$optionlist.show();
            return this.filtered_options.prev();
        }
        else if (ev.keyCode === 40) {
            this.$optionlist.show();
            return this.filtered_options.next();
        }
        else if (ev.keyCode === 13) {
            return this.addSelected(ev);
        }
        else if (ev.keyCode === 27) {
            return this.$optionlist.hide();
        }
        else {
            return this.filter(ev.currentTarget.value);
        }
    },
    destroy: function () {
        $('body').off('click');
        return this.remove();
    },
    resetOptions: function () {
        this.filtered_options.reset(this.collection.reject((model) => {
            return this.selected.get(model.id) != null;
        }));
        this.filtered_options.resetCurrentOption();
        return this.hideOptionlist();
    },
    hideOptionlist: function () {
        return this.$optionlist.hide();
    },
    filter: function (value) {
        var models, re;
        if (this.settings.editable) {
            this.$('button.edit').removeClass('visible');
        }
        this.resetOptions();
        if (value.length > 1) {
            value = Fn.escapeRegExp(value);
            re = new RegExp(value, 'i');
            models = this.collection.filter(function (model) {
                return re.test(model.get('title'));
            });
            if (models.length > 0) {
                this.filtered_options.reset(models);
                this.$optionlist.show();
            }
        }
        if (this.postDropdownFilter != null) {
            return this.postDropdownFilter(models);
        }
    },
    strArray2optionArray: function (strArray) {
        return _.map(strArray, function (item) {
            return {
                id: item,
                title: item
            };
        });
    }
};

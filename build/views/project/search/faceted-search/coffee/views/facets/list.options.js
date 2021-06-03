import Backbone from "backbone";
import $ from "jquery";
import _ from "underscore";
import funcky from "funcky.util";
import bodyTpl from "../../../jade/facets/list.body.jade";
import optionTpl from "../../../jade/facets/list.option.jade";
class ListFacetOptions extends Backbone.View {
    config;
    facetName;
    optionTpl = optionTpl;
    bodyTpl = bodyTpl;
    showingCursor;
    showingIncrement;
    constructor() {
        super(...arguments);
        this.triggerChange = this.triggerChange.bind(this);
    }
    initialize(options) {
        this.config = options.config;
        this.facetName = options.facetName;
        this.listenTo(this.collection, 'sort', () => {
            return this.rerender();
        });
        this.listenTo(this.collection, 'reset', () => {
            this.collection.orderBy('amount_desc', true);
            return this.render();
        });
        if (this.config.get('templates').hasOwnProperty('list.option')) {
            this.optionTpl = this.config.get('templates')['list.option'];
        }
        return this.render();
    }
    render() {
        this.showingCursor = 0;
        this.showingIncrement = 50;
        if (this.config.get('templates').hasOwnProperty('list.body')) {
            this.bodyTpl = this.config.get('templates')['list.body'];
        }
        this.$el.html(this.bodyTpl({
            facetName: this.facetName
        }));
        this.appendOptions();
        return this;
    }
    rerender() {
        var i, model, tpl, visible;
        tpl = '';
        i = 0;
        model = this.collection.at(i);
        visible = model.get('visible');
        while (visible) {
            tpl += this.optionTpl({
                option: model
            });
            i = i + 1;
            model = this.collection.at(i);
            visible = (model != null) && model.get('visible') ? true : false;
        }
        return this.el.querySelector('ul').innerHTML = tpl;
    }
    appendOptions(all = false) {
        var model, tpl;
        if (all) {
            this.showingIncrement = this.collection.length;
        }
        tpl = '';
        while (this.showingCursor < this.showingIncrement && this.showingCursor < this.collection.length) {
            model = this.collection.at(this.showingCursor);
            model.set('visible', true);
            tpl += this.optionTpl({
                option: model
            });
            this.showingCursor = this.showingCursor + 1;
        }
        return this.$('ul').append(tpl);
    }
    renderAll() {
        return this.collection.setAllVisible();
    }
    events() {
        return {
            'click li': 'checkChanged',
            'scroll': 'onScroll'
        };
    }
    onScroll(ev) {
        var target, topPerc;
        if (this.showingCursor < this.collection.length) {
            target = ev.currentTarget;
            topPerc = target.scrollTop / target.scrollHeight;
            if (topPerc > (this.showingCursor / 2) / this.collection.length) {
                this.showingIncrement += this.showingIncrement;
                return this.appendOptions();
            }
        }
    }
    checkChanged(ev) {
        var $target, id;
        $target = $(ev.currentTarget);
        id = $target.attr('data-value');
        $target.toggleClass('checked');
        this.collection.get(id).set('checked', $target.hasClass('checked'));
        if (this.$('li.checked').length === 0 || !this.config.get('autoSearch')) {
            return this.triggerChange();
        }
        else {
            return funcky.setResetTimeout(1000, () => {
                return this.triggerChange();
            });
        }
    }
    triggerChange(values = []) {
        var checkedModels;
        if (values == null) {
            checkedModels = this.collection.filter(function (item) {
                return item.get('checked');
            });
            values = _.map(checkedModels, function (item) {
                return item.get('name');
            });
        }
        return this.trigger('change', {
            facetValue: {
                name: this.facetName,
                values: values
            }
        });
    }
    filterOptions(value) {
        this.collection.map(function (model) {
            var re;
            re = new RegExp(value, 'i');
            return model.set('visible', re.test(model.id));
        });
        this.collection.sort();
        return this.trigger('filter:finished');
    }
    setCheckboxes(ev) {
        var j, len, model, values, visibleModels;
        visibleModels = this.collection.filter(function (model) {
            return model.get('visible');
        });
        for (j = 0, len = visibleModels.length; j < len; j++) {
            model = visibleModels[j];
            model.set('checked', ev.currentTarget.checked);
        }
        if (ev.currentTarget.checked) {
            values = _.map(visibleModels, function (item) {
                return item.get('name');
            });
            return this.triggerChange(values);
        }
        else {
            return this.triggerChange();
        }
    }
}
;
ListFacetOptions.prototype.className = 'container';

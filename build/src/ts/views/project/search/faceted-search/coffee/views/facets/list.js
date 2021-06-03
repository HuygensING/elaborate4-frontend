import $ from "jquery";
import _ from "underscore";
import List from "../../models/facets/list";
import OptionsCollection from "../../collections/list.options";
import Facet from "./main";
import Options from "./list.options";
import menuTpl from "../../../jade/facets/list.menu.jade";
export default class ListFacet extends Facet {
    resetActive;
    optionsView;
    collection = new OptionsCollection();
    initialize(options) {
        super.initialize();
        this.resetActive = false;
        this.config = options.config;
        this.model = new List(options.attrs, {
            parse: true
        });
        this.collection = new OptionsCollection(options.attrs.options, {
            parse: true
        });
        return this.render();
    }
    render() {
        var menu;
        super.render();
        if (this.$('header .options').length > 0) {
            if (this.config.get('templates').hasOwnProperty('list.menu')) {
                menuTpl = this.config.get('templates')['list.menu'];
            }
            menu = menuTpl({
                model: this.model.attributes
            });
            this.$('header .options').html(menu);
        }
        this.optionsView = new Options({
            collection: this.collection,
            facetName: this.model.get('name'),
            config: this.config
        });
        this.$('.body').html(this.optionsView.el);
        this.listenTo(this.optionsView, 'filter:finished', this.renderFilteredOptionCount);
        this.listenTo(this.optionsView, 'change', (data) => {
            return this.trigger('change', data);
        });
        if (this.collection.length <= 3) {
            this.$('header i.openclose').hide();
        }
        return this;
    }
    postRender() {
        var el;
        el = this.el.querySelector('.body > .container');
        if (el.scrollHeight > el.clientHeight) {
            return this.$el.addClass('with-scrollbar');
        }
    }
    renderFilteredOptionCount() {
        var filteredModels, ref, value, visibleModels;
        visibleModels = this.collection.filter(function (model) {
            return model.get('visible');
        });
        value = (0 < (ref = visibleModels.length) && ref < 21) ? 'visible' : 'hidden';
        this.$('input[type="checkbox"][name="all"]').css('visibility', value);
        filteredModels = this.collection.filter(function (model) {
            return model.get('visible');
        });
        if (filteredModels.length === 0 || filteredModels.length === this.collection.length) {
            this.$('header .options input[name="filter"]').addClass('nonefound');
        }
        else {
            this.$('header .options input[name="filter"]').removeClass('nonefound');
        }
        this.$('header small.optioncount').html(filteredModels.length + ' of ' + this.collection.length);
        return this;
    }
    events() {
        return _.extend({}, super.events, {
            'keyup input[name="filter"]': function (ev) {
                return this.optionsView.filterOptions(ev.currentTarget.value);
            },
            'change header .options input[type="checkbox"][name="all"]': function (ev) {
                return this.optionsView.setCheckboxes(ev);
            },
            'click header .menu i.filter': 'toggleFilterMenu',
            'click header .menu i.alpha': 'changeOrder',
            'click header .menu i.amount': 'changeOrder'
        });
    }
    toggleFilterMenu() {
        var filterIcon, optionsDiv;
        optionsDiv = this.$('header .options');
        filterIcon = this.$('i.filter');
        filterIcon.toggleClass('active');
        return optionsDiv.slideToggle(150, () => {
            var input;
            input = optionsDiv.find('input[name="filter"]');
            if (filterIcon.hasClass('active')) {
                input.focus();
                this.optionsView.appendOptions(true);
                return this.renderFilteredOptionCount();
            }
            else {
                input.val('');
                return this.collection.setAllVisible();
            }
        });
    }
    changeOrder(ev) {
        var $target, order, type;
        if (!this.$('i.filter').hasClass('active')) {
            this.optionsView.renderAll();
        }
        $target = $(ev.currentTarget);
        if ($target.hasClass('active')) {
            if ($target.hasClass('alpha')) {
                $target.toggleClass('fa-sort-alpha-desc');
                $target.toggleClass('fa-sort-alpha-asc');
            }
            else if ($target.hasClass('amount')) {
                $target.toggleClass('fa-sort-amount-desc');
                $target.toggleClass('fa-sort-amount-asc');
            }
        }
        else {
            this.$('i.amount.active').removeClass('active');
            this.$('i.alpha.active').removeClass('active');
            $target.addClass('active');
        }
        type = $target.hasClass('alpha') ? 'alpha' : 'amount';
        order = $target.hasClass('fa-sort-' + type + '-desc') ? 'desc' : 'asc';
        return this.collection.orderBy(type + '_' + order);
    }
    update(newOptions) {
        if (this.resetActive) {
            this.collection.reset(newOptions, {
                parse: true
            });
            return this.resetActive = false;
        }
        else {
            return this.collection.updateOptions(newOptions);
        }
    }
    reset() {
        this.resetActive = true;
        if (this.$('i.filter').hasClass('active')) {
            return this.toggleFilterMenu();
        }
    }
    revert() {
        if (this.$('i.filter').hasClass('active')) {
            this.toggleFilterMenu();
        }
        this.collection.revert();
        return this.collection.sort();
    }
}
;

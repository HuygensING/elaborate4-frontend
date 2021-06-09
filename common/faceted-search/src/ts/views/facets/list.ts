import $ from "jquery"
import _ from "underscore"
import List from "../../models/facets/list"
import { ListOptions } from "../../collections/list.options"
import Facet from "./main"
import Options from "./list.options"
import menuTpl from "../../../jade/facets/list.menu.jade"
import { className } from "@elaborate4-frontend/hilib"

@className('facet list')
export class ListFacet extends Facet {
  declare collection: ListOptions
  optionsView
  resetActive

  constructor(options) {
    super(options)
    this.resetActive = false;
    this.model = new List(options.attrs, { parse: true })
    this.collection = new ListOptions(options.attrs.options, { parse: true })
    this.render()
  }

  // ### Render
  render() {
    super.render();
    if (this.$('header .options').length > 0) {
      let theTemplate = menuTpl
      if (this.config.get('templates').hasOwnProperty('list.menu')) {
        theTemplate = this.config.get('templates')['list.menu'];
      }
      const menu = theTemplate({ model: this.model.attributes })
      this.$('header .options').html(menu)
    }
    this.optionsView = new Options({
      collection: this.collection,
      facetName: this.model.get('name'),
      config: this.config
    });
    this.$('.body').html(this.optionsView.el);
    this.listenTo(this.optionsView, 'filter:finished', this.renderFilteredOptionCount);
    // Pass through the change event
    this.listenTo(this.optionsView, 'change', (data) => {
      return this.trigger('change', data);
    });
    if (this.collection.length <= 3) {
      this.$('header i.openclose').hide();
    }
    return this;
  }

  postRender = () => {
    const el = this.el.querySelector('.body > .container');
    if (el.scrollHeight > el.clientHeight) {
      return this.$el.addClass('with-scrollbar');
    }
  }

  // Renders the count of the filtered options (ie: "3 of 8") next to the filter <input>
  renderFilteredOptionCount() {
    var filteredModels, ref, value, visibleModels;
    // filteredLength = @optionsView.filtered_items.length
    // collectionLength = @optionsView.collection.length
    visibleModels = this.collection.filter(function(model) {
      return model.get('visible');
    });
    value = (0 < (ref = visibleModels.length) && ref < 21) ? 'visible' : 'hidden';
    this.$('input[type="checkbox"][name="all"]').css('visibility', value);
    filteredModels = this.collection.filter(function(model) {
      return model.get('visible');
    });
    if (filteredModels.length === 0 || filteredModels.length === this.collection.length) {
      this.$('header .options input[name="filter"]').addClass('nonefound');
    } else {
      // @$('header small.optioncount').html ''
      this.$('header .options input[name="filter"]').removeClass('nonefound');
    }
    this.$('header small.optioncount').html(filteredModels.length + ' of ' + this.collection.length);
    return this;
  }

  // ### Events
  events() {
    return _.extend({}, super.events, {
      'keyup input[name="filter"]': function(ev) {
        return this.optionsView.filterOptions(ev.currentTarget.value);
      },
      'change header .options input[type="checkbox"][name="all"]': function(ev) {
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
      } else {
        input.val('');
        return this.collection.setAllVisible();
      }
    });
  }

  changeOrder(ev) {
    var $target, order, type;
    if (!this.$('i.filter').hasClass('active')) {
      // When changing the order, all the items must be active (set to visible).
      // Unless the filter menu is active, than we only change the order of the
      // filtered items.
      this.optionsView.renderAll();
    }
    $target = $(ev.currentTarget);
    if ($target.hasClass('active')) {
      if ($target.hasClass('alpha')) {
        $target.toggleClass('fa-sort-alpha-desc');
        $target.toggleClass('fa-sort-alpha-asc');
      } else if ($target.hasClass('amount')) {
        $target.toggleClass('fa-sort-amount-desc');
        $target.toggleClass('fa-sort-amount-asc');
      }
    } else {
      // Use amount and alpha in selectors, because otherwise an active
      // filter would also be removed
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
      } as any);
      return this.resetActive = false;
    } else {
      return this.collection.updateOptions(newOptions);
    }
  }

  reset() {
    this.resetActive = true;
    if (this.$('i.filter').hasClass('active')) {
      return this.toggleFilterMenu();
    }
  }

  /*
  Alias for reset, but used for different implementation. This should be the base
  of the original reset, but no time for proper refactor. Current project (ebnm)
  doesn't have a reset button, so harder to test.

  TODO refactor @reset.
  */
  revert() {
    if (this.$('i.filter').hasClass('active')) {
      this.toggleFilterMenu();
    }
    this.collection.revert();
    return this.collection.sort();
  }
}

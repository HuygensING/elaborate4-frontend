import Backbone from "backbone"
import $ from "jquery"
import funckyEl from 'funcky.el'
const el = funckyEl.el
import tpl from "./sort.jade"

// @options
// 	project	Backbone.Model The current project
export default class SortLevels extends Backbone.View {
  onMouseleave

  // ### Initialize
  /*
  @param {object} this.options
  @param {Backbone.Model} this.options.config
  */
  constructor(private options?) {
    super({ ...options, className: 'sort-levels', tagName: 'li' })
    this.render()
    this.listenTo(this.options.config, 'change:entryMetadataFields', this.render);
    this.listenTo(this.options.config, 'change:levels', (model, sortLevels) => {
      const sortParameters = [];
      for (let j = 0, len = sortLevels.length; j < len; j++) {
        const level = sortLevels[j];
        sortParameters.push({
          fieldname: level,
          direction: 'asc'
        });
      }
      this.trigger('change', sortParameters);
      this.render();
    });
  }

  // ### Render
  render() {
    var leave, levels, rtpl;
    rtpl = tpl({
      levels: this.options.config.get('levels'),
      entryMetadataFields: this.options.config.get('entryMetadataFields')
    });
    this.$el.html(rtpl);
    levels = this.$('div.levels');
    leave = function(ev) {
      if (!(el(levels[0]).hasDescendant(ev.target) || levels[0] === ev.target)) {
        // The leave event is triggered when the user clicks the <select>,
        // so we check if the target isn't part of div.levels
        return levels.hide();
      }
    };
    this.onMouseleave = leave.bind(this);
    levels.on('mouseleave', this.onMouseleave);
    return this
  }

  // ### Events
  events() {
    return {
      'click button.toggle': 'toggleLevels',
      'click li.search button': 'saveLevels',
      'change div.levels select': 'changeLevels',
      'click div.levels i.fa': 'changeAlphaSort'
    };
  }

  toggleLevels(ev) {
    return this.$('div.levels').toggle();
  }

  hideLevels() {
    return this.$('div.levels').hide();
  }

  changeLevels(ev) {
    var $target, i, j, k, len, len1, ref, ref1, results, select, target;
    this.$('div.levels').addClass('show-save-button');
    target = ev.currentTarget;
    ref = this.el.querySelectorAll('div.levels select');
    // Loop the selects.
    for (j = 0, len = ref.length; j < len; j++) {
      select = ref[j];
      if (select.name !== target.name && select.value === target.value) {
        // Set a select to empty if it has the same value as the user has selected.
        select.selectedIndex = 0;
      }
    }
    ref1 = this.el.querySelectorAll('div.levels i.fa');
    // Reset all selects to ascending.
    results = [];
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      i = ref1[k];
      $target = this.$(i);
      $target.addClass('fa-sort-alpha-asc');
      results.push($target.removeClass('fa-sort-alpha-desc'));
    }
    return results;
  }

  changeAlphaSort(ev) {
    var $target;
    this.$('div.levels').addClass('show-save-button');
    $target = this.$(ev.currentTarget);
    $target.toggleClass('fa-sort-alpha-asc');
    return $target.toggleClass('fa-sort-alpha-desc');
  }

  saveLevels() {
    var j, len, li, ref, select, sortParameter, sortParameters;
    sortParameters = [];
    ref = this.el.querySelectorAll('div.levels li[name]');
    for (j = 0, len = ref.length; j < len; j++) {
      li = ref[j];
      select = li.querySelector('select');
      sortParameter = {};
      sortParameter.fieldname = select.options[select.selectedIndex].value;
      sortParameter.direction = $(li).find('i.fa').hasClass('fa-sort-alpha-asc') ? 'asc' : 'desc';
      sortParameters.push(sortParameter);
    }
    this.hideLevels();
    return this.trigger('change', sortParameters);
  }

  destroy() {
    this.$('div.levels').off('mouseleave', this.onMouseleave);
    return this.remove();
  }

};

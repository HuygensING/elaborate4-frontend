import Backbone from "backbone"
import $ from "jquery"
import { BaseView, className, dom, tagName } from '@elaborate4-frontend/hilib'
import tpl from "./templates/main.jade"


@tagName('li')
@className('sort-levels')
export class SortLevels extends BaseView {
  // ### Initialize
  constructor(private options: any = {}) {
    super(options)
    this.render()
  }

  // ### Render
  render() {
    var levels, rtpl;
    rtpl = tpl({
      levels: this.options.levels,
      entryMetadataFields: this.options.entryMetadataFields
    })
    this.$el.html(rtpl)
    this.listenTo(Backbone, 'sortlevels:update', (sortLevels) => {
      var j, len, level, sortParameters;
      this.options.levels = sortLevels;
      sortParameters = [];
      for (j = 0, len = sortLevels.length; j < len; j++) {
        level = sortLevels[j];
        sortParameters.push({
          fieldname: level,
          direction: 'asc'
        })
      }
      this.trigger('change', sortParameters)
      this.render()
    })
    this.listenTo(Backbone, 'entrymetadatafields:update', (fields) => {
      this.options.entryMetadataFields = fields;
      this.render()
    })
    // TODO turn off on destroy
    levels = this.$('div.levels')
    return levels.mouseleave((ev) => {
      if (!(dom(levels[0]).hasDescendant(ev.target) || levels[0] === ev.target)) {
        // The leave event is triggered when the user clicks the <select>,
        // so we check if the target isn't part of div.levels
        return levels.hide()
      }
    })
  }

  // ### Events
  events() {
    return {
      'click button.toggle': 'toggleLevels',
      'click li.search button': 'saveLevels',
      'change div.levels select': 'changeLevels',
      'click div.levels i.fa': 'changeAlphaSort'
    }
  }

  toggleLevels(ev) {
    return this.$('div.levels').toggle()
  }

  hideLevels() {
    return this.$('div.levels').hide()
  }

  changeLevels(ev) {
    var $target, i, j, k, len, len1, ref, ref1, results, select, target;
    this.$('div.levels').addClass('show-save-button')
    target = ev.currentTarget;
    ref = this.el.querySelectorAll('div.levels select')
    // Loop the selects.
    for (j = 0, len = ref.length; j < len; j++) {
      select = ref[j];
      if (select.name !== target.name && select.value === target.value) {
        // Set a select to empty if it has the same value as the user has selected.
        select.selectedIndex = 0;
      }
    }
    ref1 = this.el.querySelectorAll('div.levels i.fa')
    // Reset all selects to ascending.
    results = [];
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      i = ref1[k];
      $target = this.$(i)
      $target.addClass('fa-sort-alpha-asc')
      results.push($target.removeClass('fa-sort-alpha-desc'))
    }
    return results;
  }

  changeAlphaSort(ev) {
    var $target;
    this.$('div.levels').addClass('show-save-button')
    $target = this.$(ev.currentTarget)
    $target.toggleClass('fa-sort-alpha-asc')
    return $target.toggleClass('fa-sort-alpha-desc')
  }

  saveLevels() {
    var j, len, li, ref, select, sortParameter, sortParameters;
    sortParameters = [];
    ref = this.el.querySelectorAll('div.levels li[name]')
    for (j = 0, len = ref.length; j < len; j++) {
      li = ref[j];
      select = li.querySelector('select')
      sortParameter = {}
      sortParameter.fieldname = select.options[select.selectedIndex].value;
      sortParameter.direction = $(li).find('i.fa').hasClass('fa-sort-alpha-asc') ? 'asc' : 'desc';
      sortParameters.push(sortParameter)
    }
    this.hideLevels()
    return this.trigger('change', sortParameters)
  }

}

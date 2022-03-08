import Backbone from "backbone"
import $ from "jquery"
import _ from "underscore"
import { util } from "@elaborate4-frontend/funcky"
import bodyTpl from "../../../jade/facets/list.body.jade"
import optionTpl from "../../../jade/facets/list.option.jade"
import { ListOptions } from "../../collections/list.options"
import { className } from "@elaborate4-frontend/hilib"

@className('container')
export default class ListFacetOptions extends Backbone.View {
  config
  facetName
  showingCursor
  showingIncrement
  declare collection: ListOptions
  optionTpl = optionTpl

  // ### Initialize
  constructor(options) {
    super(options)

    this.config = options.config
    this.facetName = options.facetName

    this.listenTo(this.collection, 'sort', () => this.rerender());

    this.listenTo(this.collection, 'reset', () => {
      // TODO fix? orderBy does not exist?
      // @ts-ignore
      this.collection.orderBy('amount_desc', true);
      this.render();
    });

    if (this.config.get('templates').hasOwnProperty('list.option')) {
      this.optionTpl = this.config.get('templates')['list.option']
    }

    this.render()
  }

  // ### Render
  render() {
    this.showingCursor = 0
    this.showingIncrement = 50

    let theTemplate = bodyTpl
    if (this.config.get('templates').hasOwnProperty('list.body')) {
      theTemplate = this.config.get('templates')['list.body']
    }

    this.$el.html(theTemplate({
      facetName: this.facetName
    }))

    // Set the height of the <ul> dynamically, to prevent glitches
    // when the options are rendered on scrolling.
    // ul.style.height =  (@filtered_items.length * 15) + 'px'
    this.appendOptions()

    return this
  }

  private rerender() {
    let tpl = '';
    let i = 0;
    let model = this.collection.at(i);
    let visible = model.get('visible');
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

  private appendOptions(appendAllOptions = false) {
    if (appendAllOptions) this.showingIncrement = this.collection.length;

    let tpl = ''
    while (
      this.showingCursor < this.showingIncrement &&
      this.showingCursor < this.collection.length
    ) {
      const model = this.collection.at(this.showingCursor)
      model.set('visible', true)
      tpl += this.optionTpl({
        option: model
      })
      this.showingCursor = this.showingCursor + 1
    }

    return this.$('ul').append(tpl);
  }

  renderAll() {
    // When all models are set to visible, the collection is sorted and
    // @rerender is called.
    return this.collection.setAllVisible();
  }

  // ### Events
  events() {
    return {
      'click li': 'checkChanged',
      // 'click label': 'checkChanged'
      'scroll': 'onScroll'
    };
  }

  // When scolling lazy render the rest of the options. This speeds up page load.
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
    // $target = if ev.currentTarget.tagName is 'LABEL' then @$ 'i[data-value="'+ev.currentTarget.getAttribute('data-value')+'"]' else $ ev.currentTarget
    $target = $(ev.currentTarget);
    id = $target.attr('data-value');
    $target.toggleClass('checked');
    // checked = $target.find("i.checked")
    // unchecked = $target.find("i.unchecked")

    // # Don't use $.toggle, because it will toggle the <i> set to display:none
    // # to display: inline, instead of inline-block.
    // if checked.is(':visible')
    // 	checked.hide()
    // 	unchecked.css 'display', 'inline-block'
    // else
    // 	checked.css 'display', 'inline-block'
    // 	unchecked.hide()
    this.collection.get(id).set('checked', $target.hasClass('checked'));

    // If there are no checked options or autoSearch is off (false), than triggerChange,
    // otherwise (autoSearch is true and there are options checked), set a 1s timeout to
    // give the user time to check another option before autoSearch kicks in.
    return (this.$('li.checked').length === 0 || !this.config.get('autoSearch')) ?
      this.triggerChange() :
      util.setResetTimeout(1000, () => this.triggerChange())
  }

  triggerChange = (values = []) => {
    if (values == null || !values.length) {
      values = this.collection
        .filter(item => item.get('checked'))
        .map(item => item.get('name'))
    }

    return this.trigger('change', {
      facetValue: {
        name: this.facetName,
        values: values
      }
    })
  }

  // ### Methods
  /*
  Called by parent (ListFacet) when user types in the search input
  */
  filterOptions(value) {
    this.collection.map(function(model) {
      var re;
      re = new RegExp(value, 'i');
      return model.set('visible', re.test(model.id));
    });
    // @filtered_items = @collection.models if @filtered_items.length is 0
    this.collection.sort();
    return this.trigger('filter:finished');
  }

  // @render()
  setCheckboxes(ev) {
    var j, len, model, values, visibleModels;
    visibleModels = this.collection.filter(function(model) {
      return model.get('visible');
    });
    for (j = 0, len = visibleModels.length; j < len; j++) {
      model = visibleModels[j];
      model.set('checked', ev.currentTarget.checked);
    }
    if (ev.currentTarget.checked) {
      values = _.map(visibleModels, function(item) {
        return item.get('name');
      });
      return this.triggerChange(values);
    } else {
      return this.triggerChange();
    }
  }

};

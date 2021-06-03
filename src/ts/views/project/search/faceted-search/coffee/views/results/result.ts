/*
@class Result
@extends Backbone.View
*/
const hasProp = {}.hasOwnProperty

import Backbone from "backbone"

import tpl from "./result.jade"

export default class Result extends Backbone.View {
  /*
  @param {object} [options={}]
  @prop {object} options.data - The data of the result.
  @prop {boolean} [options.fulltext=false] - Is the result coming from a full text search?
  @constructs
  */
  constructor(private options?) {
    super({ ...options, className: 'result', tagName: 'li' })

    var base;
    if ((base = this.options).fulltext == null) {
      base.fulltext = false;
    }
    if (this.options.fulltext) {
      this.$el.addClass('fulltext');
    } else {
      this.$el.addClass('no-fulltext');
    }

    this.render()
  }

  render() {
    var count, found, ref, rtpl, term;
    found = [];
    ref = this.options.data.terms;
    for (term in ref) {
      if (!hasProp.call(ref, term)) continue;
      count = ref[term];
      found.push(`${count}x ${term}`);
    }

    let theTemplate = tpl
    if (this.options.config.get('templates').hasOwnProperty('result')) {
      theTemplate = this.options.config.get('templates').result;
    }
    rtpl = theTemplate({
      data: this.options.data,
      fulltext: this.options.fulltext,
      found: found.join(', ')
    });
    this.$el.html(rtpl);
    return this;
  }

  events() {
    return {
      'click': '_handleClick',
      'click li[data-layer]': '_handleLayerClick'
    };
  }

  _handleClick(ev) {
    return this.trigger('click', this.options.data);
  }

  _handleLayerClick(ev) {
    var layer;
    ev.stopPropagation();
    layer = ev.currentTarget.getAttribute('data-layer');
    return this.trigger('layer:click', layer, this.options.data);
  }

  destroy() {
    return this.remove();
  }

};

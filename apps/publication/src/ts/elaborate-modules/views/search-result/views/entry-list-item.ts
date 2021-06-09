const hasProp = {}.hasOwnProperty;

import { className, tagName, Fn, BaseView } from "@elaborate4-frontend/hilib";
import _ from "underscore"
import { config } from "../../../../models/config";
// Tpl = require 'text!html/entry/metadata.html'
import tpl from "../templates/entry-list-item.jade"

// @options
// 	fulltext	Boolean		Is the list a result of a fulltext search? Defaults to false.

  // ## EntryMetadata

@className('entry')
@tagName('li')
export class EntryListItem extends BaseView {
  // ### Initialize
  constructor(private options: any = {}) {
    super(options)
    var base;
    if ((base = this.options).fulltext == null) {
      base.fulltext = false;
    }
    if (this.options.fulltext) {
      this.$el.addClass('fulltext')
    } else {
      this.$el.addClass('no-fulltext')
    }
    this.render()
  }

  // ### Render
  render() {
    var count, data, found, ref, rtpl, term;
    found = [];
    ref = this.options.entryData.terms;
    for (term in ref) {
      if (!hasProp.call(ref, term)) continue;
      count = ref[term];
      found.push(`${count}x ${term}`)
    }
    data = _.extend(this.options, {
      entryData: this.options.entryData,
      generateID: Fn.generateID,
      found: found.join(', ')
    })
    rtpl = tpl(data)
    this.$el.html(rtpl)
    return this
  }

  // ### Events
  events() {
    return {
      'click': function(ev) {
        if (!this.$el.hasClass('fulltext')) {
          if (this.$('.default-mode').is(":visible")) {
            config.set('activeTextLayerId', null)
            this.trigger('click', this.options.entryData.id, this.options.entryData.terms)
          } else if (this.$('.edit-mode').is(":visible")) {
            if (ev.target.getAttribute('type') !== 'checkbox') {
              this.$('input')[0].checked = !this.$('input')[0].checked;
            }
            this.trigger('check', this.options.entryData.id)
          }
        }
      },
      'click .keywords > ul > li': function(ev) {
        config.set('activeTextLayerId', ev.currentTarget.getAttribute('data-textlayer'))
        this.trigger('click', this.options.entryData.id, this.options.entryData.terms, ev.currentTarget.getAttribute('data-textlayer'))
      }
    }
  }

}

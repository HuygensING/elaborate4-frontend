import Backbone from "backbone"

import _ from 'underscore'
import { Entry } from "../models/entry"
import { model } from '@elaborate4-frontend/hilib'

@model(Entry)
class Entries extends Backbone.Collection {
  current: Entry
  entries

  // ### Methods
  setCurrent(modelId) {
    this.current = this.get(modelId) as Entry
    this.trigger('change:current', this.current)
  }

  prevUrl() {
    let currentIndex = this.indexOf(this.current)
    const entry = this.at(--currentIndex) as Entry
    return (entry != null) ? entry.createUrl() : null
  }

  nextUrl() {
    let currentIndex = this.indexOf(this.current)
    const entry = this.at(++currentIndex) as Entry
    return (entry != null) ? entry.createUrl() : null
  }

  prevEntry(id) {
    var idx;
    idx = _.indexOf(this.entries(), String(id))
    if (idx > 0) {
      return this.entries()[idx - 1];
    }
  }

  nextEntry(id) {
    var idx;
    idx = _.indexOf(this.entries(), String(id))
    if (idx + 1 < this.entries().length) {
      return this.entries()[idx + 1];
    }
  }
}

export const entries = new Entries()

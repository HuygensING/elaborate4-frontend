import config from "../models/config"

import Base from "./base"

import  Entry from "../models/entry"

export default class Entries extends Base {
  model = Entry
  projectId
  current
  changed

  constructor(models?, options?) {
    super(models, options)
    this.projectId = options.projectId;
    this.current = null;
    // Keep track of changed entries. In this case, we track if the metadata has changed
    // through edit multiple metadata, but the same logic could be applied elsewhere. 
    // When the metadata changes, we can't use the view's cache.
    this.changed = [];
  }

  url = () => `${config.get('restUrl')}projects/${this.projectId}/entries`

  setCurrent(modelID) {
    const model = this.get(modelID);
    
    // FIXME Unused!
    this.trigger('current:change', model);
    // Set and return @current
    return this.current = model;
  }

  previous() {
    var model, previousIndex;
    previousIndex = this.indexOf(this.current) - 1;
    model = this.at(previousIndex);
    return this.setCurrent(model);
  }

  next() {
    var model, nextIndex;
    nextIndex = this.indexOf(this.current) + 1;
    model = this.at(nextIndex);
    return this.setCurrent(model);
  }

};

import config from "../models/config"
import { BaseCollection } from "@elaborate4-frontend/hilib"
import { Facsimile } from '../models/facsimile'
import { model } from "@elaborate4-frontend/hilib"

@model(Facsimile)
export default class Facsimiles extends BaseCollection {
  projectId
  entryId
  current

  constructor(models, options) {
    super(models, options)
    this.projectId = options.projectId;
    this.entryId = options.entryId;
    this.on('remove', (model) => {
      model.destroy();
    })
  }

  url = () =>
    `${config.get('restUrl')}projects/${this.projectId}/entries/${this.entryId}/facsimiles`

  setCurrent(model) {
    if ((model == null) || model !== this.current) {
      if (model != null) {
        this.current = model;
      } else {
        this.current = this.at(0);
      }
      this.trigger('current:change', this.current);
    }
    return this.current;
  }

};

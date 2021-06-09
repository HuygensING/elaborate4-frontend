import _ from "underscore"
import config from "../models/config"
import { Transcription } from '../models/transcription'
import { model, BaseCollection, stringFn } from "@elaborate4-frontend/hilib"

@model(Transcription)
export default class Transcriptions extends BaseCollection {
  projectId
  entryId
  current

  constructor(models?, options?) {
    super(models, options)
    this.projectId = options.projectId;
    this.entryId = options.entryId;
    this.on('remove', (model) => model.destroy())
  }

  url = () => {
    return config.get('restUrl') + `projects/${this.projectId}/entries/${this.entryId}/transcriptions`;
  }

  getCurrent(cb) {
    if (this.current != null) {
      return cb(this.current);
    } else {
      return this.once('current:change', () => {
        return cb(this.current);
      });
    }
  }

  setCurrent(model) {
    var transcriptionName;
    if ((model == null) || model !== this.current) {
      if (_.isString(model)) {
        transcriptionName = model;
        this.current = this.find((model) => {
          return stringFn.slugify(model.get('textLayer')) === stringFn.slugify(transcriptionName);
        });
      } else {
        if (model != null) {
          this.current = model;
        } else {
          // Default to the Diplomatic text layer
          this.current = this.first();
        }
      }
      this.trigger('current:change', this.current);
    }
    return this.current;
  }

};

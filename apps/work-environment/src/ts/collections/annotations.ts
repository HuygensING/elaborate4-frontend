import config from "../models/config"
import { BaseCollection } from "@elaborate4-frontend/hilib"
import { Annotation } from '../models/annotation'
import { model } from "@elaborate4-frontend/hilib"

@model(Annotation)
export default class Annotations extends BaseCollection {
  url = () => {
    return `${config.get('restUrl')}projects/${this.options.projectId}/entries/${this.options.entryId}/transcriptions/${this.options.transcriptionId}/annotations`;
  }
};

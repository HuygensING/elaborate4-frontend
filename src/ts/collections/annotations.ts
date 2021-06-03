import config from "../models/config"
import BaseCollection from "./base"

export default class Annotations extends BaseCollection {
  url = () => {
    return `${config.get('restUrl')}projects/${this.options.projectId}/entries/${this.options.entryId}/transcriptions/${this.options.transcriptionId}/annotations`;
  }
};

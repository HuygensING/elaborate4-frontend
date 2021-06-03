import config from "../models/config"
import Base from "./base"
import  Facsimile from "../models/facsimile"

export default class Facsimiles extends Base {
  model = Facsimile
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

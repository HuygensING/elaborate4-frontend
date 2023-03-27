import config from "./config"
import { BaseModel } from "@elaborate4-frontend/hilib"

export default class EntrySettings extends BaseModel {
  private projectId: string
  private entryId: string

  constructor(attrs?, options?) {
    super(attrs, options)

    this.projectId = options.projectId
    this.entryId = options.entryId

    this.once('sync', () => {
      this.on('change', () => {
        this.publish('change:entry-metadata')
      })
    })
  }

  url = () => {
    return config.get('restUrl') + `projects/${this.projectId}/entries/${this.entryId}/settings`;
  }

  sync(method, model, options) {
    if (method === 'create') method = 'update'
    return super.sync(method, model, options)
  }
};

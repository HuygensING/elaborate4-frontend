// Entrymetadata fetches and saves the entry metadata. The fetch returns an array of strings
// and the save puts the entire array to save it.
import config from "./models/config"
import { ajax, token } from "@elaborate4-frontend/hilib"

// ## ProjectUserIDs
export default class AnnotationTypeIDs {
  url 
  // ### Contstructor
  // Set the url based on the projectID
  constructor(projectID) {
    this.url = `${config.get('restUrl')}projects/${projectID}/annotationtypes`
  }

  // ### Public methods
  fetch(cb) {
    ajax.token = token.get()
    const jqXHR = ajax.get({ url: this.url })
    jqXHR.done((data) => cb(data))
  }

  save(newValues, options: any = {}) {
    ajax.token = token.get();
    const jqXHR = ajax.put({
      url: this.url,
      data: JSON.stringify(newValues)
    });
    jqXHR.done(() => {
      if (options.success != null) {
        options.success()
      }
    })
  }
}

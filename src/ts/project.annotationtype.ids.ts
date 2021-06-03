// Entrymetadata fetches and saves the entry metadata. The fetch returns an array of strings
// and the save puts the entire array to save it.

import config from "./models/config"

import token from "hilib/managers/token"

import ajax from "hilib/managers/ajax"

// ## ProjectUserIDs
export default class AnnotationTypeIDs {
  url 
  // ### Contstructor
  // Set the url based on the projectID
  constructor(projectID) {
    this.url = `${config.get('restUrl')}projects/${projectID}/annotationtypes`;
  }

  // ### Public methods
  fetch(cb) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.get({
      url: this.url
    });
    return jqXHR.done(function(data) {
      return cb(data);
    });
  }

  save(newValues, options: any = {}) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.put({
      url: this.url,
      data: JSON.stringify(newValues)
    });
    return jqXHR.done(() => {
      if (options.success != null) {
        return options.success();
      }
    });
  }

};

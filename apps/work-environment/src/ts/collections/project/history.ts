import config from "../../models/config"

import { ajax } from "@elaborate4-frontend/hilib"

// token = require '@elaborate4-frontend/hilib

  // Models = 
// 	History: require 'models/project/history'

  // Collections =
// 	Base: require 'collections/base'
// projects: require 'collections/projects'
export default class ProjectHistory {
  url

  constructor(projectID) {
    this.url = `${config.get('restUrl')}projects/${projectID}/logentries`;
  }

  fetch(done) {
    var jqXHR;
    jqXHR = ajax.get({
      url: this.url
    });
    jqXHR.done((response) => {
      return done(response);
    });
    return jqXHR.fail((response) => {
      if (response.status === 401) {
        // @ts-ignore
        return Backbone.history.navigate('login', {
          trigger: true
        });
      }
    });
  }

};

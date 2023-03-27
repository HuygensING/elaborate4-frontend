import Backbone from "backbone"

import config from "../config"

import { ajax } from "@elaborate4-frontend/hilib"

// token = require '@elaborate4-frontend/hilib
import { BaseModel } from "@elaborate4-frontend/hilib"

export default class ProjectStatistics extends BaseModel {
  projectID

  url = () => {
    return `${config.get('restUrl')}projects/${this.projectID}/statistics`;
  }

  constructor(attrs?, options?) {
    super(attrs, options)
    this.projectID = options.projectID;
  }

  sync(method, model, options) {
    var jqXHR;
    if (method === 'read') {
      // ajax.token = token.get()
      jqXHR = ajax.get({
        url: this.url()
      });
      jqXHR.done((response) => {
        return options.success(response);
      });
      return jqXHR.fail((response) => {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      });
    } else {
      return super.sync(method, model, options);
    }
  }

};

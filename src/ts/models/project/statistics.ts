import Backbone from "backbone"

import config from "../config"

import ajax from "hilib/managers/ajax"

// token = require 'hilib/managers/token'
import Base from "../base"

export default class ProjectStatistics extends Base {
  projectID

  url = () => {
    return `${config.get('restUrl')}projects/${this.projectID}/statistics`;
  }

  initialize(attrs?, options?) {
    super.initialize();
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

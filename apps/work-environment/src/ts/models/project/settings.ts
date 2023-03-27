import Backbone from "backbone"
import config from "../config"
import { ajax, BaseModel } from "@elaborate4-frontend/hilib"

export default class ProjectSettings extends BaseModel {
  // options: { projectID: number, projectId: number }

  parse(attrs) {
    if (attrs != null) {
      if (attrs.hasOwnProperty('wordwrap')) {
        attrs.wordwrap = attrs.wordwrap === "true";
      }
      if (attrs.hasOwnProperty('results-per-page')) {
        attrs['results-per-page'] = +attrs['results-per-page'];
      }
    }
    return attrs;
  }

  set(attrs, options) {
    if (attrs === 'results-per-page') {
      options = +options;
    } else if (attrs.hasOwnProperty('results-per-page')) {
      attrs['results-per-page'] = +attrs['results-per-page'];
    }

    if (options.hasOwnProperty('projectID')) attrs.projectId = options.projectID

    return super.set(attrs, options);
  }

  // Change defaults with spaces like Project title and Project leader. These are not
  // proper attribute keys and break the label/input connection in hilib forms.
  defaults() {
    return {
      'Project leader': '',
      'Project title': '',
      'Release date': '',
      'Start date': '',
      'Version': '',
      'entry.term_plural': 'entries',
      'entry.term_singular': 'entry',
      'name': '',
      'projectType': '',
      'publicationURL': '',
      'results-per-page': 10,
      'text.font': '',
      'wordwrap': false,
    };
  }

  url = () => {
    return `${config.get('restUrl')}projects/${this.get('projectId')}/settings`;
  }

  // initialize(_attrs?, options?) {
  //   _attrs.projectId = options.projectID
  //   console.log('init', options)
  //   options.parse = true
  //   super.initialize()
  //   this.options = options;
  //   this.options.projectId = this.options.projectID;
  // }

  sync(method, model, options) {
    var jqXHR;
    // TODO When is create used??
    if (method === 'create') {
      // ajax.token = token.get()
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify(this)
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

  validation = {
    name: {
      'min-length': 3,
      'max-length': 40,
      pattern: 'slug'
    }
  }
}


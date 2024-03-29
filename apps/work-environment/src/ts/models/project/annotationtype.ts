import _ from "underscore"
import config from "../config"
import Backbone from "backbone";

import { BaseModel, syncOverride, ajax } from "@elaborate4-frontend/hilib"

export default class AnnotationType extends BaseModel {
  urlRoot = () => {
    return config.get('restUrl') + "annotationtypes";
  }

  defaults() {
    return {
      creator: null,
      modifier: null,
      name: '',
      description: '',
      annotationTypeMetadataItems: [],
      createdOn: '',
      modifiedOn: ''
    };
  }

  constructor(attrs?, options?) {
    super(attrs, options)
    _.extend(this, syncOverride);
  }

  parse(attrs) {
    attrs.title = attrs.name;
    return attrs;
  }

  sync(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      // ajax.token = token.get()
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify({
          name: model.get('name'),
          description: model.get('description')
        })
      });
      jqXHR.done((data, textStatus, jqXHR) => {
        var xhr;
        if (jqXHR.status === 201) {
          xhr = ajax.get({
            url: jqXHR.getResponseHeader('Location')
          });
          return xhr.done((data, textStatus, jqXHR) => {
            return options.success(data);
          });
        }
      });
      return jqXHR.fail((response) => {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      });
    } else if (method === 'update') {
      // ajax.token = token.get()
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify({
          name: model.get('name'),
          description: model.get('description')
        })
      });
      // Options.success is not called, because the server does not respond with the updated model.
      jqXHR.done((response) => {
        return this.trigger('sync');
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

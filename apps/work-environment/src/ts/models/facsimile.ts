import Backbone from "backbone";
import { ajax, token } from "@elaborate4-frontend/hilib"
import { BaseModel } from "@elaborate4-frontend/hilib"

export class Facsimile extends BaseModel {
  defaults() {
    return {
      name: '',
      filename: '',
      zoomableUrl: ''
    };
  }

  sync(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify({
          name: model.get('name'),
          filename: model.get('filename'),
          zoomableUrl: model.get('zoomableUrl')
        })
      });
      jqXHR.done((data, textStatus, jqXHR) => {
        var url, xhr;
        if (jqXHR.status === 201) {
          url = jqXHR.getResponseHeader('Location');
          xhr = ajax.get({
            url: url
          });
          return xhr.done((data, textStatus, jqXHR) => {
            this.trigger('sync');
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
    } else {
      return super.sync(method, model, options);
    }
  }
};

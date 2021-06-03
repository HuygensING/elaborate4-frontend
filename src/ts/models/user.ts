import config from "./config"
import ajax from "hilib/managers/ajax"
import token from "hilib/managers/token"
import Base from "./base"
import Backbone from "backbone";

export default class User extends Base {
  urlRoot = () => {
    return `${config.get('restUrl')}users`;
  }

  defaults() {
    return {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'USER',
      password: ''
    };
  }

  getShortName() {
    var name;
    name = this.get('lastName');
    if (name == null) {
      name = this.get('firstName');
    }
    if (name == null) {
      name = 'user';
    }
    return name;
  }

  // ### Overrides
  parse(attr) {
    attr.title = attr.title + ' (' + attr.username + ')';
    return attr;
  }

  sync(method, model, options) {
    var data, jqXHR;
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify(model.toJSON())
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
        options.error(response);
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      });
    } else if (method === 'update') {
      data = model.clone().toJSON();
      delete data.title;
      delete data.roleString;
      delete data.loggedIn;
      ajax.token = token.get();
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify(data)
      });
      jqXHR.done((response) => {
        return this.trigger('sync');
      });
      return jqXHR.fail((response) => {
        options.error(response);
        return jqXHR.fail((response) => {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        });
      });
    } else {
      return super.sync(method, model, options);
    }
  }

  // ### Methods
  resetPassword() {
    return console.log('reset', config.get('restUrl'));
  }
  
  validation = {
    username: {
      required: true,
      'min-length': 2
    },
    password: {
      required: true,
      'min-length': 6
    },
    email: {
      required: true,
      pattern: 'email'
    },
    firstName: {
      pattern: 'string'
    },
    lastName: {
      pattern: 'string'
    }
  };
};

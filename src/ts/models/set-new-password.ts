import Backbone from "backbone"
import config from "./config"
import ajax from "hilib/managers/ajax"

// token = require 'hilib/managers/token'

  // Models = 
// 	Base: require './base'
export default class SetNewPassword extends Backbone.Model {
  defaults() {
    return {
      password1: '',
      password2: '',
      emailaddress: '',
      token: ''
    };
  }

  // ### Methods
  setNewPassword(cb) {
    var data, jqXHR;
    data = {
      emailAddress: this.get('emailaddress'),
      token: this.get('token'),
      newPassword: this.get('password2')
    };
    jqXHR = ajax.post({
      url: `${config.get('restUrl')}sessions/passwordreset`,
      dataType: 'text',
      data: JSON.stringify(data)
    });
    return jqXHR.done(() => {
      return cb();
    });
  }

  validation = {
    password1: {
      required: true,
      'min-length': 6
    },
    password2: {
      required: true,
      'min-length': 6,
      equal: 'password1'
    }
  }
}

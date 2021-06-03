import config from "./config"
import ajax from "hilib/managers/ajax"
import Base from "./base"

export default class ResetPassword extends Base {
  defaults() {
    return {
      email: ''
    };
  }

  // ### Methods
  resetPassword() {
    return ajax.post({
      url: `${config.get('restUrl')}sessions/passwordresetrequest`,
      dataType: 'text',
      data: this.get('email')
    });
  }
  
  validation = {
    email: {
      required: true,
      pattern: 'email'
    }
  }

};

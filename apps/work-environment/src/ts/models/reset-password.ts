import config from "./config"
import { ajax, BaseModel } from "@elaborate4-frontend/hilib"

export default class ResetPassword extends BaseModel {
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

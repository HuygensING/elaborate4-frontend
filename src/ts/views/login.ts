import $ from "jquery"
import BaseView from "hilib/views/base"
import currentUser from "../models/currentUser"
import ResetPassword from "../models/reset-password"
import Modal from "hilib/views/modal"
import Form from "hilib/views/form/main"

import tpl from "../../jade/login.jade"

import resetPasswordTpl from "../../jade/reset-password.jade"

export default class Login extends BaseView {
  hsid

  // ### INITIALIZE
  constructor() {
    super({ className: 'login' })

    const  path = window.location.search.substr(1);
    const parameters = path.split('&');
    for (let i = 0, len = parameters.length; i < len; i++) {
      const param = parameters[i];
      const [key, value] = param.split('=');
      if (key === 'hsid') {
        this.hsid = value;
      }
    }
    if (this.hsid != null) {
      currentUser.hsidLogin(this.hsid);
    } else {
      this.render();
    }
    this.subscribe('login:failed', this.loginFailed);
  }

  // ### RENDER
  render() {
    this.$el.html(tpl());
    return this;
  }

  // ### EVENTS
  events() {
    return {
      'keyup input': () => {
        return this.$('ul.message li').slideUp();
      },
      'click button[name="submit"]': 'submit',
      'click button.federated-login': 'federatedLogin',
      'click li.resetpassword': 'resetPassword'
    };
  }

  resetPassword() {
    const resetPasswordForm = new Form({
      saveOnSubmit: false,
      tpl: resetPasswordTpl,
      model: new ResetPassword()
    });
    this.listenTo(resetPasswordForm, 'cancel', () => {
      return modal.close();
    });
    this.listenTo(resetPasswordForm, 'submit', (model) => {
      var jqXHR, message;
      message = $('.modal .modalbody .body li.message');
      message.hide();
      jqXHR = model.resetPassword();
      jqXHR.done(() => {
        $('.modal .modalbody .body li.input').html("<p>An email has been send to your emailaddress. Please follow the link to reset your password.</p>");
        return $('.modal .modalbody .body li.submit').css('opacity', 0);
      });
      return jqXHR.fail((jqXHR) => {
        resetPasswordForm.reset();
        message.html(jqXHR.responseText);
        return message.show();
      });
    });
    const modal = new Modal({
      customClassName: 'reset-password',
      title: "Forgot your password?",
      html: resetPasswordForm.el,
      cancelAndSubmit: false,
      width: '300px'
    });
  }

  submit(ev) {
    ev.preventDefault();
    if (this.$('#username').val() === '' || this.$('#password').val() === '') {
      this.$('ul.message li').show().html('Please enter a username and password.');
      return;
    }
    this.$('li.login button').addClass('loading');
    return currentUser.login(this.$('#username').val(), this.$('#password').val());
  }

  federatedLogin(ev) {
    var form, hsURL, hsUrlEl, loginURL, wl;
    wl = window.location;
    hsURL = wl.origin + wl.pathname;
    loginURL = 'https://secure.huygens.knaw.nl/saml2/login';
    form = $('<form>');
    form.attr({
      method: 'POST',
      action: loginURL
    });
    hsUrlEl = $('<input>').attr({
      name: 'hsurl',
      value: hsURL,
      type: 'hidden'
    });
    form.append(hsUrlEl);
    $('body').append(form);
    return form.submit();
  }

  // ### METHODS
  loginFailed() {
    this.render();
    return this.$('ul.message li').html('Username / password combination unknown!').show();
  }

};

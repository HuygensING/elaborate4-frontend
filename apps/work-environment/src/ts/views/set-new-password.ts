import Backbone from "backbone"
import SetNewPasswordModel from "../models/set-new-password"
import { Modal, Form } from "@elaborate4-frontend/hilib"

// Templates =
// 	'Login': require 'text!html/login.html'
import tpl from "../../jade/set-new-password.jade"
import { className } from "@elaborate4-frontend/hilib"

@className('set-new-password')
export default class SetNewPassword extends Backbone.View {
  // ### Initialize
  constructor(options = {}) {
    super(options)
    this.render()
  }

  // ### Render
  render() {
    var form, getVar, i, len, modal, ref, setNewPasswordModel;
    setNewPasswordModel = new SetNewPasswordModel();
    ref = location.search.substr(1).split('&');
    for (i = 0, len = ref.length; i < len; i++) {
      getVar = ref[i];
      getVar = getVar.split('=');
      if (getVar[0] === 'emailaddress' || getVar[0] === 'token') {
        setNewPasswordModel.set(getVar[0], getVar[1]);
      }
    }
    form = new Form({
      tpl: tpl,
      model: setNewPasswordModel,
      saveOnSubmit: false
    });
    form.$('a[name="login"]').on('click', () => {
      form.destroy();
      modal.destroy();
      this.remove();
      window.location.assign('/login')
    })
    form.on('submit', (model) => {
      model.setNewPassword(() => {
        form.$('ul').hide();
        form.$('p').show();
      })
    })
    new Modal({
      title: 'Choose a new password',
      clickOverlay: false,
      html: form.el,
      cancelAndSubmit: false,
      customClassName: 'set-new-password'
    })

    return this
  }

};

import Backbone from "backbone";
import SetNewPasswordModel from "../models/set-new-password";
import Modal from "hilib/views/modal";
import Form from "hilib/views/form/main";
import tpl from "../../jade/set-new-password.jade";
export default class SetNewPassword extends Backbone.View {
    initialize() {
        return this.render();
    }
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
            return window.location.assign('/login');
        });
        form.on('submit', (model) => {
            return model.setNewPassword(() => {
                form.$('ul').hide();
                return form.$('p').show();
            });
        });
        new Modal({
            title: 'Choose a new password',
            clickOverlay: false,
            html: form.el,
            cancelAndSubmit: false,
            customClassName: 'set-new-password'
        });
        return this;
    }
}
;
SetNewPassword.prototype.className = 'set-new-password';

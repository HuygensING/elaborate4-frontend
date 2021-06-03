var $, Backbone, BaseView, Form, Login, Modal, ResetPassword, ajax, currentUser, history, resetPasswordTpl, token, tpl;
Login = (function () {
    class Login extends BaseView {
        initialize() {
            var i, key, len, param, parameters, path, value;
            super.initialize();
            path = window.location.search.substr(1);
            parameters = path.split('&');
            for (i = 0, len = parameters.length; i < len; i++) {
                param = parameters[i];
                [key, value] = param.split('=');
                if (key === 'hsid') {
                    this.hsid = value;
                }
            }
            if (this.hsid != null) {
                currentUser.hsidLogin(this.hsid);
            }
            else {
                this.render();
            }
            return this.subscribe('login:failed', this.loginFailed);
        }
        render() {
            this.$el.html(tpl());
            return this;
        }
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
            var modal, resetPasswordForm;
            resetPasswordForm = new Form({
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
            return modal = new Modal({
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
        loginFailed() {
            this.render();
            return this.$('ul.message li').html('Username / password combination unknown!').show();
        }
    }
    ;
    Login.prototype.className = 'login';
    return Login;
}).call(this);
export default Login;

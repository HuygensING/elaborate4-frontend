var Backbone, SetNewPassword, ajax, config;
SetNewPassword = (function () {
    class SetNewPassword extends Backbone.Model {
        defaults() {
            return {
                password1: '',
                password2: '',
                emailaddress: '',
                token: ''
            };
        }
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
    }
    ;
    SetNewPassword.prototype.validation = {
        password1: {
            required: true,
            'min-length': 6
        },
        password2: {
            required: true,
            'min-length': 6,
            equal: 'password1'
        }
    };
    return SetNewPassword;
}).call(this);
export default SetNewPassword;

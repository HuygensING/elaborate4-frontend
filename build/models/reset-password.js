var Models, ResetPassword, ajax, config, token;
Models = {
    import: Base, from, "./base": 
};
ResetPassword = (function () {
    class ResetPassword extends Models.Base {
        defaults() {
            return {
                email: ''
            };
        }
        resetPassword() {
            return ajax.post({
                url: `${config.get('restUrl')}sessions/passwordresetrequest`,
                dataType: 'text',
                data: this.get('email')
            });
        }
    }
    ;
    ResetPassword.prototype.validation = {
        email: {
            required: true,
            pattern: 'email'
        }
    };
    return ResetPassword;
}).call(this);
export default ResetPassword;

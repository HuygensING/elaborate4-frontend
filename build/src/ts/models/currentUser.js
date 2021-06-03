import Backbone from "backbone";
import config from "./config";
import token from "hilib/managers/token";
import $ from "jquery";
import ajax from "hilib/managers/ajax";
class CurrentUser extends Backbone.Model {
    loggedIn;
    defaults() {
        return {
            username: '',
            title: '',
            email: '',
            firstName: '',
            lastName: '',
            role: '',
            roleString: '',
            roleNo: '',
            loggedIn: false
        };
    }
    initialize() {
        return this.loggedIn = false;
    }
    parse(attrs) {
        if (attrs.title == null) {
            attrs.title = attrs.username;
        }
        attrs.roleNo = config.get('roles')[attrs.role];
        return attrs;
    }
    authorized() { }
    unauthorized() { }
    navigateToLogin() { }
    authorize(args) {
        ({ authorized: this.authorized, unauthorized: this.unauthorized, navigateToLogin: this.navigateToLogin } = args);
        if (token.get()) {
            return this.fetchUserAttrs({
                done: () => {
                    this.authorized();
                    return this.loggedIn = true;
                }
            });
        }
        else {
            return this.navigateToLogin();
        }
    }
    login(username, password) {
        this.set('username', username);
        return this.fetchUserAttrs({
            username: username,
            password: password,
            done: () => {
                sessionStorage.setItem('huygens_user', JSON.stringify(this.attributes));
                this.authorized();
                return this.loggedIn = true;
            }
        });
    }
    hsidLogin(hsid) {
        return this.fetchUserAttrs({
            hsid: hsid,
            done: () => {
                sessionStorage.setItem('huygens_user', JSON.stringify(this.attributes));
                this.authorized();
                return this.loggedIn = true;
            }
        });
    }
    logout() {
        var jqXHR;
        jqXHR = ajax.post({
            url: config.get('restUrl') + `sessions/${token.get()}/logout`,
            dataType: 'text',
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
        }, {
            token: false
        });
        jqXHR.done(function () {
            this.loggedIn = false;
            sessionStorage.clear();
            return location.reload();
        });
        return jqXHR.fail(function () {
            return console.error('Logout failed');
        });
    }
    fetchUserAttrs(args) {
        var done, hsid, jqXHR, password, postData, userAttrs, username;
        ({ username, password, hsid, done } = args);
        if (userAttrs = sessionStorage.getItem('huygens_user')) {
            this.set(JSON.parse(userAttrs));
            return done();
        }
        else {
            if (hsid != null) {
                postData = {
                    hsid: hsid
                };
            }
            else if ((username != null) && (password != null)) {
                postData = {
                    username: username,
                    password: password
                };
            }
            else {
                return this.unauthorized();
            }
            jqXHR = $.ajax({
                type: 'post',
                url: config.get('restUrl') + 'sessions/login',
                data: postData
            });
            jqXHR.done((data) => {
                var type;
                data.user = this.parse(data.user);
                if (hsid != null) {
                    type = 'Federated';
                }
                token.set(data.token, type);
                this.set(data.user);
                return done();
            });
            return jqXHR.fail(() => {
                return this.unauthorized();
            });
        }
    }
    resetPassword(cb) {
        var jqXHR;
        jqXHR = ajax.post({
            url: "/users/passwordresetrequest"
        });
        jqXHR.done(() => {
            console.log(arguments);
            return cb();
        });
        return jqXHR.fail(() => {
            return console.log(arguments);
        });
    }
}
;
export default new CurrentUser();

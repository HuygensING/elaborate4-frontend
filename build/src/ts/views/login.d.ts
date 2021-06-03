/// <reference types="jquery" />
import BaseView from "hilib/views/base";
export default class Login extends BaseView {
    hsid: any;
    subscribe: any;
    initialize(): any;
    render(): this;
    events(): {
        'keyup input': () => JQuery<HTMLElement>;
        'click button[name="submit"]': string;
        'click button.federated-login': string;
        'click li.resetpassword': string;
    };
    resetPassword(): void;
    submit(ev: any): any;
    federatedLogin(ev: any): any;
    loginFailed(): JQuery<HTMLElement>;
}
//# sourceMappingURL=login.d.ts.map
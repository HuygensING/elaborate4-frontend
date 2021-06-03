import Backbone from "backbone";
declare class CurrentUser extends Backbone.Model {
    loggedIn: boolean;
    defaults(): {
        username: string;
        title: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        roleString: string;
        roleNo: string;
        loggedIn: boolean;
    };
    initialize(): boolean;
    parse(attrs: any): any;
    authorized(): void;
    unauthorized(): void;
    navigateToLogin(): void;
    authorize(args: any): any;
    login(username: any, password: any): any;
    hsidLogin(hsid: any): any;
    logout(): any;
    fetchUserAttrs(args: any): any;
    resetPassword(cb: any): any;
}
declare const _default: CurrentUser;
export default _default;
//# sourceMappingURL=currentUser.d.ts.map
import Backbone from "backbone";
export default class SetNewPassword extends Backbone.Model {
    defaults(): {
        password1: string;
        password2: string;
        emailaddress: string;
        token: string;
    };
    setNewPassword(cb: any): any;
    validation: {
        password1: {
            required: boolean;
            'min-length': number;
        };
        password2: {
            required: boolean;
            'min-length': number;
            equal: string;
        };
    };
}
//# sourceMappingURL=set-new-password.d.ts.map
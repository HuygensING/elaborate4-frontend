import Base from "./base";
export default class ResetPassword extends Base {
    defaults(): {
        email: string;
    };
    resetPassword(): any;
    validation: {
        email: {
            required: boolean;
            pattern: string;
        };
    };
}
//# sourceMappingURL=reset-password.d.ts.map
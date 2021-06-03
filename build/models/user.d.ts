import Base from "./base";
export default class User extends Base {
    urlRoot: () => string;
    defaults(): {
        username: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        password: string;
    };
    getShortName(): any;
    parse(attr: any): any;
    sync(method: any, model: any, options: any): any;
    resetPassword(): void;
    validation: {
        username: {
            required: boolean;
            'min-length': number;
        };
        password: {
            required: boolean;
            'min-length': number;
        };
        email: {
            required: boolean;
            pattern: string;
        };
        firstName: {
            pattern: string;
        };
        lastName: {
            pattern: string;
        };
    };
}
//# sourceMappingURL=user.d.ts.map
/// <reference types="jquery" />
import Base from "hilib/views/base";
export default class EditFacsimiles extends Base {
    options: any;
    initialize(options?: any): void;
    render(): this;
    events(): {
        'click .close-button': (ev: any) => any;
        'click ul.facsimiles li': (ev: any) => JQuery<any>;
        'click ul.facsimiles li.destroy .orcancel': string;
        'click ul.facsimiles li.destroy .name': string;
        'keyup input[name="name"]': string;
        'change input[type="file"]': () => string;
        'click button.addfacsimile': string;
    };
    close(ev: any): this;
    keyupName(ev: any): void;
    addfacsimile(ev: any): any;
    cancelRemove(ev: any): any;
    destroyfacsimile(ev: any): import("backbone").Model<any, import("backbone").ModelSetOptions, {}>;
}
//# sourceMappingURL=facsimiles.edit.d.ts.map
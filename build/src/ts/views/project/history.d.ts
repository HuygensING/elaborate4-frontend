import BaseView from "hilib/views/base";
export default class ProjectHistory extends BaseView {
    options: any;
    project: any;
    historyChunks: any;
    index: any;
    all: any;
    initialize(options?: any): any;
    render(): this;
    events(): {
        'click button.more': string;
    };
    more(): void;
}
//# sourceMappingURL=history.d.ts.map
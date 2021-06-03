/// <reference types="jquery" />
import Backbone from "backbone";
declare class MainRouter extends Backbone.Router {
    project: any;
    publish: any;
    initialize(): this;
    init(): any;
    publicationErrors(): any;
    login(): any;
    noproject(): any;
    setNewPassword(): JQuery<HTMLElement>;
    search(projectName: any): any;
    editMetadata(projectName: any): any;
    projectSettings(projectName: any, tab: any): any;
    projectHistory(projectName: any): any;
    statistics(projectName: any): any;
    entry(projectName: any, entryID: any, transcriptionName: any, annotationID: any): any;
}
declare const _default: MainRouter;
export default _default;
//# sourceMappingURL=main.d.ts.map
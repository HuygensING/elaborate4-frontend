import Base from "../base";
export default class Project extends Base {
    projectAnnotationTypeIDs: any;
    allannotationtypes: any;
    projectUserIDs: any;
    allusers: any;
    defaults(): {
        annotationtypes: any;
        createdOn: string;
        creator: any;
        entries: any;
        entrymetadatafields: any;
        level1: string;
        level2: string;
        level3: string;
        modifiedOn: string;
        modifier: any;
        name: string;
        projectLeaderId: any;
        settings: any;
        textLayers: any[];
        title: string;
        userIDs: any[];
    };
    parse(attrs: any): any;
    addAnnotationType(annotationType: any, done: any): any;
    removeAnnotationType(id: any, done: any): any;
    addUser(user: any, done: any): any;
    removeUser(id: any, done: any): any;
    load(cb: any): any;
    fetchEntrymetadatafields(cb: any): any;
    publishDraft(cb: any): any;
    pollDraft(url: any, done: any): any;
    saveTextlayers(done: any): any;
    sync(method: any, model: any, options: any): any;
}
//# sourceMappingURL=main.d.ts.map
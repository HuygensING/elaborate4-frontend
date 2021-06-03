import Base from "./base";
export default class Annotation extends Base {
    urlRoot: () => string;
    defaults(): {
        annotationMetadataItems: any[];
        annotationNo: string;
        annotationType: any;
        body: string;
        createdOn: string;
        creator: any;
        modifiedOn: string;
        modifier: any;
        metadata: {};
    };
    initialize(): any;
    parse(attrs: any): any;
    set(attrs: any, options: any): any;
    sync(method: any, model: any, options: any): any;
    updateFromClone(clone: any): any;
}
//# sourceMappingURL=annotation.d.ts.map
import Base from "../base";
export default class AnnotationType extends Base {
    urlRoot: () => string;
    defaults(): {
        creator: any;
        modifier: any;
        name: string;
        description: string;
        annotationTypeMetadataItems: any[];
        createdOn: string;
        modifiedOn: string;
    };
    initialize(): any;
    parse(attrs: any): any;
    sync(method: any, model: any, options: any): any;
}
//# sourceMappingURL=annotationtype.d.ts.map
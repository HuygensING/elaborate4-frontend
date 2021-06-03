import Base from "./base";
export default class Transcription extends Base {
    defaults(): {
        annotations: any;
        textLayer: string;
        title: string;
        body: string;
    };
    initialize(): any;
    set(attrs: any, options: any): this;
    sync(method: any, model: any, options: any): any;
    getAnnotations(cb?: (x: any) => void): any;
    addAnnotation(model: any): any;
    removeAnnotation(model: any): any;
    resetAnnotationOrder($body: any, add?: boolean): any;
}
//# sourceMappingURL=transcription.d.ts.map
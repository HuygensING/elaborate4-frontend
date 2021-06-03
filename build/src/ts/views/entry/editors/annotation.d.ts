/// <reference types="jquery" />
import Base from 'hilib/views/base';
import Annotation from "../../../models/annotation";
export default class AnnotationEditor extends Base {
    options: any;
    project: any;
    publish: any;
    model: Annotation;
    initialize(options1?: any): any;
    render(): this;
    events(): {};
    show(annotation?: any): string;
    hide(): this;
    visible(): boolean;
    setURLPath(id: any): boolean;
    save(done?: () => void): JQueryXHR;
    editMetadata(): any;
}
//# sourceMappingURL=annotation.d.ts.map
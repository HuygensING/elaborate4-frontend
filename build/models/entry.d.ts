import Base from "./base";
export default class Entry extends Base {
    project: any;
    prevID: any;
    nextID: any;
    urlRoot(): string;
    defaults(): {
        name: string;
        publishable: boolean;
        shortName: string;
        terms: any;
    };
    initialize(): any;
    set(attrs: any, options: any): this;
    clone(): any;
    updateFromClone(clone: any): any;
    fetchTranscriptions(currentTranscriptionName: any, done: any): any;
    fetchFacsimiles(done: any): any;
    fetchSettings(done: any): any;
    setPrevNext(done: any): any;
    fetchPrevNext(done: any): any;
    sync(method: any, model: any, options: any): any;
}
//# sourceMappingURL=entry.d.ts.map
import Base from "../base";
export default class ProjectSettings extends Base {
    options: any;
    projectID: any;
    parse(attrs: any): any;
    set(attrs: any, options: any): this;
    defaults(): {
        'Project leader': string;
        'Project title': string;
        projectType: string;
        publicationURL: string;
        'Release date': string;
        'Start date': string;
        Version: string;
        'entry.term_singular': string;
        'entry.term_plural': string;
        'text.font': string;
        name: string;
        wordwrap: boolean;
        'results-per-page': number;
    };
    url: () => string;
    initialize(attrs?: any, options1?: any): void;
    sync(method: any, model: any, options: any): any;
    validation: {
        name: {
            'min-length': number;
            'max-length': number;
            pattern: string;
        };
    };
}
//# sourceMappingURL=settings.d.ts.map
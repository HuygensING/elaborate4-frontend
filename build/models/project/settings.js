var Backbone, Models, ProjectSettings, ajax, config;
Models = {
    import: Base, from, "../base": 
};
ProjectSettings = (function () {
    class ProjectSettings extends Models.Base {
        parse(attrs) {
            if (attrs != null) {
                if (attrs.hasOwnProperty('wordwrap')) {
                    attrs.wordwrap = attrs.wordwrap === "true";
                }
                if (attrs.hasOwnProperty('results-per-page')) {
                    attrs['results-per-page'] = +attrs['results-per-page'];
                }
            }
            return attrs;
        }
        set(attrs, options) {
            if (attrs === 'results-per-page') {
                options = +options;
            }
            else if (attrs.hasOwnProperty('results-per-page')) {
                attrs['results-per-page'] = +attrs['results-per-page'];
            }
            return super.set();
        }
        defaults() {
            return {
                'Project leader': '',
                'Project title': '',
                'projectType': '',
                'publicationURL': '',
                'Release date': '',
                'Start date': '',
                'Version': '',
                'entry.term_singular': 'entry',
                'entry.term_plural': 'entries',
                'text.font': '',
                'name': '',
                'wordwrap': false,
                'results-per-page': 10
            };
        }
        url() {
            return `${config.get('restUrl')}projects/${this.options.projectId}/settings`;
        }
        initialize(attrs, options1) {
            this.options = options1;
            super.initialize();
            this.options.projectId = this.options.projectID;
            return this.projectID = this.options.projectID;
        }
        sync(method, model, options) {
            var jqXHR;
            if (method === 'create') {
                jqXHR = ajax.put({
                    url: this.url(),
                    data: JSON.stringify(this)
                });
                jqXHR.done((response) => {
                    return options.success(response);
                });
                return jqXHR.fail((response) => {
                    if (response.status === 401) {
                        return Backbone.history.navigate('login', {
                            trigger: true
                        });
                    }
                });
            }
            else {
                return super.sync(method, model, options);
            }
        }
    }
    ;
    ProjectSettings.prototype.validation = {
        name: {
            'min-length': 3,
            'max-length': 40,
            pattern: 'slug'
        }
    };
    return ProjectSettings;
}).call(this);
export default ProjectSettings;

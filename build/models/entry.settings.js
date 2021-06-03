var Backbone, EntrySettings, Models, config;
Models = {
    import: Base, from, "./base": 
};
EntrySettings = class EntrySettings extends Models.Base {
    initialize(models, options) {
        this.projectId = options.projectId;
        this.entryId = options.entryId;
        return this.once('sync', () => {
            return this.on('change', () => {
                return Backbone.trigger('change:entry-metadata');
            });
        });
    }
    url() {
        return config.get('restUrl') + `projects/${this.projectId}/entries/${this.entryId}/settings`;
    }
    sync(method, model, options) {
        if (method === 'create') {
            method = 'update';
        }
        return super.sync();
    }
};
export default EntrySettings;

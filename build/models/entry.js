import _ from "underscore";
import config from "./config";
import ajax from "hilib/managers/ajax";
import syncOverride from "hilib/mixins/model.sync";
import Backbone from "backbone";
import Base from "./base";
import Settings from "./entry.settings";
import Transcriptions from "../collections/transcriptions";
import Facsimiles from "../collections/facsimiles";
export default class Entry extends Base {
    project;
    prevID;
    nextID;
    urlRoot() {
        return `${config.get('restUrl')}projects/${this.project.id}/entries`;
    }
    defaults() {
        return {
            name: '',
            publishable: false,
            shortName: '',
            terms: null
        };
    }
    initialize() {
        super.initialize();
        return _.extend(this, syncOverride);
    }
    set(attrs, options) {
        var settings;
        settings = this.get('settings');
        if ((settings != null) && (settings.get(attrs) != null)) {
            settings.set(attrs, options);
            return this.trigger('change');
        }
        else {
            return super.set(attrs, options);
        }
    }
    clone() {
        var newObj;
        newObj = new Entry({
            name: this.get('name'),
            publishable: this.get('publishable'),
            shortName: this.get('shortName'),
            modifier: this.get('modifier'),
            modifiedOn: this.get('modifiedOn')
        });
        newObj.set('settings', new Settings(this.get('settings').toJSON(), {
            projectId: this.project.id,
            entryId: this.id
        }));
        return newObj;
    }
    updateFromClone(clone) {
        this.set('name', clone.get('name'));
        this.set('publishable', clone.get('publishable'));
        this.set('shortName', clone.get('shortName'));
        return this.get('settings').set(clone.get('settings').toJSON());
    }
    fetchTranscriptions(currentTranscriptionName, done) {
        var jqXHR, transcriptions;
        transcriptions = new Transcriptions([], {
            projectId: this.project.id,
            entryId: this.id
        });
        jqXHR = transcriptions.fetch();
        return jqXHR.done(() => {
            this.set('transcriptions', transcriptions);
            return done(transcriptions.setCurrent(currentTranscriptionName));
        });
    }
    fetchFacsimiles(done) {
        var facsimiles, jqXHR;
        facsimiles = new Facsimiles([], {
            projectId: this.project.id,
            entryId: this.id
        });
        jqXHR = facsimiles.fetch();
        return jqXHR.done(() => {
            this.set('facsimiles', facsimiles);
            return done(facsimiles.setCurrent());
        });
    }
    fetchSettings(done) {
        var jqXHR, settings;
        settings = new Settings([], {
            projectId: this.project.id,
            entryId: this.id
        });
        jqXHR = settings.fetch();
        return jqXHR.done(() => {
            this.set('settings', settings);
            return done();
        });
    }
    setPrevNext(done) {
        var ids, index;
        if (this.project.resultSet == null) {
            return done();
        }
        ids = this.project.resultSet.get('ids');
        index = ids.indexOf('' + this.id);
        this.prevID = ids[index - 1];
        this.nextID = ids[index + 1];
        return done();
    }
    fetchPrevNext(done) {
        var jqXHR;
        jqXHR = ajax.get({
            url: this.url() + '/prevnext'
        });
        return jqXHR.done((response) => {
            this.nextID = response.next;
            this.prevID = response.prev;
            return done();
        });
    }
    sync(method, model, options) {
        var data, jqXHR;
        data = JSON.stringify({
            name: this.get('name'),
            publishable: this.get('publishable'),
            shortName: this.get('shortName')
        });
        if (method === 'create') {
            jqXHR = ajax.post({
                url: this.url(),
                data: data,
                dataType: 'text'
            });
            jqXHR.done((data, textStatus, jqXHR) => {
                var xhr;
                if (jqXHR.status === 201) {
                    xhr = ajax.get({
                        url: jqXHR.getResponseHeader('Location')
                    });
                    xhr.done((data, textStatus, jqXHR) => {
                        return options.success(data);
                    });
                    return xhr.fail((response) => {
                        if (response.status === 401) {
                            return Backbone.history.navigate('login', {
                                trigger: true
                            });
                        }
                    });
                }
            });
            return jqXHR.fail((response) => {
                if (response.status === 401) {
                    return Backbone.history.navigate('login', {
                        trigger: true
                    });
                }
            });
        }
        else if (method === 'update') {
            jqXHR = ajax.put({
                url: this.url(),
                data: data
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

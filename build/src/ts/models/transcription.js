import Backbone from "backbone";
import $ from "jquery";
import _ from "underscore";
import ajax from "hilib/managers/ajax";
import token from "hilib/managers/token";
import changedSinceLastSave from "hilib/mixins/model.changedsincelastsave";
import Base from "./base";
import Annotations from "../collections/annotations";
export default class Transcription extends Base {
    defaults() {
        return {
            annotations: null,
            textLayer: '',
            title: '',
            body: ''
        };
    }
    initialize() {
        super.initialize();
        _.extend(this, changedSinceLastSave(['body']));
        return this.initChangedSinceLastSave();
    }
    set(attrs, options) {
        if (attrs === 'body') {
            options = options.replace(/<div><br><\/div>/g, '<br>');
            options = options.replace(/<div>(.*?)<\/div>/g, (match, p1, offset, string) => {
                return '<br>' + p1;
            });
            options.trim();
        }
        return super.set(attrs, options);
    }
    sync(method, model, options) {
        var jqXHR;
        if (method === 'create') {
            ajax.token = token.get();
            jqXHR = ajax.post({
                url: this.url(),
                dataType: 'text',
                data: JSON.stringify({
                    textLayer: model.get('textLayer'),
                    body: model.get('body')
                })
            });
            jqXHR.done((data, textStatus, jqXHR) => {
                var url, xhr;
                if (jqXHR.status === 201) {
                    url = jqXHR.getResponseHeader('Location');
                    xhr = ajax.get({
                        url: url
                    });
                    return xhr.done((data, textStatus, jqXHR) => {
                        this.trigger('sync');
                        return options.success(data);
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
            ajax.token = token.get();
            jqXHR = ajax.put({
                url: this.url(),
                data: JSON.stringify({
                    body: model.get('body')
                })
            });
            jqXHR.done((response) => {
                this.trigger('sync');
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
    getAnnotations(cb = function (x) { }) {
        var annotations, jqXHR;
        if (this.get('annotations') != null) {
            return cb(this.get('annotations'));
        }
        else {
            annotations = new Annotations([], {
                transcriptionId: this.id,
                entryId: this.collection.entryId,
                projectId: this.collection.projectId
            });
            jqXHR = annotations.fetch({
                success: (collection) => {
                    this.set('annotations', collection);
                    this.listenTo(collection, 'add', this.addAnnotation);
                    this.listenTo(collection, 'remove', this.removeAnnotation);
                    return cb(collection);
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
    }
    addAnnotation(model) {
        var $body;
        if (model.get('annotationNo') == null) {
            console.error('No annotationNo given!', model.get('annotationNo'));
            return false;
        }
        $body = $(`<div>${this.get('body')}</div>`);
        $body.find('[data-id="newannotation"]').attr('data-id', model.get('annotationNo'));
        return this.resetAnnotationOrder($body);
    }
    removeAnnotation(model) {
        var jqXHR;
        jqXHR = model.destroy();
        jqXHR.done(() => {
            var $body;
            $body = $(`<div>${this.get('body')}</div>`);
            $body.find(`[data-id='${model.get('annotationNo')}']`).remove();
            return this.resetAnnotationOrder($body, false);
        });
        return jqXHR.fail((response) => {
            this.get('annotations').add(model);
            if (response.status === 401) {
                return Backbone.history.navigate('login', {
                    trigger: true
                });
            }
        });
    }
    resetAnnotationOrder($body, add = true) {
        var jqXHR;
        $body.find('sup[data-marker="end"]').each((index, sup) => {
            return sup.innerHTML = index + 1;
        });
        this.set('body', $body.html());
        jqXHR = this.save(null, {
            success: () => {
                var message;
                message = add ? "New annotation added." : "Annotation removed.";
                return this.publish('message', message);
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
}

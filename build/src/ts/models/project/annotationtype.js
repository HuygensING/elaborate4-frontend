import _ from "underscore";
import config from "../config";
import ajax from "hilib/managers/ajax";
import syncOverride from "hilib/mixins/model.sync";
import Backbone from "backbone";
import Base from "../base";
export default class AnnotationType extends Base {
    urlRoot = () => {
        return config.get('restUrl') + "annotationtypes";
    };
    defaults() {
        return {
            creator: null,
            modifier: null,
            name: '',
            description: '',
            annotationTypeMetadataItems: [],
            createdOn: '',
            modifiedOn: ''
        };
    }
    initialize() {
        super.initialize();
        return _.extend(this, syncOverride);
    }
    parse(attrs) {
        attrs.title = attrs.name;
        return attrs;
    }
    sync(method, model, options) {
        var jqXHR;
        if (method === 'create') {
            jqXHR = ajax.post({
                url: this.url(),
                dataType: 'text',
                data: JSON.stringify({
                    name: model.get('name'),
                    description: model.get('description')
                })
            });
            jqXHR.done((data, textStatus, jqXHR) => {
                var xhr;
                if (jqXHR.status === 201) {
                    xhr = ajax.get({
                        url: jqXHR.getResponseHeader('Location')
                    });
                    return xhr.done((data, textStatus, jqXHR) => {
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
            jqXHR = ajax.put({
                url: this.url(),
                data: JSON.stringify({
                    name: model.get('name'),
                    description: model.get('description')
                })
            });
            jqXHR.done((response) => {
                return this.trigger('sync');
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

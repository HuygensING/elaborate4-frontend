import ajax from "../managers/ajax";
import token from "../managers/token";
export default {
    syncOverride: function (method, model, options) {
        var data, defaults, i, jqXHR, len, name, obj, ref;
        if (options.attributes != null) {
            obj = {};
            ref = options.attributes;
            for (i = 0, len = ref.length; i < len; i++) {
                name = ref[i];
                obj[name] = this.get(name);
            }
            data = JSON.stringify(obj);
        }
        else {
            data = JSON.stringify(model.toJSON());
        }
        defaults = {
            url: this.url(),
            dataType: 'text',
            data: data
        };
        options = $.extend(defaults, options);
        if (method === 'create') {
            ajax.token = token.get();
            jqXHR = ajax.post(options);
            jqXHR.done((data, textStatus, jqXHR) => {
                var xhr;
                if (jqXHR.status === 201) {
                    xhr = ajax.get({
                        url: jqXHR.getResponseHeader('Location')
                    });
                    return xhr.done((data, textStatus, jqXHR) => {
                        this.trigger('sync');
                        return options.success(data);
                    });
                }
            });
            return jqXHR.fail((response) => {
                return console.log('fail', response);
            });
        }
        else if (method === 'update') {
            ajax.token = token.get();
            jqXHR = ajax.put(options);
            jqXHR.done((response) => {
                return this.trigger('sync');
            });
            return jqXHR.fail((response) => {
                return console.log('fail', response);
            });
        }
    }
};

import config from "./models/config";
import token from "hilib/managers/token";
import ajax from "hilib/managers/ajax";
export default class EntryMetadata {
    url;
    constructor(projectID) {
        this.url = `${config.get('restUrl')}projects/${projectID}/entrymetadatafields`;
    }
    fetch(cb) {
        var jqXHR;
        ajax.token = token.get();
        jqXHR = ajax.get({
            url: this.url
        });
        return jqXHR.done(function (data) {
            return cb(data);
        });
    }
    save(newValues, options) {
        var jqXHR;
        ajax.token = token.get();
        jqXHR = ajax.put({
            url: this.url,
            dataType: 'text',
            data: JSON.stringify(newValues)
        });
        jqXHR.done(() => {
            if (options.success != null) {
                return options.success(arguments);
            }
        });
        return jqXHR.fail(() => {
            if (options.error != null) {
                return options.error(arguments);
            }
        });
    }
}
;

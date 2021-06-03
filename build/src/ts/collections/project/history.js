import config from "../../models/config";
import ajax from "hilib/managers/ajax";
export default class ProjectHistory {
    url;
    constructor(projectID) {
        this.url = `${config.get('restUrl')}projects/${projectID}/logentries`;
    }
    fetch(done) {
        var jqXHR;
        jqXHR = ajax.get({
            url: this.url
        });
        jqXHR.done((response) => {
            return done(response);
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
;

var ProjectHistory, ajax, config;
ProjectHistory = class ProjectHistory {
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
    constructor(projectID) {
        this.url = `${config.get('restUrl')}projects/${projectID}/logentries`;
    }
};
export default ProjectHistory;

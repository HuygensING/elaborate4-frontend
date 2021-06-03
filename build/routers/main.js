import Backbone from "backbone";
import _ from "underscore";
import $ from "jquery";
import history from "hilib/managers/history";
import Pubsub from "hilib/mixins/pubsub";
import currentUser from "../models/currentUser";
import Projects from "../collections/projects";
import EditMetadata from "../views/project/search/edit-metadata";
import Entry from "../views/entry/main";
import Header from "../views/ui/header";
import Login from "../views/login";
import NoProject from "../views/no-project";
import ProjectHistory from "../views/project/history";
import ProjectSettings from "../views/project/settings/main";
import Search from "../views/project/search";
import SetNewPassword from "../views/set-new-password";
import Statistics from "../views/project/statistics";
import ViewManager from "../util/view-manager";
const viewManager = new ViewManager();
class MainRouter extends Backbone.Router {
    project;
    initialize() {
        _.extend(this, Pubsub);
        this.on('route', () => {
            return history.update();
        });
        return this.on('route:search', () => {
            return Backbone.trigger('router:search');
        });
    }
    init() {
        if (Backbone.history.fragment === 'resetpassword') {
            return;
        }
        return currentUser.authorize({
            authorized: () => {
                Projects.fetch();
                return Projects.getCurrent((project) => {
                    var header, ref, url;
                    this.project = project;
                    if (this.project == null) {
                        return this.navigate('noproject', {
                            trigger: true
                        });
                    }
                    this.listenTo(this.project.get('settings'), 'settings:saved', (model, changed) => {
                        if (changed != null ? changed.hasOwnProperty('results-per-page') : void 0) {
                            return viewManager.removeFromCache(`search-${this.project.get('name')}`);
                        }
                    });
                    document.title = `eLaborate - ${this.project.get('title')}`;
                    url = (ref = history.last()) != null ? ref : 'projects/' + this.project.get('name');
                    this.navigate(url, {
                        trigger: true
                    });
                    header = new Header({
                        project: this.project
                    });
                    $('#container').prepend(header.el);
                    return this.listenTo(Projects, 'current:change', (project1) => {
                        this.project = project1;
                        document.title = `eLaborate - ${this.project.get('title')}`;
                        return this.navigate(`projects/${this.project.get('name')}`, {
                            trigger: true
                        });
                    });
                });
            },
            unauthorized: () => {
                return this.publish('login:failed');
            },
            navigateToLogin: () => {
                return this.navigate('login', {
                    trigger: true
                });
            }
        });
    }
    publicationErrors() {
        return viewManager.show(PublicationErrors);
    }
    login() {
        if (currentUser.loggedIn) {
            return currentUser.logout();
        }
        return viewManager.show(Login);
    }
    noproject() {
        var view;
        if (currentUser.loggedIn) {
            view = new NoProject();
            $('div#main').append(view.el);
            currentUser.loggedIn = false;
            return sessionStorage.clear();
        }
        else {
            return this.login();
        }
    }
    setNewPassword() {
        var view;
        this.login();
        view = new SetNewPassword();
        return $('div#main').append(view.el);
    }
    search(projectName) {
        return viewManager.show(Search, {
            projectName: projectName
        }, {
            cache: `search-${projectName}`
        });
    }
    editMetadata(projectName) {
        return viewManager.show(EditMetadata, {
            projectName: projectName
        });
    }
    projectSettings(projectName, tab) {
        return viewManager.show(ProjectSettings, {
            projectName: projectName,
            tabName: tab
        });
    }
    projectHistory(projectName) {
        return viewManager.show(ProjectHistory, {
            projectName: projectName,
            cache: false
        });
    }
    statistics(projectName) {
        return viewManager.show(Statistics, {
            projectName: projectName,
            cache: false
        });
    }
    entry(projectName, entryID, transcriptionName, annotationID) {
        var attrs, changedIndex;
        attrs = {
            projectName: projectName,
            entryId: entryID,
            transcriptionName: transcriptionName,
            annotationID: annotationID
        };
        if (this.project != null) {
            changedIndex = this.project.get('entries').changed.indexOf(+entryID);
        }
        if (changedIndex > -1) {
            this.project.get('entries').changed.splice(changedIndex, 1);
            attrs.cache = false;
        }
        return viewManager.show(Entry, attrs);
    }
}
;
MainRouter.prototype.routes = {
    '': 'search',
    'login': 'login',
    'noproject': 'noproject',
    'resetpassword': 'setNewPassword',
    'projects/:name': 'search',
    'projects/:name/edit-metadata': 'editMetadata',
    'projects/:name/settings/:tab': 'projectSettings',
    'projects/:name/settings': 'projectSettings',
    'projects/:name/history': 'projectHistory',
    'projects/:name/statistics': 'statistics',
    'projects/:name/entries/:id': 'entry',
    'projects/:name/entries/:id/transcriptions/:name': 'entry',
    'projects/:name/entries/:id/transcriptions/:name/annotations/:id': 'entry',
    'projects/:name/publication-errors': 'publicationErrors'
};
export default new MainRouter();
class PublicationErrors extends Backbone.View {
    className = 'publication-errors';
    project;
    initialize() {
        return Projects.getCurrent((project) => {
            this.project = project;
            return this.render();
        });
    }
    render() {
        var div, error, errors, h2, i, len, li, ol, timestamp;
        errors = JSON.parse(localStorage.getItem(`${this.project.get('name')}:publicationErrors:value`));
        timestamp = localStorage.getItem(`${this.project.get('name')}:publicationErrors:timestamp`);
        if ((errors == null) || !errors.length) {
            div = document.createElement("i");
            div.innerHTML = "No errors found.";
        }
        else {
            ol = document.createElement("ol");
            for (i = 0, len = errors.length; i < len; i++) {
                error = errors[i];
                li = document.createElement("li");
                li.innerHTML = error;
                ol.appendChild(li);
            }
            h2 = document.createElement("h2");
            h2.innerHTML = `Publication errors of ${(new Date(+timestamp)).toString()}`;
            div = document.createElement("div");
            div.appendChild(h2);
            div.appendChild(ol);
        }
        this.$el.html(div);
        return this;
    }
    destroy() {
        return this.remove();
    }
}
;

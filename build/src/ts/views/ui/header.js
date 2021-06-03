import Backbone from "backbone";
import $ from "jquery";
import BaseView from "hilib/views/base";
import config from "../../models/config";
import Fn from "hilib/utils/general";
import StringFn from "hilib/utils/string";
import Modal from "hilib/views/modal";
import currentUser from "../../models/currentUser";
import projects from "../../collections/projects";
import tpl from "../../../jade/ui/header.jade";
export default class Header extends BaseView {
    options;
    project;
    initialize(options) {
        this.options = options;
        super.initialize();
        this.project = this.options.project;
        this.listenTo(projects, 'current:change', (project) => {
            this.project = project;
            return this.render();
        });
        this.listenTo(config, 'change:entryTermPlural', this.render);
        this.subscribe('message', this.showMessage, this);
        return this.render();
    }
    navigateToProject(ev) {
        return Backbone.history.navigate(`projects/${this.project.get('name')}`, {
            trigger: true
        });
    }
    navigateToProjectSettings(ev) {
        return Backbone.history.navigate(`projects/${this.project.get('name')}/settings`, {
            trigger: true
        });
    }
    navigateToProjectStatistics(ev) {
        return Backbone.history.navigate(`projects/${this.project.get('name')}/statistics`, {
            trigger: true
        });
    }
    navigateToProjectHistory(ev) {
        return Backbone.history.navigate(`projects/${this.project.get('name')}/history`, {
            trigger: true
        });
    }
    render() {
        var rtpl;
        rtpl = tpl({
            projects: projects,
            user: currentUser,
            plural: StringFn.ucfirst(config.get('entryTermPlural'))
        });
        this.$el.html(rtpl);
        return this;
    }
    setProject(ev) {
        var id;
        this.$('span.projecttitle').html($('<i class="fa fa-spinner fa-spin" />').html());
        id = ev.hasOwnProperty('currentTarget') ? +ev.currentTarget.getAttribute('data-id') : ev;
        return projects.setCurrent(id);
    }
    showMessage(msg) {
        var $message;
        if (msg.trim().length === 0) {
            return false;
        }
        $message = this.$('.message');
        if (!$message.hasClass('active')) {
            $message.addClass('active');
        }
        $message.html(msg);
        return Fn.timeoutWithReset(5000, (() => {
            return $message.removeClass('active');
        }), () => {
            $message.addClass('pulse');
            return setTimeout((() => {
                return $message.removeClass('pulse');
            }), 1000);
        });
    }
    addProject = () => {
        var modal;
        modal = null;
        return function (ev) {
            if (modal != null) {
                return;
            }
            modal = new Modal({
                title: "Add project",
                html: "<form> <ul> <li> <label>Name</label> <input name=\"project-title\" type=\"text\" /> </li> <li> <label>Type</label> <select name=\"project-type\"> <option value=\"collection\">Collection</option> <option value=\"mvn\">MVN</option> </select> </li> </ul> </form>",
                submitValue: 'Add project',
                width: '300px'
            });
            modal.on('submit', () => {
                return projects.create({
                    title: $('input[name="project-title"]').val(),
                    type: $('select[name="project-type"]').val()
                }, {
                    wait: true,
                    success: (model) => {
                        return modal.close();
                    },
                    error: (response) => {
                        if (response.status === 401) {
                            return Backbone.history.navigate('login', {
                                trigger: true
                            });
                        }
                    }
                });
            });
            return modal.on('close', function () {
                return modal = null;
            });
        };
    };
}
;
Header.prototype.className = 'main';
Header.prototype.tagName = 'header';
Header.prototype.events = () => ({
    'click .left .projecttitle': 'navigateToProject',
    'click .left .settings': 'navigateToProjectSettings',
    'click .left .search': 'navigateToProject',
    'click .left .statistics': 'navigateToProjectStatistics',
    'click .left .history': 'navigateToProjectHistory',
    'click .middle .message': function () {
        return this.$('.message').removeClass('active');
    },
    'click .right .logout': function () {
        return currentUser.logout();
    },
    'click .right .project:not(.active)': 'setProject',
    'click .right .addproject': 'addProject'
});

import Backbone from "backbone"
import $ from "jquery"
import config from "../../models/config"
import { Modal, Fn, stringFn, BaseView, className, tagName } from "@elaborate4-frontend/hilib"
import currentUser from "../../models/currentUser"
import projects from "../../collections/projects"
import tpl from "../../../jade/ui/header.jade"

@className('main')
@tagName('header')
export default class Header extends BaseView {
  options
  project
  modal

  // ### Initialize
  constructor(options?) {
    super(options)
    this.options = options
    this.project = this.options.project
    this.listenTo(projects, 'current:change', (project) => {
      this.project = project
      this.render()
    });
    this.listenTo(config, 'change:entryTermPlural', this.render)
    this.subscribe('message', this.showMessage)
    this.render()
  }

  // ### Events
  events() {
    return {
      'click .left .projecttitle': 'navigateToProject',
      'click .left .settings': 'navigateToProjectSettings',
      'click .left .search': 'navigateToProject',
      'click .left .statistics': 'navigateToProjectStatistics',
      'click .left .history': 'navigateToProjectHistory',
      'click .middle .message': function() {
        return this.$('.message').removeClass('active');
      },
      'click .right .logout': function() {
        return currentUser.logout();
      },
      'click .right .project:not(.active)': 'setProject',
      'click .right .addproject': 'addProject'
    }
  }

  navigateToProject(ev) {
    Backbone.history.navigate(`projects/${this.project.get('name')}`, {
      trigger: true
    });
  }

  navigateToProjectSettings(ev) {
    Backbone.history.navigate(`projects/${this.project.get('name')}/settings`, {
      trigger: true
    });
  }

  navigateToProjectStatistics(ev) {
    Backbone.history.navigate(`projects/${this.project.get('name')}/statistics`, {
      trigger: true
    });
  }

  navigateToProjectHistory(ev) {
    Backbone.history.navigate(`projects/${this.project.get('name')}/history`, {
      trigger: true
    });
  }

  // ### Render
  render() {
    const rtpl = tpl({
      projects: projects,
      user: currentUser,
      plural: stringFn.ucfirst(config.get('entryTermPlural'))
    })
    this.$el.html(rtpl)
    return this
  }

  // ### Methods
  setProject(ev) {
    this.$('span.projecttitle').html('<i class="fa fa-spinner fa-spin" />')
    const id = ev.hasOwnProperty('currentTarget') ? +ev.currentTarget.getAttribute('data-id') : ev;
    projects.setCurrent(id);
  }

  showMessage = (msg: string) => {
    console.log(msg)
    if (msg.trim().length === 0) {
      return false;
    }
    const $message = this.$('.message');
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

  addProject() {
    if (this.modal != null) return
    this.modal = new Modal({
      title: "Add project",
      html: "<form> <ul> <li> <label>Name</label> <input name=\"project-title\" type=\"text\" /> </li> <li> <label>Type</label> <select name=\"project-type\"> <option value=\"collection\">Collection</option> <option value=\"mvn\">MVN</option> </select> </li> </ul> </form>",
      submitValue: 'Add project',
      width: '300px'
    })

    this.modal.on('submit', () => {
      return projects.create({
        title: $('input[name="project-title"]').val(),
        type: $('select[name="project-type"]').val()
      }, {
        wait: true,
        // We don't have to call an update of the UI, because the UI is updated when the current
        // project changes. This is done by the projects collection listening to the sync event.
        success: (model) => {
          this.modal.close();
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
    this.modal.on('close', () => { this.modal = null })
  }
}


import Backbone from "backbone"
import config from "../../../models/config"
import currentUser from "../../../models/currentUser"
import projects from "../../../collections/projects"
import Entry from "../../../models/entry"
import { BaseView } from "@elaborate4-frontend/hilib"
import { Modal } from "@elaborate4-frontend/hilib"
import tpl from "./submenu.jade"
import { className } from "@elaborate4-frontend/hilib"

@className('submenu')
export default class SearchSubmenu extends BaseView {
  project
  modal

  // ### Initialize
  constructor(options?) {
    super(options)

    this.listenTo(config, 'change:entryTermSingular', this.render);

    projects.getCurrent(project => {
      this.project = project
      this.render()
    })
  }

  // ### Render
  render() {
    const rtpl = tpl({
      user: currentUser,
      config: config,
      projects: projects
    })
    this.$el.html(rtpl)
    // Check if a draft is in the process of being published.
    this.pollDraft()
    return this
  }

  // The edit multiple metadata button can only function once the faceted search results
  // have been loaded. This method is called from this views parent after the first results are rendered.
  enableEditMetadataButton() {
    this.$('li[data-key="editmetadata"]').addClass('enabled');
  }

  // ### Events
  events() {
    return {
      'click li[data-key="newsearch"]': function() {
        return this.trigger('newsearch');
      },
      'click li[data-key="newentry"]': 'newEntry',
      'click li[data-key="save-edit-metadata"]:not(.inactive)': function(ev) {
        return this.trigger('save-edit-metadata');
      },
      'click li[data-key="cancel-edit-metadata"]': function() {
        return this.trigger('cancel-edit-metadata');
      },
      'click li[data-key="editmetadata"].enabled': function() {
        // console.log 'here'
        // Backbone.history.navigate "projects/#{@project.get('name')}/edit-metadata", trigger: true
        return this.trigger('edit-metadata');
      },
      'click li[data-key="delete"]': 'deleteProject',
      'click li[data-key="publish"]': 'publishDraft' // Method is located under "Methods"
    };
  }

  publishDraft() {
    this.activatePublishDraftButton()
    this.project.publishDraft(() => {
      this.deactivatePublishDraftButton()
    })
  }

  newEntry() {
    const modal = new Modal({
      title: `Create a new ${config.get('entryTermSingular')}`,
      html: '<form><ul><li><label>Name</label><input type="text" name="name" /></li></ul></form>',
      submitValue: `Create ${config.get('entryTermSingular')}`,
      width: '300px'
    })

    modal.on('submit', () => {
      var entry;
      modal.message('success', `Creating a new ${config.get('entryTermSingular')}...`);
      // @listenToOnce entries, 'add', (entry) =>
      entry = new Entry({
        name: modal.$('input[name="name"]').val()
      });
      entry.project = this.project;
      // return console.log entry
      entry.save([], {
        success: (model) => {
          // When we navigate, the current enty will change. This view listens to entries current:change and navigates
          // so we have to stop listening before we navigate and change the current entry.
          this.stopListening();
          this.project.get('entries').add(model);
          modal.close();
          // @ts-ignore
          this.publish('faceted-search:refresh');
          // @ts-ignore
          this.publish('message', `New ${config.get('entryTermSingular')} added to project.`);
          Backbone.history.navigate(
            `projects/${this.project.get('name')}/entries/${entry.id}`,
            { trigger: true }
          )
        }
      })
    })
  }

  // entries.create {name: modal.$('input[name="name"]').val()}, wait: true

    // ### Methods
  activatePublishDraftButton() {
    const busyText = 'Publishing draft'
    const button = this.$('li[data-key="publish"]')
    const span = button.find('span')
    if (span.html() === busyText) return false
    span.html(busyText)
    button.addClass('active')
  }

  deactivatePublishDraftButton() {
    const button = this.el.querySelector('li[data-key="publish"]')
    button.innerHTML = 'Publish draft'
    button.classList.remove('active')
  }

  activateEditMetadataSaveButton() {
    this.$('li[data-key="save-edit-metadata"]').removeClass('inactive');
  }

  deactivateEditMetadataSaveButton() {
    this.$('li[data-key="save-edit-metadata"]').addClass('inactive');
  }

  // pollDraft is used to start polling when a draft is in the process of being published.
  // This can happen when a user refreshes the browser while the draft is not finished.
  pollDraft() {
    const locationUrl = localStorage.getItem('publishDraftLocation');
    if (locationUrl != null) {
      this.activatePublishDraftButton();
      return this.project.pollDraft(locationUrl, () => {
        return this.deactivatePublishDraftButton();
      });
    }
  }

  deleteProject() {
    if (this.modal != null) return

    this.modal = new Modal({
      title: 'Caution!',
      html: `You are about to <b>REMOVE</b> project: \"${this.project.get('title')}\" <small>(id: ${this.project.id})</small>.<br><br>All ${config.get('entryTermPlural')} will be <b>PERMANENTLY</b> removed!`,
      submitValue: 'Remove project',
      width: 'auto'
    })

    this.modal.on('submit', () => {
      return this.project.destroy({
        wait: true,
        success: () => {
          this.modal.close();
          projects.setCurrent(projects.first().id);
          this.publish('message', `Removed ${this.project.get('title')}.`);
        }
      })
    })

    this.modal.on('close', () => { this.modal = null })
  }
}

import Backbone from "backbone"
import _ from "underscore"
import $ from "jquery"
import { BaseView, className, Modal, stringFn, Async, Fn, Form } from "@elaborate4-frontend/hilib"
import config from "../../models/config"
import tpl from "../../../jade/entry/main.submenu.jade"
import metadataTpl from "../../../jade/entry/metadata.jade"

// ## EntryMetadata
@className('submenu')
export default class EntrySubmenu extends BaseView {
  entry
  user
  project
  modal

  // ### Initialize
  constructor(private options?) {
    super(options)
    this.entry = this.options.entry
    this.user = this.options.user
    this.project = this.options.project
  }


  // @render is called from parent (entry.renderTranscriptionEditor)
  // ### Render
  render() {
    var rtpl;
    rtpl = tpl({
      entry: this.entry,
      user: this.user
    });
    this.$el.html(rtpl);
    this.entry.setPrevNext(() => {
      // prevID and nextID are set on the model.
      this.activatePrevNext()
    })
    return this
  }

  events() {
    return {
      'click .menu li.active[data-key="previous"]': '_goToPreviousEntry',
      'click .menu li.active[data-key="next"]': '_goToNextEntry',
      'click .menu li[data-key="delete"]': 'deleteEntry',
      'click .menu li[data-key="metadata"]': 'editEntryMetadata',
      'click .menu li[data-key="facsimiles"] li[data-key="facsimile"]': 'changeFacsimile'
    };
  }

  changeFacsimile(ev) {
    var facsimileID, newFacsimile;
    // Remove reference to any entry-left-preview, so when the user navigates to prev/next entry
    // the left pane will show the facsimile and not a transcription.
    config.set('entry-left-preview', null);
    // Check if ev is an Event, else assume ev is an ID
    facsimileID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
    this.$('.left-menu .facsimiles li.active').removeClass('active');
    this.$('.left-menu .textlayers li.active').removeClass('active');
    this.$('.left-menu .facsimiles li[data-value="' + facsimileID + '"]').addClass('active');
    newFacsimile = this.entry.get('facsimiles').get(facsimileID);
    if (newFacsimile != null) {
      return this.entry.get('facsimiles').setCurrent(newFacsimile);
    }
  }

  activatePrevNext() {
    if (this.entry.prevID != null) {
      this.$('li[data-key="previous"]').addClass('active');
    }
    if (this.entry.nextID != null) {
      return this.$('li[data-key="next"]').addClass('active');
    }
  }

  _goToPreviousEntry() {
    var projectName, transcription;
    projectName = this.entry.project.get('name');
    transcription = stringFn.slugify(this.entry.get('transcriptions').current.get('textLayer'));
    return Backbone.history.navigate(`projects/${projectName}/entries/${this.entry.prevID}/transcriptions/${transcription}`, {
      trigger: true
    });
  }

  _goToNextEntry() {
    var projectName, transcription;
    projectName = this.entry.project.get('name');
    transcription = stringFn.slugify(this.entry.get('transcriptions').current.get('textLayer'));
    return Backbone.history.navigate(`projects/${projectName}/entries/${this.entry.nextID}/transcriptions/${transcription}`, {
      trigger: true
    });
  }

  adjustTextareaHeight(ev) {
    var target;
    target = ev.hasOwnProperty('currentTarget') ? ev.currentTarget : ev;
    target.style.height = '24px';
    return target.style.height = target.scrollHeight + 12 + 'px';
  }

  deleteEntry() {
    if (this.modal != null) return

    this.modal = new Modal({
      title: 'Caution!',
      html: `You are about to <b>REMOVE</b> entry: \"${this.entry.get('name')}\" <small>(id: ${this.entry.id})</small>.<br><br>All text and annotations will be <b>PERMANENTLY</b> removed!`,
      submitValue: 'Remove entry',
      width: 'auto'
    })

    this.modal.on('submit', () => {
      const jqXHR = this.entry.destroy();
      jqXHR.done(() => {
        this.modal.close();
        this.publish('faceted-search:refresh');
        this.publish('message', `Removed entry ${this.entry.id} from project.`);
        Backbone.history.navigate(`projects/${this.project.get('name')}`, {
          trigger: true
        })
      })
    })

    this.modal.on('close', () => {
      this.modal = null
    })
  }

  editEntryMetadata() {
    if (this.modal != null) return

    const entryMetadata = new Form({
      tpl: metadataTpl,
      tplData: {
        user: this.user,
        // Pass the entrymetadatafields array to keep the same order/sequence as is used on the settings page.
        entrymetadatafields: this.project.get('entrymetadatafields'),
        generateID: Fn.generateID
      },
      model: this.entry.clone()
    })

    this.modal = new Modal({
      title: `Edit ${config.get('entryTermSingular')} metadata`,
      html: entryMetadata.el,
      submitValue: 'Save metadata',
      width: '50vw',
      customClassName: 'entry-metadata'
    })

    this.modal.on('submit', () => {
      this.entry.updateFromClone(entryMetadata.model);
      const async = new Async(['entry', 'settings']);

      this.listenToOnce(async, 'ready', () => {
        // TODO metadata changed!
        this.modal.close()
        this.publish('message', `Saved metadata for entry: ${this.entry.get('name')}.`)
      })

      this.entry.get('settings').save(null, {
        success: function() {
          async.called('settings');
        }
      })

      this.entry.save(null, {
        success: function() {
          async.called('entry');
        }
      })
    })

    this.modal.on('close', () => {
      this.modal = null
      $('.entry-metadata form.hilib textarea').off('keydown', this.adjustTextareaHeight)
    })

    $('.entry-metadata form.hilib textarea').each((i, te) => { this.adjustTextareaHeight(te) })

    $('.entry-metadata form.hilib textarea').on('keydown', this.adjustTextareaHeight)
  }
}

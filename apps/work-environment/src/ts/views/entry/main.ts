import Backbone from "backbone"
import $ from "jquery"
import { BaseView, Modal, Async, Fn } from "@elaborate4-frontend/hilib"

import config from "../../models/config"

import EntryModel from "../../models/entry"
import currentUser from "../../models/currentUser"

import projects from "../../collections/projects"

import Submenu from "./main.submenu"
import Preview from "./preview/main"
import EditFacsimiles from "./subsubmenu/facsimiles.edit"
import AnnotationEditor from "./editors/annotation"
import LayerEditor from "./editors/layer"

import tpl from "../../../jade/entry/main.jade"
import { className } from "@elaborate4-frontend/hilib"

@className('entry')
export default class Entry extends BaseView {
  project
  entry
  currentTranscription

  // ### Initialize
  constructor(private options?) {
    super(options)
    // Models.state.onHeaderRendered => @render() # TODO Remove this check!
    const async = new Async(['transcriptions', 'facsimiles', 'settings']);
    this.listenToOnce(async, 'ready', () => this.render())
    projects.getCurrent((project) => {
      var jqXHR;
      this.project = project;
      this.entry = this.project.get('entries').get(this.options.entryId);
      if (this.entry == null) {
        this.entry = new EntryModel({
          id: this.options.entryId,
          projectID: this.project.id
        });
        this.project.get('entries').add(this.entry);
      }
      this.entry.project = this.project;
      jqXHR = this.entry.fetch({
        success: (model, response, options) => {
          this.entry.fetchTranscriptions(this.options.transcriptionName, (currentTranscription) => {
            this.currentTranscription = currentTranscription
            async.called('transcriptions')
          })
          this.entry.fetchFacsimiles(() => {
            async.called('facsimiles')
          })
          this.entry.fetchSettings(() => {
            async.called('settings')
          })
        }
      })
      jqXHR.fail((response) => {
        if (response.status === 401) {
          Backbone.history.navigate('login', { trigger: true })
        }
      })
    })
  }

  // ### Render
  render() {
    const rtpl = tpl({
      entry: this.entry,
      user: currentUser
    });
    this.$el.html(rtpl);
    // Render submenu
    // @subviews.submenu = viewManager.show @el, Views.Submenu,
    // 	prepend: true
    this.subviews.submenu = new Submenu({
      entry: this.entry,
      user: currentUser,
      project: this.project
    } as any);
    this.$el.prepend(this.subviews.submenu.el);
    this.renderEditFacsimilesMenu();
    if (config.get('entry-left-preview') != null) {
      const transcription = this.entry.get('transcriptions').findWhere({
        'textLayer': config.get('entry-left-preview')
      })
      this.showLeftTranscription(transcription?.id);
    } else {
      this.renderFacsimile();
    }
    this.renderTranscriptionEditor();
    this.addListeners();
    // Get the annotations for the current transcription.
    // * TODO: Move to model?
    this.currentTranscription.getAnnotations((annotations) => {
      // If an annotationID was passed as an option, this means the URI mentions the annotation + ID
      // and we have to show it.
      if (this.options.annotationID != null) {
        const annotation = annotations.get(this.options.annotationID)
        this.subviews.preview.setAnnotatedText(annotation)
        this.renderAnnotationEditor(annotation)
      }
    });
    return this
  }

  renderEditFacsimilesMenu() {
    this.subviews.editFacsimiles = new EditFacsimiles({
      collection: this.entry.get('facsimiles')
    });
    this.$('.subsubmenu .editfacsimiles').replaceWith(this.subviews.editFacsimiles.el)
  }

  renderFacsimile() {
    var $iframe, url;
    // @ts-ignore
    this.el.querySelector('.left-pane iframe').style.display = 'block';
    // @ts-ignore
    this.el.querySelector('.left-pane .preview-placeholder').style.display = 'none';
    // Reset the src of the iframe. This is needed to remove the current facsimile from the view
    // if it is deleted by the user and is the last facsimile in the collection.
    $iframe = this.$('.left-pane iframe');
    $iframe.attr('src', '');
    // Only load the iframe with the current facsimile if there is a current facsimile
    if (this.entry.get('facsimiles').current != null) {
      url = this.entry.get('facsimiles').current.get('zoomableUrl');
      $iframe.attr('src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.1/viewer.html?rft_id=' + url);
      // Set the height of EntryPreview to the clientHeight - menu & submenu (89px)
      $iframe.height(document.documentElement.clientHeight - 89)
    }
  }

  renderPreview() {
    if (this.subviews.preview != null) {
      this.subviews.preview.setModel(this.entry);
    } else {
      // @subviews.preview = viewManager.show @el.querySelector('.container .preview-placeholder'), Views.Preview,
      // 	model: @entry
      // 	append: true
      this.subviews.preview = new Preview({
        model: this.entry,
        wordwrap: this.project.get('settings').get('wordwrap')
      })

      this.$('.right-pane .preview-placeholder').append(this.subviews.preview.el);
    }
  }

  // * TODO: How many times is renderTranscriptionEditor called on init?
  renderTranscriptionEditor() {
    // The preview is based on the transcription, so we have to render it each time the transcription is rendered
    this.renderPreview();
    this.subviews.submenu.render();
    if (!this.subviews.layerEditor) {
      this.subviews.layerEditor = new LayerEditor({
        model: this.currentTranscription,
        height: this.subviews.preview.$el.innerHeight(),
        width: this.subviews.preview.$el.outerWidth(),
        wordwrap: this.project.get('settings').get('wordwrap')
      })
      this.$('.transcription-placeholder').html(this.subviews.layerEditor.el);
    } else {
      this.subviews.layerEditor.show(this.currentTranscription);
    }
    if (this.subviews.annotationEditor != null) {
      this.subviews.annotationEditor.hide()
    }
  }

  renderAnnotationEditor(model) {
    function showAnnotationEditor() {
      if (!this.subviews.annotationEditor) {
        this.subviews.annotationEditor = new AnnotationEditor({
          model,
          height: this.subviews.preview.$el.innerHeight() - 31,
          width: this.subviews.preview.$el.outerWidth()
        })
        this.$('.annotation-placeholder').html(this.subviews.annotationEditor.el);
        this.listenTo(this.subviews.annotationEditor, 'cancel', () => {
          this.showUnsavedChangesModal({
            model: this.subviews.annotationEditor.model,
            html: `<p>There are unsaved changes in annotation: ${this.subviews.annotationEditor.model.get('annotationNo')}.<p>`,
            done: () => {
              this.subviews.preview.removeNewAnnotationTags()
              this.renderTranscriptionEditor()
            }
          })
        })
        this.listenTo(this.subviews.annotationEditor, 'newannotation:saved', (annotation) => {
          this.currentTranscription.get('annotations').add(annotation);
          this.subviews.preview.highlightAnnotation(annotation.get('annotationNo'));
        })
        this.listenTo(this.subviews.annotationEditor, 'hide', (annotationNo) => {
          this.subviews.preview.unhighlightAnnotation(annotationNo);
        })
      } else {
        this.subviews.annotationEditor.show(model);
      }

      this.subviews.preview.highlightAnnotation(model.get('annotationNo'))
      this.subviews.layerEditor.hide()
    }

    this.showUnsavedChangesModal({
      model: this.subviews.layerEditor.model,
      html: `<p>There are unsaved changes in the ${this.subviews.layerEditor.model.get('textLayer')} layer.</p>`,
      done: showAnnotationEditor
    })
  }

  
    // ### Events
  events() {
    return {
      'click li[data-key="layer"]': 'changeTranscription',
      // 'click .left-menu ul.facsimiles li[data-key="facsimile"]': 'changeFacsimile'
      'click .left-menu ul.textlayers li[data-key="transcription"]': 'showLeftTranscription',
      'click .middle-menu ul.textlayers li[data-key="transcription"]': 'changeTranscription',
      'click .menu li.subsub': function(ev) {
        return this.subviews.editFacsimiles.$el.slideToggle('fast');
      }
    };
  }

  showLeftTranscription(ev) {
    var transcription, transcriptionID;
    // Hide the facsimile iframe.
    this.$('.left-pane iframe').hide();
    // Show the preview placeholder.
    this.$('.left-pane .preview-placeholder').show();
    // Get the selected transcription.
    transcriptionID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
    transcription = this.entry.get('transcriptions').get(transcriptionID);
    // Set the name of the transcription to the config, so when the user navigates prev/next
    // the view can show the same layer in the left pane.
    config.set('entry-left-preview', transcription.get('textLayer'));
    if (this.subviews.leftPreview != null) {
      // Init the leftPreview view. Destroy old one if it exists.
      this.subviews.leftPreview.destroy();
    }
    this.subviews.leftPreview = new Preview({
      model: this.entry,
      textLayer: transcription,
      wordwrap: true
    } as any);
    this.$('.left-pane .preview-placeholder').html(this.subviews.leftPreview.el);
    // Add/remove CSS classes.
    this.$('.left-menu .facsimiles li.active').removeClass('active');
    this.$('.left-menu .textlayers li.active').removeClass('active');
    this.$('.left-menu .textlayers li[data-value="' + transcriptionID + '"]').addClass('active');
    // Unset the current facsimile, otherwise when switching from transcription to facsimile,
    // the facsimile will not be loaded, because the facsimiles collection thinks the current
    // facsimile is the same as the one requested and thus will not update.
    return this.entry.get('facsimiles').current = null;
  }

  //	# IIFE to toggle the subsubmenu. We use an iife so we don't have to add a public variable to the view.
  //	# The iife keeps track of the currentMenu. Precaution: @ refers to the window object in the iife!
  //	# OBSOLETE
  //	subsubmenu: do ->
  //		currentMenu = null

  //		close: ->
  //			$('.subsubmenu').removeClass 'active'
  //			currentMenu = null
  //		toggle: (ev) ->
  //			# The newMenu's name is set as a data-key.
  //			newMenu = ev.currentTarget.getAttribute 'data-key'

  //			# If the user clicks on the currentMenu, close it.
  //			if currentMenu is newMenu
  //				$(ev.currentTarget).removeClass 'rotateup'
  //				$('.subsubmenu').removeClass 'active'
  //				currentMenu = null

  //			# Either the subsubmenu is not visible (currentMenu=null) or the user
  //			# clicked on another subsubmenu. In the last case we have to rotate the
  //			# arrow down (removeClass 'rotateup') for the currentMenu.
  //			else
  //				# User clicked on another subsubmenu than currentMenu
  //				if currentMenu?
  //					$('.submenu li[data-key="'+currentMenu+'"]').removeClass 'rotateup'
  //				# Subsubmenu was closed, open it by adding 'active' class
  //				else
  //					$('.subsubmenu').addClass 'active'

  //				# Rotate the newMenu's arrow
  //				$('.submenu li[data-key="'+newMenu+'"]').addClass 'rotateup'

  //				# Show the newMenu and hide all others (siblings)
  //#				$('.subsubmenu').find('.'+newMenu).appendCloseButton
  //#					corner: 'bottomright'
  //#					close: => @close()
  //				$('.subsubmenu').find('.'+newMenu).show().siblings().hide()

  //				currentMenu = newMenu
  showUnsavedChangesModal(args) {
    var done, html, model;
    ({model, html, done} = args);
    if (model.changedSinceLastSave != null) {
      if (this.subviews.modal != null) {
        this.subviews.modal.destroy();
      }
      this.subviews.modal = new Modal({
        title: "Unsaved changes",
        html: html,
        submitValue: 'Discard changes',
        width: '320px'
      } as any);
      return this.subviews.modal.on('submit', () => {
        model.cancelChanges();
        this.subviews.modal.close();
        return done();
      });
    } else {
      return done();
    }
  }

  showTranscription(ev) {
    var newTranscription, transcriptionID;
    // Check if ev is an Event, else assume ev is an ID
    transcriptionID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
    newTranscription = this.entry.get('transcriptions').get(transcriptionID);
    // If the newTranscription is truly new than set it to be the current transcription.
    if (newTranscription !== this.currentTranscription) {
      
      // Set @currentTranscription to newTranscription
      this.entry.get('transcriptions').setCurrent(newTranscription);
    // If newTranscription and @currentTranscription are the same then it is possible the transcription editor
    // is not visible. If it is not visible, than we have to trigger the change manually, because setCurrent doesn't
    // trigger when the model hasn't changed.
    } else if (!this.subviews.layerEditor.visible()) {
      // @subviews.layerEditor.show()
      this.entry.get('transcriptions').trigger('current:change', this.currentTranscription);
    }
  }

  changeTranscription(ev) {
    ev.stopPropagation()

    if ((this.subviews.annotationEditor != null) && this.subviews.annotationEditor.visible()) {
      this.showUnsavedChangesModal({
        model: this.subviews.annotationEditor.model,
        html: `<p>There are unsaved changes in annotation: ${this.subviews.annotationEditor.model.get('annotationNo')}.</p>`,
        done: () => this.showTranscription(ev)
      })
    } else {
      this.showUnsavedChangesModal({
        model: this.subviews.layerEditor.model,
        html: `<p>There are unsaved changes in the ${this.subviews.layerEditor.model.get('textLayer')} layer.</p>`,
        done: () => this.showTranscription(ev)
      })
    }
  }

  // ### Methods

    // destroy: ->
  // 	@subviews.preview.destroy()

    // 	@destroy()
  addListeners() {
    this.listenTo(this.subviews.preview, 'editAnnotation', this.renderAnnotationEditor);
    this.listenTo(this.subviews.preview, 'annotation:removed', this.renderTranscriptionEditor);
    // layerEditor cannot use the general Fn.setScrollPercentage function, so it implements it's own.
    this.listenTo(this.subviews.preview, 'scrolled', (percentages) => {
      this.subviews.layerEditor.subviews.editor.setScrollPercentage(percentages);
    });
    this.listenTo(this.subviews.layerEditor.subviews.editor, 'scrolled', (percentages) => {
      this.subviews.preview.setScroll(percentages);
    });
    this.listenTo(this.subviews.layerEditor, 'wrap', (wrap) => {
      this.subviews.preview.toggleWrap(wrap);
    });
    this.listenTo(this.entry.get('facsimiles'), 'current:change', (current) => {
      this.renderFacsimile();
    });
    this.listenTo(this.entry.get('facsimiles'), 'add', this.addFacsimile);
    this.listenTo(this.entry.get('facsimiles'), 'remove', this.removeFacsimile);
    this.listenTo(this.entry.get('transcriptions'), 'current:change', (current) => {
      this.currentTranscription = current;
      // getAnnotations is async, but we can render the transcription anyway and make the assumption (yeah, i know)
      // the user is not fast enough to click an annotation
      this.currentTranscription.getAnnotations((annotations) => {
        this.renderTranscriptionEditor()
      })
    })

    this.listenTo(this.entry.get('transcriptions'), 'add', this.addTranscription);
    this.listenTo(this.entry.get('transcriptions'), 'remove', this.removeTranscription);

    window.addEventListener('resize', (ev) => {
      Fn.timeoutWithReset(600, () => {
        this.renderFacsimile();
        this.subviews.preview.resize();
        this.subviews.layerEditor.subviews.editor.setIframeHeight(this.subviews.preview.$el.innerHeight());
        this.subviews.layerEditor.subviews.editor.setIframeWidth(this.subviews.preview.$el.outerWidth());
        if (this.subviews.annotationEditor != null) {
          this.subviews.annotationEditor.subviews.editor.setIframeHeight(this.subviews.preview.$el.innerHeight());
          this.subviews.annotationEditor.subviews.editor.setIframeWidth(this.subviews.preview.$el.outerWidth());
        }
      })
    })
  }

  addFacsimile(facsimile, collection) {
    var li;
    // Update facsimile count in submenu
    this.$('li[data-key="facsimiles"] span').html(`(${collection.length})`);
    // Add the new facsimile to the menu
    li = $(`<li data-key='facsimile' data-value='${facsimile.id}'>${facsimile.get('name')}</li>`);
    this.$('.submenu .facsimiles').append(li);
    // Change the facsimile to the newly added facsimile
    this.subviews.submenu.changeFacsimile(facsimile.id);
    this.subviews.editFacsimiles.$el.slideToggle('fast');
    
    this.publish('message', `Added facsimile: \"${facsimile.get('name')}\".`);
  }

  removeFacsimile(facsimile, collection) {
    if (this.entry.get('facsimiles').current === facsimile) {
      this.entry.get('facsimiles').setCurrent();
    }
    
    // Update facsimile count in submenu
    this.$('li[data-key="facsimiles"] span').html(`(${collection.length})`);
    // Remove the facsimile from the submenu
    this.$('.submenu .facsimiles [data-value="' + facsimile.id + '"]').remove();

    this.publish('message', `Removed facsimile: \"${facsimile.get('name')}\".`);
  }

  removeTranscription(transcription) {
    this.$('.submenu .textlayers [data-value="' + transcription.id + '"]').remove();

    this.publish('message', `Removed text layer: \"${transcription.get('textLayer')}\".`);
  }

  addTranscription(transcription) {
    var li;
    // Add the new text layer to the submenu
    li = $(`<li data-key='transcription' data-value='${transcription.id}'>${transcription.get('textLayer')} layer</li>`);
    this.$('.submenu .textlayers').append(li);
    
    // Change the transcription to the newly added transcription
    this.changeTranscription(transcription.id);
    this.subviews.editFacsimiles.$el.slideToggle('fast');

    this.publish('message', `Added text layer: \"${transcription.get('textLayer')}\".`);
  }

};

const hasProp = {}.hasOwnProperty

import $ from "jquery"
import _ from "underscore"

// @options
//	textLayer	String 		The text layer to show, defaults to current text layer.
//	wordwrap	Boolean		Defaults to false
import Fn from "hilib/utils/general"
import dom from "hilib/utils/dom"
import config from "../../../models/config"
import EntryModel from "../../../models/entry"
import BaseView from "hilib/views/base"
import AddAnnotationTooltip from "./annotation.add.tooltip"
import EditAnnotationTooltip from "./annotation.edit.tooltip"

import currentUser from "../../../models/currentUser"

// Tpl = require 'text!html/entry/preview.html'
import tpl from "../../../../jade/entry/preview.jade"

// ## TranscriptionPreview
export default class EntryPreview extends BaseView {
  declare model: EntryModel
  autoscroll
  highlighter
  interactive
  transcription
  newAnnotation

  // ### Initialize
  constructor(private options?) {
    super({ ...options, className: 'preview' })
    var base;

    this.autoscroll = false;
    this.highlighter = Fn.highlighter();
    this.interactive = this.options.textLayer != null ? false : true;

    if (this.options.textLayer != null) {
      this.transcription = this.options.textLayer;
      this.addListeners()
      this.render()
    } else {
      this.model.get('transcriptions').getCurrent((transcription1) => {
        this.transcription = transcription1;
        this.addListeners();
        return this.render();
      });
    }

    if ((base = this.options).wordwrap == null) {
      base.wordwrap = false;
    }
    if (this.options.wordwrap) {
      this.toggleWrap();
    }
    this.resize();
  }

  // ### Render
  render() {
    var count, data, lineCount, ref, ref1, term;
    data = this.transcription.toJSON();
    // Count all the <br>s in the body string. Match returns null if no breaks are found.
    lineCount = ((ref = data.body.match(/<br>/g)) != null ? ref : []).length;
    if (data.body.substr(-4) !== '<br>') {
      // If the body string does not end with a <br> that means there is
      // some text after the last <br> and we have to add a linenumber.
      lineCount++;
    }
    data.lineCount = lineCount;
    if (data.body.trim() === '') {
      data.lineCount = 0;
    }
    ref1 = this.model.get('terms');
    for (term in ref1) {
      if (!hasProp.call(ref1, term)) continue;
      count = ref1[term];
      data.body = data.body.replace(new RegExp(term, "gi"), '<span class="highlight">$&</span>');
    }
    data.user = currentUser;
    this.el.innerHTML = tpl(data);
    this.renderTooltips();
    this.onHover();
    return this;
  }

  renderTooltips() {
    if (this.subviews.editAnnotationTooltip != null) {
      this.subviews.editAnnotationTooltip.destroy();
    }
    this.subviews.editAnnotationTooltip = new EditAnnotationTooltip({
      container: this.el.querySelector('.body-container'),
      interactive: this.interactive
    } as any);
    if (this.interactive) {
      this.listenTo(this.subviews.editAnnotationTooltip, 'edit', (model) => {
        return this.trigger('editAnnotation', model);
      });
      this.listenTo(this.subviews.editAnnotationTooltip, 'delete', (model) => {
        if (model.get('annotationNo') === 'newannotation') {
          this.removeNewAnnotation();
        } else {
          // Remove the annotation from the collection, the transcription model wil take care of the rest
          this.transcription.get('annotations').remove(model);
        }
        // Let the entry view know an annotation has been removed so it can remove the annotationEditor view and
        // show the current transcription.
        return this.trigger('annotation:removed');
      });
      if (this.subviews.addAnnotationTooltip != null) {
        this.subviews.addAnnotationTooltip.destroy();
      }
      return this.subviews.addAnnotationTooltip = new AddAnnotationTooltip({
        container: this.el.querySelector('.body-container'),
        annotationTypes: this.model.project.get('annotationtypes')
      } as any);
    }
  }

  // ### Events
  events() {
    return {
      'click sup[data-marker="end"]': 'supClicked',
      'mousedown .body-container': 'onMousedown',
      'mouseup .body-container': 'onMouseup',
      'scroll': 'onScroll',
      'click .fa.fa-print': 'onPrint'
    };
  }

  // When the user wants to print we create a div#printpreview directly under <body> and show
  // a clone of the preview body and an ordered list of the annotations.
  onPrint(ev) {
    var addAnnotations, addTranscription, h1, h2, mainDiv, pp, transcription;
    if (!this.interactive) {
      return;
    }
    addTranscription = (el) => {
      var clonedPreview;
      clonedPreview = el.cloneNode(true);
      clonedPreview.style.height = 'auto';
      return mainDiv.appendChild(clonedPreview);
    };
    addAnnotations = (annotations) => {
      var h2, ol, sups;
      if ((annotations != null) && annotations.length > 0) {
        ol = document.createElement('ol');
        ol.className = 'annotations';
        sups = document.querySelectorAll('sup[data-marker="end"]');
        _.each(sups, (sup) => {
          var annotation, li;
          annotation = annotations.findWhere({
            annotationNo: +sup.getAttribute('data-id')
          });
          li = document.createElement('li');
          li.innerHTML = annotation.get('body');
          return ol.appendChild(li);
        });
        h2 = document.createElement('h2');
        h2.innerHTML = 'Annotations';
        mainDiv.appendChild(h2);
        return mainDiv.appendChild(ol);
      }
    };
    pp = document.querySelector('#printpreview');
    if (pp != null) {
      pp.parentNode.removeChild(pp);
    }
    mainDiv = document.createElement('div');
    mainDiv.id = 'printpreview';
    h1 = document.createElement('h1');
    h1.innerHTML = 'Preview entry: ' + this.model.get('name');
    h2 = document.createElement('h2');
    h2.innerHTML = 'Project: ' + this.model.project.get('title');
    mainDiv.appendChild(h1);
    mainDiv.appendChild(h2);
    if (config.get('entry-left-preview') != null) {
      addTranscription(document.querySelector('.left-pane .preview'));
      transcription = this.model.get('transcriptions').findWhere({
        'textLayer': config.get('entry-left-preview')
      });
      addAnnotations(transcription.get('annotations'));
    }
    addTranscription(document.querySelector('.right-pane .preview'));
    addAnnotations(this.model.get('transcriptions').current.get('annotations'));
    document.body.appendChild(mainDiv);
    return window.print();
  }

  onScroll(ev) {
    if (!this.interactive) {
      return;
    }
    if (this.autoscroll = !this.autoscroll) {
      return Fn.timeoutWithReset(200, () => {
        return this.trigger('scrolled', Fn.getScrollPercentage(ev.currentTarget));
      });
    }
  }

  supClicked(ev) {
    var annotation, id;
    if (this.transcription.get('annotations') == null) {
      return console.error('No annotations found!');
    }
    id = ev.currentTarget.getAttribute('data-id');
    annotation = id === 'newannotation' ? this.newAnnotation : this.transcription.get('annotations').findWhere({
      annotationNo: id >> 0
    });
    if (annotation == null) {
      return console.error('Annotation not found! ID:', id, ' Collection:', this.transcription.get('annotations'));
    }
    this.setAnnotatedText(annotation);
    return this.subviews.editAnnotationTooltip.show({
      $el: $(ev.currentTarget),
      model: annotation
    });
  }

  onMousedown(ev) {
    var downOnAdd, downOnEdit;
    if (!this.interactive) {
      return;
    }
    downOnAdd = ev.target === this.subviews.addAnnotationTooltip.el || dom(this.subviews.addAnnotationTooltip.el).hasDescendant(ev.target);
    downOnEdit = ev.target === this.subviews.editAnnotationTooltip.el || dom(this.subviews.editAnnotationTooltip.el).hasDescendant(ev.target);
    if (!(downOnEdit || downOnAdd)) {
      // Hide all tooltips, we check what to show in onMouseup.
      this.subviews.addAnnotationTooltip.hide();
      this.subviews.editAnnotationTooltip.hide();
      // Stop listening to the add annotation tooltip, because the add annotation tooltip has a
      // listenToOnce on it and when the user clicks outside the tooltip, the listener is still there.
      // If we don't remove it, the new annotation will popup on all previous selected areas.
      return this.stopListening(this.subviews.addAnnotationTooltip);
    }
  }

  onMouseup(ev) {
    var checkMouseup, upOnAdd, upOnEdit;
    if (!this.interactive) {
      return;
    }
    upOnAdd = ev.target === this.subviews.addAnnotationTooltip.el || dom(this.subviews.addAnnotationTooltip.el).hasDescendant(ev.target);
    upOnEdit = ev.target === this.subviews.editAnnotationTooltip.el || dom(this.subviews.editAnnotationTooltip.el).hasDescendant(ev.target);
    checkMouseup = () => {
      var isInsideMarker, range, sel;
      sel = document.getSelection();
      // If there is no range to get (for example when using the scrollbar)
      // or
      // When the user clicked a sup
      if (sel.rangeCount === 0 || ev.target.tagName === 'SUP' || ev.target.tagName === 'BUTTON') {
        // Only hide the tooltip, don't stopListening, because the click to add an annotation also ends up here
        this.subviews.addAnnotationTooltip.hide();
        return false;
      }
      range = sel.getRangeAt(0);
      // Boolean to check if the selection start or ends on a <span data-marker="start"> or <sup data-marker="end">.
      // A selection cannot start inside a marker.
      isInsideMarker = range.startContainer.parentNode.hasAttribute('data-marker') || range.endContainer.parentNode.hasAttribute('data-marker');
      // if not range.collapsed and not startIsSup and not endIsSup
      if (!(range.collapsed || isInsideMarker || this.$('[data-id="newannotation"]').length > 0)) {
        if (this.transcription.changedSinceLastSave != null) {
          //@ts-ignore
          return this.publish('message', `Save the ${this.transcription.get('textLayer')} layer, before adding a new annotation!`);
        } else {
          // ListenToOnce, so when the tooltip is clicked, the listener is removed.
          // If the tooltip isn't clicked, the tooltip will be hidden en stopListening'd
          // in the onMousedown.
          this.listenToOnce(this.subviews.addAnnotationTooltip, 'clicked', (model) => {
            return this.addNewAnnotation(model, range);
          });
          // Show the add annotation tooltip.
          return this.subviews.addAnnotationTooltip.show({
            left: ev.pageX,
            top: ev.pageY
          });
        }
      }
    };
    if (!(upOnAdd || upOnEdit)) {
      // Move checkMouseup to the end of the event queue, because the we want to wait for the
      // browser to finish events like deselect.
      return setTimeout(checkMouseup, 0);
    }
  }

  // ### Methods
  toggleWrap(wrap?) {
    return this.$el.toggleClass('wrap', wrap);
  }

  // destroy: ->
  // 	@subviews.addAnnotationTooltip.destroy() if @subviews.addAnnotationTooltip?
  // 	@subviews.editAnnotationTooltip.destroy()

    // 	@remove()
  setScroll(percentages) {
    this.autoscroll = true;
    // Use setTimeout to wait for other events to finish first
    return setTimeout(() => {
      return Fn.setScrollPercentage(this.el, percentages);
    });
  }

  highlightAnnotation(annotationNo) {
    var el, range;
    range = document.createRange();
    range.setStartAfter(this.el.querySelector('span[data-id="' + annotationNo + '"]'));
    range.setEndBefore(this.el.querySelector('sup[data-id="' + annotationNo + '"]'));
    el = document.createElement('span');
    el.className = 'hilite';
    el.setAttribute('data-highlight', '');
    el.appendChild(range.extractContents());
    return range.insertNode(el);
  }

  unhighlightAnnotation() {
    var docFrag, el;
    el = this.el.querySelector('span[data-highlight]');
    if (el != null) {
      // Move all children from el to a documentFragment
      docFrag = document.createDocumentFragment();
      while (el.childNodes.length) {
        docFrag.appendChild(el.firstChild);
      }
      // Replace el with the documentFragment
      return el.parentNode.replaceChild(docFrag, el);
    }
  }

  unhighlightQuery() {
    var docFrag, el;
    el = this.el.querySelector('span.highlight');
    if (el != null) {
      // Move all children from el to a documentFragment
      docFrag = document.createDocumentFragment();
      while (el.childNodes.length) {
        docFrag.appendChild(el.firstChild);
      }
      // Replace el with the documentFragment
      return el.parentNode.replaceChild(docFrag, el);
    }
  }

  // Set the text that is annotated to the annotation model. This is the text between the start (<span>) and end (<sup>) tag.
  // Text (numbers) from annotations (<sup>s) between de start and end tag are filtered out.
  setAnnotatedText(annotation) {
    var annotationNo, endNode, range, startNode, text, treewalker;
    annotationNo = annotation.get('annotationNo');
    startNode = this.el.querySelector('span[data-id="' + annotationNo + '"]');
    endNode = this.el.querySelector('sup[data-id="' + annotationNo + '"]');
    // Create a range between start and end nodes.
    range = document.createRange();
    range.setStartAfter(startNode);
    range.setEndBefore(endNode);
    // Create a TreeWalker based on the cloned contents (documentFragment).
    treewalker = document.createTreeWalker(range.cloneContents(), NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // Skip <sup>s. A sup must only contain a textNode, but in the unlikely case it will not,
        // for example: <sup data-id="46664"><i>12</i></sup>, "12" will be part of the returned text variable.
        // @ts-ignore
        if (node.parentNode.nodeType === 1 && node.parentNode.tagName === 'SUP' && node.parentNode.hasAttribute('data-id')) {
          return NodeFilter.FILTER_SKIP;
        } else {
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    });
    // Walk the tree and extract the textContent from the nodes.
    text = '';
    while (treewalker.nextNode()) {
      text += treewalker.currentNode.textContent;
    }
    return annotation.set('annotatedText', text);
  }

  addNewAnnotation(newAnnotation, range) {
    var annotations;
    this.unhighlightAnnotation();
    this.newAnnotation = newAnnotation;
    this.addNewAnnotationTags(range);
    // Set the urlRoot manually, because a new annotation has not been added to the collection yet.
    annotations = this.transcription.get('annotations');
    newAnnotation.urlRoot = () => {
      return `${config.get('restUrl')}projects/${annotations.projectId}/entries/${annotations.entryId}/transcriptions/${annotations.transcriptionId}/annotations`;
    };
    this.setAnnotatedText(newAnnotation);
    return this.trigger('editAnnotation', newAnnotation);
  }

  addNewAnnotationTags(range) {
    var span, sup;
    // Create marker at the beginning of the selection
    span = document.createElement('span');
    span.setAttribute('data-marker', 'begin');
    span.setAttribute('data-id', 'newannotation');
    range.insertNode(span);
    // Create marker at the end of the selection
    // range.collapse(false) collapses the range to the end (true collapses to the beginning)
    sup = document.createElement('sup');
    sup.setAttribute('data-marker', 'end');
    sup.setAttribute('data-id', 'newannotation');
    sup.innerHTML = 'new';
    range.collapse(false);
    range.insertNode(sup);
    // TODO Why set body of @transcription? We don't want to save a transcription
    // with <span data-id=newannotation>, this is error prone!
    return this.setTranscriptionBody();
  }

  removeNewAnnotation() {
    this.newAnnotation = null;
    return this.removeNewAnnotationTags();
  }

  removeNewAnnotationTags() {
    this.$('[data-id="newannotation"]').remove();
    return this.setTranscriptionBody();
  }

  setTranscriptionBody() {
    this.unhighlightQuery();
    this.unhighlightAnnotation();
    return this.transcription.set('body', this.$('.body-container .body').html(), {
      silent: true
    });
  }

  onHover() {
    var markers, supEnter, supLeave;
    supEnter = (ev) => {
      var id, startNode;
      id = ev.currentTarget.getAttribute('data-id');
      if (!(startNode = this.el.querySelector(`span[data-id='${id}']`))) {
        console.error('No span found');
        return false;
      }
      return this.highlighter.on({
        startNode: startNode,
        endNode: ev.currentTarget
      });
    };
    supLeave = (ev) => {
      return this.highlighter.off();
    };
    markers = this.$('sup[data-marker]');
    // Unbind previous events
    markers.off('mouseenter mouseleave');
    // Bind hover (mouseenter, mouseleave)
    return markers.hover(supEnter, supLeave);
  }

  resize() {
    this.$el.height(document.documentElement.clientHeight - 89 - 78);
    if (Fn.hasYScrollBar(this.el)) {
      return this.el.style.marginRight = '0';
    }
  }

  setModel(entry) {
    this.unhighlightAnnotation();
    this.model = entry;
    this.transcription = this.model.get('transcriptions').current;
    this.addListeners();
    return this.render();
  }

  addListeners() {
    // * TODO: Triggers double render??
    this.listenTo(this.transcription, 'current:change', this.render);
    return this.listenTo(this.transcription, 'change:body', this.render);
  }

};

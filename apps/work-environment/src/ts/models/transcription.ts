import Backbone from "backbone"
import $ from "jquery"
import _ from "underscore"
import { BaseModel, changedSinceLastSave, token, ajax } from "@elaborate4-frontend/hilib"
import Annotations from "../collections/annotations"

export class Transcription extends BaseModel {
  defaults() {
    return {
      annotations: null,
      textLayer: '',
      title: '',
      body: ''
    };
  }

  // ### Initialize
  constructor(attrs?, options?) {
    super(attrs, options)
    _.extend(this, changedSinceLastSave(['body']));
    // @ts-ignore
    this.initChangedSinceLastSave();
  }

  // @changedSinceLastSave = null
  // @on 'change:body', (model, options) => 
  // 	@changedSinceLastSave = model.previousAttributes().body unless @changedSinceLastSave?

    // @listenToAnnotations()

    // Can't save on every body:change, because the body is changed when the text is altered and thus will trigger too many saves.
  // We cannot do it silent, because the preview has to be updated.
  // @on 'change:body', @save, @

    // ### Overrides

    // save: ->
  // 	@changedSinceLastSave = null

    // 	super
  set(attrs, options) {
    if (attrs === 'body') {
      // Chrome adds <div>s to the text when we hit enter/return we have to remove them to keep the text
      // as simple (and versatile) as possible and to keep the annotation tooltips working. FF only adds <br>s.
      // Example input: <div>texta</div><div><br></div><div>textb</div><div>textc</div>
      // First we replace a Chrome <div><br></div> with a <br>.
      // Then we unwrap the texts in <div> and precede it with a <br>.
      // Example output: <br>texta<br><br>textb<br>textc
      // * TODO: Test in IE
      options = options.replace(/<div><br><\/div>/g, '<br>');
      options = options.replace(/<div>(.*?)<\/div>/g, (match, p1, offset, string) => {
        return '<br>' + p1;
      });
      options.trim();
    }
    // options = options.replace /<span (.*?)>(.*?)<\/span>/g, (match, p1, p2, offset, string) => p2
    return super.set(attrs, options);
  }

  sync(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify({
          textLayer: model.get('textLayer'),
          body: model.get('body')
        })
      });
      jqXHR.done((data, textStatus, jqXHR) => {
        var url, xhr;
        if (jqXHR.status === 201) {
          url = jqXHR.getResponseHeader('Location');
          xhr = ajax.get({
            url: url
          });
          return xhr.done((data, textStatus, jqXHR) => {
            this.trigger('sync');
            return options.success(data);
          });
        }
      });
      return jqXHR.fail((response) => {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      });
    } else if (method === 'update') {
      ajax.token = token.get();
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify({
          body: model.get('body')
        })
      });
      jqXHR.done((response) => {
        this.trigger('sync');
        return options.success(response);
      });
      return jqXHR.fail((response) => {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      });
    } else {
      return super.sync(method, model, options);
    }
  }

  // ### Methods
  getAnnotations(cb = function(x: any) {}) {
    var annotations, jqXHR;
    if (this.get('annotations') != null) {
      return cb(this.get('annotations'));
    } else {
      annotations = new Annotations([], {
        transcriptionId: this.id,
        // @ts-ignore
        entryId: this.collection.entryId,
        // @ts-ignore
        projectId: this.collection.projectId
      });
      jqXHR = annotations.fetch({
        success: (collection) => {
          this.set('annotations', collection);
          this.listenTo(collection, 'add', this.addAnnotation);
          this.listenTo(collection, 'remove', this.removeAnnotation);
          return cb(collection);
        }
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

  addAnnotation(model) {
    var $body;
    if (model.get('annotationNo') == null) {
      console.error('No annotationNo given!', model.get('annotationNo'));
      return false;
    }
    $body = $(`<div>${this.get('body')}</div>`);
    // Replace newannotation with the new annotationNo
    $body.find('[data-id="newannotation"]').attr('data-id', model.get('annotationNo'));
    return this.resetAnnotationOrder($body);
  }

  removeAnnotation(model) {
    var jqXHR;
    jqXHR = model.destroy();
    jqXHR.done(() => {
      var $body;
      // Add div tags to body string so jQuery can read it
      $body = $(`<div>${this.get('body')}</div>`);
      
      // Find and remove the <span> and <sup>
      $body.find(`[data-id='${model.get('annotationNo')}']`).remove();
      return this.resetAnnotationOrder($body, false);
    });
    return jqXHR.fail((response) => {
      // Restore the removed model.
      this.get('annotations').add(model);
      if (response.status === 401) {
        return Backbone.history.navigate('login', {
          trigger: true
        });
      }
    });
  }

  resetAnnotationOrder($body, add = true) {
    var jqXHR;
    // Find all sups in $body and update the innerHTML with the new index
    $body.find('sup[data-marker="end"]').each((index, sup) => {
      return sup.innerHTML = index + 1;
    });
    // .html() does not include the <div> tags so we can set it immediately.
    this.set('body', $body.html());
    // Save the transcription to the server.
    jqXHR = this.save(null, {
      success: () => {
        var message;
        message = add ? "New annotation added." : "Annotation removed.";
        // @ts-ignore
        return this.publish('message', message);
      }
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

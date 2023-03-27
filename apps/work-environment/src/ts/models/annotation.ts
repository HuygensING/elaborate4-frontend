import Backbone from "backbone"
import _ from "underscore"
import { ajax, changedSinceLastSave } from "@elaborate4-frontend/hilib"
import config from "./config"
import { BaseModel } from "@elaborate4-frontend/hilib"

export class Annotation extends BaseModel {
  urlRoot = () => {
    // @ts-ignore
    return `${config.get('restUrl')}projects/${this.collection.projectId}/entries/${this.collection.entryId}/transcriptions/${this.collection.transcriptionId}/annotations`;
  }

  defaults() {
    return {
      annotationMetadataItems: [],
      annotationNo: 'newannotation',
      annotationType: null,
      body: '',
      createdOn: '',
      creator: null,
      modifiedOn: '',
      modifier: null,
      metadata: {}
    };
  }

  // ### Initialize
  constructor(attrs?, options?) {
    super(attrs, options)
    _.extend(this, changedSinceLastSave(['body']))
    // @ts-ignore
    this.initChangedSinceLastSave()
  }

  // ### Overrides

    // The annotation metadata is send from the server in nested objects. We create a new object (metadata)
  // and popuplate it with metadata like so: {key: value, key2: value2, ...}
  parse(attrs) {
    var i, item, key, len, metadataItem, ref, value;
    if (attrs != null) {
      attrs.metadata = {};
      ref = attrs.annotationType.metadataItems;
      // Loop all the annotation metadata (this object does not contain the values)
      // console.log attrs.annotationType
      for (i = 0, len = ref.length; i < len; i++) {
        metadataItem = ref[i];
        key = metadataItem.name;
        // Find the value corresponding to the key in the annotationMetadataItems object
        item = _.find(attrs.annotationMetadataItems, function(item) {
          return item.annotationTypeMetadataItem.name === key;
        });
        value = item != null ? item.data : '';
        attrs.metadata[key] = value;
      }
      return attrs;
    }
  }

  set(attrs, options) {
    var attr;
    if (_.isString(attrs) && attrs.substr(0, 9) === 'metadata.') {
      attr = attrs.substr(9);
      if (attr === 'type') {
        if (attr === 'type') {
          return this.trigger('change:metadata:type', parseInt(options, 10));
        }
      } else {
        return this.attributes['metadata'][attr] = options;
      }
    } else {
      return super.set(attrs, options);
    }
  }

  // sync: (method, model, options) ->
  // 	if method is 'create' or method is 'update'
  // 		options.attributes = ['body', 'typeId', 'metadata']
  // 		@syncOverride method, model, options
  // 	else
  // 		super
  sync(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      jqXHR = ajax.post({
        url: this.url(),
        data: JSON.stringify({
          body: this.get('body'),
          typeId: this.get('annotationType').id,
          metadata: this.get('metadata')
        }),
        dataType: 'text'
      });
      jqXHR.done((data, textStatus, jqXHR) => {
        var xhr;
        if (jqXHR.status === 201) {
          xhr = ajax.get({
            url: jqXHR.getResponseHeader('Location')
          });
          xhr.done((data, textStatus, jqXHR) => {
            return options.success(data);
          });
          return xhr.fail(() => {
            return console.log(arguments);
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
      // ajax.token = token.get()
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify({
          body: this.get('body'),
          typeId: this.get('annotationType').id,
          metadata: this.get('metadata')
        })
      });
      jqXHR.done((response) => {
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
  updateFromClone(clone) {
    this.set('annotationType', clone.get('annotationType'));
    return this.set('metadata', clone.get('metadata'));
  }

};

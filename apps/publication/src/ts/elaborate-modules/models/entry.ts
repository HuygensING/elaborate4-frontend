import Backbone from "backbone"
import { stringFn } from "@elaborate4-frontend/hilib"
import { config } from "../../models/config"


export class Entry extends Backbone.Model {
  annotationsIndex = {}

  url = () => `${config.get('basePath') || ''}/data/${this.get('datafile')}`

  // _id is added in the config's parse, so we can access the id. The id is added when we fetch the {id}.json. In order to
  // keep using methods like isNew() to check if the model is already fetched, we don't want to set 'id' in the config's parse.
  defaults() {
    return {
      _id: null,
      datafile: '',
      name: '',
      thumbnails: []
    }
  }

  parse(data) {
    var ann, annotation, i, j, k, l, len, len1, len2, page, ref, ref1, ref2, ref3, text, textdata, version;
    if (data.paralleltexts != null) {
      for (version in data.paralleltexts) {
        i = 1;
        text = data.paralleltexts[version].text;
        text = '<div class="line">' + text.replace(/\n|<br>/g, '</div><div class="line">') + '</div>';
        text = text.replace(/(<div class="line">)(\s*<span[^>]+><\/span>\s*)(<\/div>)/mg, "$1$2&nbsp;$3")
        data.paralleltexts[version].text = text;
        ref = data.paralleltexts[version].annotationData;
        for (j = 0, len = ref.length; j < len; j++) {
          ann = ref[j];
          this.annotationsIndex[ann.n] = ann;
        }
      }
    }
    ref1 = data.facsimiles;
    // New tiler version, with white background
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      page = ref1[k];
      page.zoom = page.zoom.replace('adore-huygens-viewer-2.0', 'adore-huygens-viewer-2.1')
    }
    // Create a hash of annotationTypes with the name as key and count as value.
    data.annotationTypes = {}
    ref2 = data.paralleltexts;
    for (text in ref2) {
      textdata = ref2[text];
      data.annotationTypes[text] = {}
      ref3 = textdata.annotationData;
      for (l = 0, len2 = ref3.length; l < len2; l++) {
        annotation = ref3[l];
        // TODO Server side
        annotation.type.name = annotation.type.name.replace('"', '')
        annotation.type.name = annotation.type.name.trim()
        // /TODO
        if (data.annotationTypes[text].hasOwnProperty(annotation.type.name)) {
          data.annotationTypes[text][annotation.type.name]++;
        } else {
          data.annotationTypes[text][annotation.type.name] = 1;
        }
      }
    }
    return data;
  }

  text(key) {
    const texts = this.get('paralleltexts')
    if (texts && key in texts) {
      return texts[key].text
    } else {
      return void 0
    }
  }

  // textVersions: ->
  // 	key for key of @get 'paralleltexts'
  annotations(key) {
    var texts;
    texts = this.get('paralleltexts')
    if (texts && key in texts) {
      return texts[key].annotationData;
    } else {
      return void 0;
    }
  }

  annotation(id) {
    return this.annotationsIndex[id];
  }

  facsimileZoomURL(page) {
    var ref, ref1;
    return (ref = this.get('facsimiles')) != null ? (ref1 = ref[page]) != null ? ref1.zoom : void 0 : void 0;
  }

  facsimileURL(options) {
    var facsimiles, level, ref, size, sizes, url;
    sizes = {
      small: 2,
      medium: 3,
      large: 4
    }
    size = (options != null ? options.size : void 0) || 'medium';
    level = sizes[size];
    facsimiles = this.get('facsimiles')
    url = facsimiles != null ? (ref = facsimiles[0]) != null ? ref.thumbnail : void 0 : void 0;
    return url != null ? url.replace(/svc.level=\d+/, `svc.level=${level}`) : void 0;
  }

  createUrl(textLayer?, annotation?) {
    let base = `/entry/${this.get('_id')}`;
    if (textLayer != null) {
      base += `/${stringFn.slugify(textLayer)}`

      if ((annotation != null)) {
        base += `/${annotation}`
      }

    }
    return base;
  }

  createMarkUrl(layer, term) {
    return `entry/${this.get('_id')}/${stringFn.slugify(layer)}/mark/${term}`
  }
}

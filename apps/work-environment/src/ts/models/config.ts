import Backbone from "backbone"

import us from "underscore.string"

import _ from "underscore"

// @ts-ignore
let basePath = window.BASE_URL;

if (basePath === '/') {
  basePath = '';
}

import envConfig from "../config/env"

class Config extends Backbone.Model {
  url = () => {
    return `${basePath}/data/config.json`;
  }

  defaults() {
    // # DEV/TEST
    // restUrl: 'http://demo7.huygens.knaw.nl/elab4testBE/'

    // # PROD
    // restUrl: 'https://rest.elaborate.huygens.knaw.nl/'
    return _.extend(envConfig, {
      basePath: basePath,
      appRootElement: '#app',
      entryTermSingular: 'entry',
      entryTermPlural: 'entries',
      searchPath: "api/search",
      resultRows: 25,
      annotationsIndexPath: `${basePath}/data/annotation_index.json`,
      roles: {
        'READER': 10,
        'USER': 20,
        'PROJECTLEADER': 30,
        'ADMIN': 40
      },
      // Attribute to check which layer the user has clicked in a text layer.
      // The attribute is sanitized in @set from "Critical annotations" to "critical"
      // Used in elaborate-modules/views/panels/index
      activeTextLayerId: null,
      // Attribute to track if the layer the user clicked is an annotations layer.
      // Set to true when during sanitation of activeTextLayerId the last part of the
      // layer was " annotations".
      // Used in elaborate-modules/views/panels/index
      activeTextLayerIsAnnotationLayer: null
    });
  }

  parse(data) {
    var entry, i, j, len, len1, ref, ref1, textlayer, tls;
    ref = data.entries;
    for (i = 0, len = ref.length; i < len; i++) {
      entry = ref[i];
      entry._id = +entry.datafile.replace('.json', '');
      entry.thumbnails = data.thumbnails[entry._id];
    }
    tls = [];
    ref1 = data.textLayers;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      textlayer = ref1[j];
      tls.push({
        id: textlayer
      });
    }
    data.textlayers = tls;
    return data;
  }

  set(attrs, options) {
    const sanitizeTextLayer = (textLayer) => {
      const splitLayer = textLayer.split(' ')
      if (splitLayer[splitLayer.length - 1] === 'annotations') {
        splitLayer.pop()
        textLayer = splitLayer.join(' ')
        this.set('activeTextLayerIsAnnotationLayer', true)
      } else {
        this.set('activeTextLayerIsAnnotationLayer', false)
      }
      return us.slugify(textLayer);
    }
    if (attrs === 'activeTextLayerId' && (options != null)) {
      options = sanitizeTextLayer(options);
    } else if (attrs.hasOwnProperty('activeTextLayerId') && attrs.activeTextLayerId != null) {
      // TODO fix
      // @ts-ignore
      attrs.activeTextLayerId = sanitizeTextLayer(attrs[activeTextLayerId]);
    }
    return super.set(attrs, options)
  }

  slugToLayer(slug) {
    var i, layer, len, ref;
    ref = this.get('textLayers') || [];
    for (i = 0, len = ref.length; i < len; i++) {
      layer = ref[i];
      if (slug === us.slugify(layer)) {
        return layer;
      }
    }
  }

};

export default new Config();

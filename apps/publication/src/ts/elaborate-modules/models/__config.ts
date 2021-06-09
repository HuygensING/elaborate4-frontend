import Backbone from "backbone"
import { stringFn } from '@elaborate4-frontend/hilib'

let basePath = BASE_URL
if (basePath === '/') {
  basePath = ''
}

class Config extends Backbone.Model {
  url = () => `${basePath}/data/config.json`

  defaults() {
    return {
      // DEV/TEST
      restUrl: 'http://demo7.huygens.knaw.nl/elab4testBE/',
      
      // PROD
      // restUrl: 'https://rest.elaborate.huygens.knaw.nl/'
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
    }
  }

  parse(data) {
    const ref = data.entries;
    for (let i = 0, len = ref.length; i < len; i++) {
      const entry = ref[i];
      entry._id = +entry.datafile.replace('.json', '')
      entry.thumbnails = data.thumbnails[entry._id]
    }
    const tls = []
    const ref1 = data.textLayers
    for (let j = 0, len1 = ref1.length; j < len1; j++) {
      const textlayer = ref1[j]
      tls.push({
        id: textlayer
      })
    }
    data.textlayers = tls
    return data
  }

  set(attrs, options) {
    console.log('MODULES CONFIG')
    if (attrs === 'activeTextLayerId' && options != null) {
      options = this.sanitizeTextLayer(options)
    } else if (attrs.hasOwnProperty('activeTextLayerId') && attrs.activeTextLayerId != null) {
      attrs.activeTextLayerId = this.sanitizeTextLayer(attrs.activeTextLayerId)
    }

    return super.set(attrs, options)
  }

  sanitizeTextLayer(textLayer) {
    const splitLayer = textLayer.split(' ')
    if (splitLayer[splitLayer.length - 1] === 'annotations') {
      splitLayer.pop()
      textLayer = splitLayer.join(' ')
      this.set('activeTextLayerIsAnnotationLayer', true)
    } else {
      this.set('activeTextLayerIsAnnotationLayer', false)
    }

    return stringFn.slugify(textLayer)
  }

  slugToLayer(slug) {
    const ref = this.get('textLayers') || [];
    for (let i = 0, len = ref.length; i < len; i++) {
      const layer = ref[i];
      if (slug === stringFn.slugify(layer)) {
        return layer;
      }
    }
  }
}

// export const config = new Config()

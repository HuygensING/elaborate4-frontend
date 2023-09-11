import Backbone from "backbone"
import us from "underscore.string"
// import pck from "../../../package.json"
const baseUrl = BASE_URL === "/" ? "" : BASE_URL

class Config extends Backbone.Model {
  url = () => `${baseUrl}/data/config.json`

  // getCdnUrl() {
  //   const majorVersion = pck.version.split(".")[0];
  //   return `//cdn.huygens.knaw.nl/elaborate/publication/${this.get('templateName')}/v${majorVersion}`;
  // }

  defaults() {
    return {
      templateName: "collection",
      annotationsIndexPath: `${baseUrl}/data/annotation_index.json`,
      basePath: baseUrl,
      // appRootElement: '#app',
      entryTermSingular: 'entry',
      entryTermPlural: 'entries',
      // searchPath: "elab4-hattem/api/search",
      // searchPath: "elab4-margarethaklooster/api/search",
      searchPath: '/api/search',
      resultRows: 25,
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

  constructor() {
    super()

    this.on('change:title', () => {
      document.title = this.get('title')
    })
  }

  parse(data) {
    data.entries.forEach(entry => {
      entry._id = +entry.datafile.replace('.json', '')
      entry.thumbnails = data.thumbnails[entry._id];
    })

    data.textlayers = [];
    data.textLayers.forEach(tl => {
      data.textlayers.push({ id: tl })
    })

    return data
  }

  private sanitizeTextLayer(textLayer) {
    const splitLayer = textLayer.split(' ')

    if (splitLayer[splitLayer.length - 1] === 'annotations') {
      splitLayer.pop()
      textLayer = splitLayer.join(' ')
      this.set('activeTextLayerIsAnnotationLayer', true)
    } else {
      this.set('activeTextLayerIsAnnotationLayer', false)
    }

    return us.slugify(textLayer)
  }

  set(attrs?, options?) {

    if (attrs === 'activeTextLayerId' && options != null) {
      return super.set(attrs, this.sanitizeTextLayer(options))
    } 
    
    let textLayerId

    if (
      attrs.hasOwnProperty('activeTextLayerId') &&
      attrs.activeTextLayerId != null
    ) {
      textLayerId = attrs.activeTextLayerId
    } else if (Array.isArray(attrs.textLayers)) {
      textLayerId = attrs.textLayers[0]
    }

    if (textLayerId != null) {
      attrs.activeTextLayerId = this.sanitizeTextLayer(textLayerId)
    }

    return super.set(attrs, options)
  }

  // slugToLayer(slug) {
  //   const ref = this.get('textLayers') || [];
  //   for (let i = 0, len = ref.length; i < len; i++) {
  //     const layer = ref[i];
  //     if (slug === us.slugify(layer)) {
  //       return layer;
  //     }
  //   }
  // }

}

export const config = new Config()

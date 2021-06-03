import Backbone from "backbone"
import _ from "underscore"
import config from "../config"

export default class QueryOptions extends Backbone.Model {
  initialAttributes

  /*
  @prop {object[]} facetValues=[] - Array of objects containing a facet name and values: {name: 'facet_s_writers', values: ['pietje', 'pukje']}
  @prop {object[]} sortParameters=[] - Array of objects containing fieldname and direction: {fieldname: 'language', direction: 'desc'}
  @prop {string[]} [resultFields] - List of metadata fields to be returned by the server for every result.
  */
  defaults() {
    return {
      facetValues: [],
      sortParameters: []
    };
  }

  /*
  @constructs
  @param {object} this.initialAttributes - The initial attributes are stored and not mutated, because on reset the original data is needed.
   	*/
  initialize(initialAttributes) {
    this.initialAttributes = initialAttributes;
  }

  // ### Overrides
  set(attrs, options) {
    var facetValues;
    if (attrs.facetValue != null) {
      // Remove old facetValue from facetValues
      facetValues = _.reject(this.get('facetValues'), function(data) {
        return data.name === attrs.facetValue.name;
      });
      // If facetValue has a 'values' property (in case of a list or boolean for example), only add the
      // facetValue if the values array is populated.
      if (attrs.facetValue.values != null) {
        if (attrs.facetValue.values.length > 0) { // Only push if there are values (values is empty when last checkbox is unchecked)
          facetValues.push(attrs.facetValue);
        }
      } else {
        // Else, in case of range for example, push to facetValues
        facetValues.push(attrs.facetValue);
      }
      // Add all facetValues to attrs, so it is set to the model.
      attrs.facetValues = facetValues;
      // Remove the single facetValue that was passed and is now added to the facetValues.
      delete attrs.facetValue;
    }
    return super.set(attrs, options);
  }

  // ### Methods

    // Reset the queryOptions to it's initial state.
  reset() {
    // Remove attributes.
    this.clear({
      silent: true
    });
    // Reset the defaults.
    this.set(this.defaults(), {
      silent: true
    });
    // Reset the attributes passed on initialization.
    return this.set(this.initialAttributes, {
      silent: true
    });
  }

};

// EXAMPLE QUERY:
// {
//   "term": "bla bloe z*",
//   "facetValues": [
//     {
//       "name": "metadata_folio_number",
//       "values": [ "191", "192" ]
//     }
//   ],
//		"sortParameters": [
//			{
//       "fieldname": "metadata_folio_side",
//       "direction": "asc"
//     }
//		],
//   "fuzzy": false,
//   "caseSensitive": false,
//   "textLayers": [
//     "Diplomatic"
//   ],
//   "searchInAnnotations": false
// }

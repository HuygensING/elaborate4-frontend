import Backbone from "backbone"
import _ from "underscore"

export default class Search extends Backbone.Model {
  defaults() { return {} }
};

// term: '*'
// title: 'Text Search'
// name: 'text_search'

// EXAMPLE QUERY:
// {
//   "term": "bla bloe z*",
//   "facetValues": [
//     {
//       "name": "metadata_folio_number",
//       "values": [ "191", "192" ],
//     }
//   ],
//   "sort": "score",
//   "sortDir": "asc",
//   "fuzzy": false,
//   "caseSensitive": false,
//   "textLayers": [
//     "Diplomatic"
//   ],
//   "searchInAnnotations": false
// }

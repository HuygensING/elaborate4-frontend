import Facet from "./main"

export default class BooleanFacet extends Facet {
  set(attrs, options) {
    if (attrs === 'options') {
      options = this.parseOptions(options);
    } else if (attrs.hasOwnProperty('options')) {
      attrs.options = this.parseOptions(attrs.options);
    }
    return super.set(attrs, options);
  }

  parseOptions(options) {
    var ref;
    // If the model has an options attribute, use it, otherwise use the passed
    // options by set. We do this to remember the checked (true/false) var in the
    // options. The count and name do not change, so we can reuse the already set
    // options attribute, if present.
    options = (ref = this.get('options')) != null ? ref : options;
    // If the count is zero, the server does not return it, so we manufacture it here.
    if (options.length === 1) {
      options.push({
        name: (!JSON.parse(options[0].name)).toString(), // Invert true/false string: JSON.parse ('false' => false), !false (false => true), .toString() (true => 'true')
        count: 0
      });
    }
    return options;
  }

}

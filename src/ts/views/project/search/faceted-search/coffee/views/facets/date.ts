// TODO use Date instead of Backbone model?
// import Date from "../../models/facets/date"

import Facet from "./main"
import tpl from "../../../jade/facets/date.jade"
import Backbone from "backbone";
import _ from "underscore";

export default class DateFacet extends Facet {
  constructor(options) {
    super({ ...options, className: 'facet data' })
    this.model = new Backbone.Model(options.attrs, { parse: true })
    this.listenTo(this.model, 'change:options', this.render)
    return this.render()
  }

  render() {
    super.render();
    const rtpl = tpl(_.extend(this.model.attributes, {
      ucfirst: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
    }));
    this.$('.placeholder').html(rtpl);
    return this;
  }

  update(newOptions) {}

  reset() {}

};

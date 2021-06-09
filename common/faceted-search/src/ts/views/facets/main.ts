import Backbone from "backbone"
import _ from "underscore"
import tpl from "../../../jade/facets/main.jade"

export default class Facet extends Backbone.View {
  config

  // ### Initialize
  constructor(options?) {
    super(options)
    this.config = options.config;
    if (this.config.get('facetTitleMap').hasOwnProperty(options.attrs.name)) {
      // Override the facet title if the user has given an alternative title in the config.
      options.attrs.title = this.config.get('facetTitleMap')[options.attrs.name];
    }
  }

  // ### Render
  render() {
    let theTemplate = tpl

    if (this.config.get('templates').hasOwnProperty('facets.main')) {
      theTemplate = this.config.get('templates')['facets.main'];
    }
    this.$el.html(theTemplate({
      model: this.model,
      config: this.config
    }));
    this.$el.attr('data-name', this.model.get('name'));
    return this;
  }

  // ### Events
  events() {
    return {
      'click h3': 'toggleBody'
    };
  }

  toggleBody(ev) {
    var func;
    func = this.$('.body').is(':visible') ? this.hideBody : this.showBody;
    // If ev is a function, than it is the callback. Use call to pass the context.
    if (_.isFunction(ev)) {
      return func.call(this, ev);
    } else {
      return func.call(this);
    }
  }

  // ### Methods
  hideMenu() {
    var $button;
    $button = this.$('header i.openclose');
    $button.addClass('fa-plus-square-o');
    $button.removeClass('fa-minus-square-o');
    return this.$('header .options').slideUp(150);
  }

  hideBody(done) {
    this.hideMenu();
    return this.$('.body').slideUp(100, () => {
      if (done != null) {
        done();
      }
      return this.$('header i.fa').fadeOut(100);
    });
  }

  showBody(done) {
    return this.$('.body').slideDown(100, () => {
      if (done != null) {
        done();
      }
      return this.$('header i.fa').fadeIn(100);
    });
  }

  destroy() {
    return this.remove();
  }

  // NOOP: Override in child
  update(_newOptions) {} // console.log newOptions

  reset() {}

  postRender() {}

};

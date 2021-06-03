import Backbone from "backbone"
import _ from "underscore"
import  Search from "../models/search"
import funcky from "funcky.util"
import tpl from "../../jade/text-search.jade"

export default class TextSearch extends Backbone.View {
  // ### Initialize
  constructor(private options) {
    super({ ...options, className: 'text-search' })
    this.setModel();
  }

  // ### Render
  render() {
    const theTemplate = this.options.config.get('templates').hasOwnProperty('text-search') ?
      this.options.config.get('templates')['text-search'] :
      tpl

    this.$el.html(theTemplate({
      model: this.model,
      // options: @options.config.get('textSearchOptions')
      config: this.options.config,
      generateId: funcky.generateID
    }));
    return this;
  }

  // ### Events
  events() {
    return {
      'click i.fa-search': 'search',
      'keyup input[name="search"]': 'onKeyUp',
      'focus input[name="search"]': function() {
        return this.$('.body .menu').slideDown(150);
      },
      'click .menu .fa-times': function() {
        return this.$('.body .menu').slideUp(150);
      },
      'change input[type="checkbox"]': 'checkboxChanged'
    };
  }

  private _addFullTextSearchParameters() {
    var ftsp, i, len, param, params;
    ftsp = this.options.config.get('textSearchOptions').fullTextSearchParameters;
    if (ftsp != null) {
      params = [];
      for (i = 0, len = ftsp.length; i < len; i++) {
        param = ftsp[i];
        params.push({
          name: param,
          term: "*"
        });
      }
      return this.model.set({
        fullTextSearchParameters: params
      });
    }
  }

  setModel() {
    if (this.model != null) {
      this.stopListening(this.model);
    }

    const textSearchOptions = this.options.config.get('textSearchOptions');
    const attrs = _.clone(textSearchOptions);

    if (textSearchOptions.caseSensitive) {
      attrs.caseSensitive = false;
    } else {
      delete attrs.caseSensitive;
    }

    if (textSearchOptions.fuzzy) {
      attrs.fuzzy = false;
    } else {
      delete attrs.fuzzy;
    }

    this.model = new Search(attrs);

    this._addFullTextSearchParameters();

    this.listenTo(this.options.config, "change:textSearchOptions", () => {
      this._addFullTextSearchParameters()
      this.render()
    })
  }

  onKeyUp(ev) {
    var clone, field, i, len;
    if (ev.keyCode === 13) {
      ev.preventDefault();
      return this.search(ev);
    }
    // The term can be passed to 
    if (this.model.has('term')) {
      // Update the mainModel (queryOptions) silently. We want to set the term
      // to the mainModel. When autoSearch is off and the user wants to
      // perform a search, the term is known to the queryModel.
      if (this.model.get('term') !== ev.currentTarget.value) {
        this.model.set({
          term: ev.currentTarget.value
        });
      }
    } else {
      clone = _.clone(this.model.get('fullTextSearchParameters'));
      for (i = 0, len = clone.length; i < len; i++) {
        field = clone[i];
        field.term = ev.currentTarget.value;
      }
      this.model.set({
        fullTextSearchParameters: clone
      });
    }
    return this.updateQueryModel();
  }

  checkboxChanged(ev) {
    var attr, cb, checkedArray, dataAttr, dataAttrArray, i, j, len, len1, ref, ref1;
    dataAttr = ev.currentTarget.getAttribute('data-attr');
    dataAttrArray = ev.currentTarget.getAttribute('data-attr-array');
    if (attr = dataAttr) {
      if (attr === 'searchInTranscriptions') {
        this.$('ul.textlayers').toggle(ev.currentTarget.checked);
      }
      this.model.set(attr, ev.currentTarget.checked);
    } else if (dataAttrArray === 'fullTextSearchParameters') {
      checkedArray = [];
      ref = this.el.querySelectorAll('[data-attr-array="fullTextSearchParameters"]');
      for (i = 0, len = ref.length; i < len; i++) {
        cb = ref[i];
        if (cb.checked) {
          checkedArray.push({
            name: cb.getAttribute('data-value'),
            term: this.$('input[name="search"]').val()
          });
        }
      }
      this.model.set(dataAttrArray, checkedArray);
    } else if (dataAttrArray != null) {
      checkedArray = [];
      ref1 = this.el.querySelectorAll(`[data-attr-array=\"${dataAttrArray}\"]`);
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        cb = ref1[j];
        if (cb.checked) {
          checkedArray.push(cb.getAttribute('data-value'));
        }
      }
      this.model.set(dataAttrArray, checkedArray);
    }
    return this.updateQueryModel();
  }

  // else
  //   console.log attr
  // console.log @model.attributes
  // @updateQueryModel()
  search(ev) {
    ev.preventDefault();
    return this.trigger('search');
  }

  // ### Methods
  updateQueryModel() {
    return this.trigger('change', this.model.attributes);
  }

  reset() {
    this.setModel();
    return this.render();
  }

  destroy() {
    return this.remove();
  }
}

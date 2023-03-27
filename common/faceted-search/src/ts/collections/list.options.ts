import Backbone from "backbone"
import _ from "underscore"
import { ListOption } from "../models/facets/list.option"
import { model } from '@elaborate4-frontend/hilib'

@model(ListOption)
export class ListOptions extends Backbone.Collection {
  // ### Initialize
  constructor(models?, options?) {
    super(models, options)
    // Set the default comparator
    this.comparator = this.strategies.amount_desc;
  }

  // ### Methods

    // Alias for reset, because a collection already has a reset method.
  revert() {
    this.comparator = this.strategies.amount_desc
    this.each((option) => {
      option.set('checked', false, { silent: true })
    })
  }

  // TODO Don't do two loops, combine into one.
  updateOptions(newOptions = []) {
    // Reset all the options count to 0
    this.each((option) => {
      option.set('count', 0, { silent: true })
    })

    // Loop the options returned by the server to update the count on each one.
    _.each(newOptions, (newOption) => {
      let opt = this.get(newOption.name)
      // If option already exists in the collection, update the count.
      if (opt != null) {
        return opt.set('count', newOption.count, {
          silent: true
        })
      } else {
        // Else create the new option and add it to the collection.
        opt = new ListOption(newOption)
        return this.add(opt)
      }
    })

    return this.sort()
  }

  //      add = if model.get('visible') then -10000000 else 0
  //      add + (-1 * +model.get('count'))
  orderBy(strategy, silent = false) {
    this.comparator = this.strategies[strategy]
    return this.sort({ silent: silent })
  }

  setAllVisible() {
    this.each(function(model) {
      model.set('visible', true)
    })
    this.sort()
  }

  strategies = {
    // Name from A to Z
    // +!true == +false == 0
    // +!false == +true == 1
    // +!!0 == +false = 0
    // +!!53 == +true = 1 // Everything above 0.
    // Visible models and models with a count > 0 get preference over name.
    alpha_asc: function(model) {
      return +(!model.get('visible')) + (+(!model.get('count')) + model.get('name'));
    },
    // Name from Z to A
    // Visible models and models with a count > 0 get preference over name.
    alpha_desc: function(model) {
      var str;
      // http://stackoverflow.com/questions/5636812/sorting-strings-in-reverse-order-with-backbone-js/5639070#5639070
      str = String.fromCharCode.apply(String, _.map(model.get('name').split(''), function(c) {
        return 0xffff - c.charCodeAt();
      }));
      return +(!model.get('visible')) + (+(!model.get('count')) + str);
    },
    // Count from low to high
    amount_asc: function(model) {
      var cnt, tmp;
      tmp = model.get('visible') ? 0 : 10;
      tmp += +(!model.get('count'));
      cnt = model.get('count') === 0 ? model.get('total') : model.get('count');
      return tmp -= 1 / cnt;
    },
    // Count from high to low (default)
    amount_desc: function(model) {
      var cnt, tmp;
      tmp = model.get('visible') ? 0 : 10;
      tmp += +(!model.get('count'));
      cnt = model.get('count') === 0 ? model.get('total') : model.get('count');
      return tmp += 1 / cnt;
    }
  }
}

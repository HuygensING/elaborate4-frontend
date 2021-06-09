const hasProp = {}.hasOwnProperty;

import _  from "underscore";

import $  from "jquery";

import { Fn }  from "../utils/general";

// A validate function for validating the whole model. The function is added to every model instance we're listening to.
const validate = function(attrs, options) {
  var attr, flatAttrs, invalids, invalidsPart, ref, settings;
  invalids = [];
  // Flatten attributes, because nested attributes must also be targeted by a string (<input name="namespace.level.level2"> for namespace: {level: {level2: 'some value'}})
  flatAttrs = Fn.flattenObject(attrs);
  ref = this.validation;
  for (attr in ref) {
    if (!hasProp.call(ref, attr)) continue;
    settings = ref[attr];
    invalidsPart = this.validateAttr(attr, flatAttrs[attr], attrs);
    if (invalidsPart != null) {
      // If invalidsPart is filled (ie it is not undefined), union it with invalids.
      // The union function is a little overhead to keep it DRY.
      invalids = _.union(invalids, invalidsPart);
    }
  }
  if (invalids.length > 0) {
    // Return invalids array if populated, otherwise return nothing (and Backbone can continue with setting the model)
    return invalids;
  }
};

// A validate function for validating one attribute. The function is added to every model instance we're listening to.
const validateAttr = function(attr, value, attrs) {
  var invalids, msg, ref, setting, settingValue;
  if (this.validation == null) {
    return;
  }
  invalids = [];
  ref = this.validation[attr];
  for (setting in ref) {
    if (!hasProp.call(ref, setting)) continue;
    settingValue = ref[setting];
    msg = validators[setting](settingValue, value, attr, attrs);
    // If a message is returned, add the required object to the invalids array
    if (msg != null) {
      invalids.push({
        attr: attr,
        msg: msg
      });
    }
  }
  if (invalids.length > 0) {
    // Return invalids array if populated, otherwise return nothing (and Backbone can continue with setting the model)
    return invalids;
  }
};

const validators = {
  pattern: function(settingValue, attrValue) {
    switch (settingValue) {
      case 'number':
        if (attrValue.length > 0 && !/^\d+$/.test(attrValue)) {
          return 'Please enter a valid number.';
        }
        break;
      case 'slug':
        if (attrValue.length > 0 && !/^[a-z][a-z0-9-]+$/.test(attrValue)) {
          return "A slug has to start with a letter and can only contain lower case letters, digits and dashes.";
        }
        break;
      case 'email':
        if (attrValue.length > 0 && !/^(.+)@(.+)(\.((.){2,6}))+$/.test(attrValue)) {
          return 'Please enter a valid email address.';
        }
    }
  },
  equal: function(settingValue, attrValue, attr, attrs) {
    if ((attrs != null) && attrValue !== attrs[settingValue]) {
      return `${settingValue} and ${attr} should be equal.`;
    }
  },
  required: function(settingValue, attrValue) {
    if (settingValue && attrValue.length === 0) {
      return "Required field, please enter a value.";
    }
  },
  'min-length': function(settingValue, attrValue) {
    var ref;
    if ((0 < (ref = attrValue.length) && ref < settingValue)) {
      return `Length should be ${settingValue} at least.`;
    }
  },
  'max-length': function(settingValue, attrValue) {
    if (attrValue.length > settingValue) {
      return `Length should be ${settingValue} at most.`;
    }
  }
};

export default {
  validatorInit: function() {
    var listenToObject;
    // Are we listening to a model or a collection?
    // Add the validate function to (all) the model(s)
    if (this.model != null) {
      listenToObject = this.model;
      this.model.validate = validate;
      this.model.validateAttr = validateAttr;
    } else if (this.collection != null) {
      listenToObject = this.collection;
      this.collection.each((model) => {
        model.validate = validate;
        return model.validateAttr = validateAttr;
      });
      // Add validate function to models which are added dynamically
      this.listenTo(this.collection, 'add', (model, collection, options) => {
        return model.validate = validate;
      });
    } else {
      console.error("Validator mixin: no model or collection attached to view!");
      return;
    }
    return this.validatorAddListeners(listenToObject);
  },
  validatorAddListeners: function(listenToObject) {
    // TODO if the listenToObject is a collection, does this work correct?
    this.listenTo(listenToObject, 'invalid', (model, errors, options) => {
      var error, i, len, results;
      results = [];
      for (i = 0, len = errors.length; i < len; i++) {
        error = errors[i];
        results.push(this.validatorAddError(model, error));
      }
      return results;
    });
    this.listenTo(listenToObject, 'change', this.validatorCheckErrors);
    return this.listenTo(listenToObject, 'invalid', function(model, errors, options) {
      var div, error, i, len, results;
      this.$('button[name="submit"]').removeClass('loader').addClass('disabled');
      this.$('div.error').remove();
      results = [];
      for (i = 0, len = errors.length; i < len; i++) {
        error = errors[i];
        div = $('<div class="error" />').html(error.msg);
        results.push(this.$(`[name=\"${error.attr}\"]`).after(div));
      }
      return results;
    });
  },
  validatorCheckErrors: function(model, options) {
    var attr, error, errors, ref, results, value;
    model = this.model != null ? this.model : this.getModel();
    this.$('button[name="submit"]').removeClass('disabled');
    ref = model.changedAttributes();
    results = [];
    for (attr in ref) {
      value = ref[attr];
      if (errors = model.validateAttr(attr, value)) {
        results.push((function() {
          var i, len, results1;
          results1 = [];
          for (i = 0, len = errors.length; i < len; i++) {
            error = errors[i];
            results1.push(this.validatorAddError(model.cid, error));
          }
          return results1;
        }).call(this));
      } else {
        results.push(this.validatorRemoveError(model.cid, attr));
      }
    }
    return results;
  },
  validatorAddError: function(cid, error) {
    var form;
    form = this.$(`[data-model-id=\"${cid}\"]`);
    form.find(`[name=\"${error.attr}\"]`).addClass('invalid').attr('title', error.msg);
    return form.find(`label[for=\"${error.attr}\"]`).addClass('invalid').attr('title', error.msg);
  },
  validatorRemoveError: function(cid, attr) {
    var form, input;
    form = this.$(`[data-model-id=\"${cid}\"]`);
    // Label
    form.find(`label[for=\"${attr}\"]`).removeClass('invalid').attr('title', '');
    
    // Input
    input = form.find(`[name=\"${attr}\"]`);
    input.removeClass('invalid').attr('title', '');
    // Div.error
    return input.siblings('.error').remove();
  }
};

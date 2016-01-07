(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
var Backbone, Base, Pubsub, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

Pubsub = require('../mixins/pubsub');

Base = (function(_super) {
  __extends(Base, _super);

  function Base() {
    return Base.__super__.constructor.apply(this, arguments);
  }

  Base.prototype.initialize = function() {
    return _.extend(this, Pubsub);
  };

  Base.prototype.removeById = function(id) {
    var model;
    model = this.get(id);
    return this.remove(model);
  };

  Base.prototype.has = function(model) {
    if (this.get(model.cid) != null) {
      return true;
    } else {
      return false;
    }
  };

  return Base;

})(Backbone.Collection);

module.exports = Base;


},{"../mixins/pubsub":14}],3:[function(require,module,exports){
var $, defaultOptions, token;

$ = require('jquery');

token = require('./token');

defaultOptions = {
  token: true
};

module.exports = {
  get: function(args, options) {
    if (options == null) {
      options = {};
    }
    return this.fire('get', args, options);
  },
  post: function(args, options) {
    if (options == null) {
      options = {};
    }
    return this.fire('post', args, options);
  },
  put: function(args, options) {
    if (options == null) {
      options = {};
    }
    return this.fire('put', args, options);
  },
  poll: function(args) {
    var done, dopoll, testFn, url;
    url = args.url, testFn = args.testFn, done = args.done;
    dopoll = (function(_this) {
      return function() {
        var xhr;
        xhr = _this.get({
          url: url
        });
        return xhr.done(function(data, textStatus, jqXHR) {
          if (testFn(data)) {
            return done(data, textStatus, jqXHR);
          } else {
            return setTimeout(dopoll, 5000);
          }
        });
      };
    })(this);
    return dopoll();
  },
  fire: function(type, args, options) {
    var ajaxArgs;
    options = $.extend({}, defaultOptions, options);
    ajaxArgs = {
      type: type,
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      processData: false,
      crossDomain: true
    };
    if (options.token && (token.get() != null)) {
      ajaxArgs.beforeSend = (function(_this) {
        return function(xhr) {
          return xhr.setRequestHeader('Authorization', "" + (token.getType()) + " " + (token.get()));
        };
      })(this);
    } else {
      ajaxArgs.beforeSend = (function(_this) {
        return function(xhr) {};
      })(this);
    }
    return $.ajax($.extend(ajaxArgs, args));
  }
};


},{"./token":7}],4:[function(require,module,exports){
var Async, Backbone, _;

Backbone = require('backbone');

_ = require('underscore');

Async = (function() {
  function Async(names) {
    var name, _i, _len;
    if (names == null) {
      names = [];
    }
    _.extend(this, Backbone.Events);
    this.callbacksCalled = {};
    for (_i = 0, _len = names.length; _i < _len; _i++) {
      name = names[_i];
      this.callbacksCalled[name] = false;
    }
  }

  Async.prototype.called = function(name, data) {
    if (data == null) {
      data = true;
    }
    this.callbacksCalled[name] = data;
    if (_.every(this.callbacksCalled, function(called) {
      return called !== false;
    })) {
      return this.trigger('ready', this.callbacksCalled);
    }
  };

  return Async;

})();

module.exports = Async;


},{}],5:[function(require,module,exports){
var History;

History = (function() {
  function History() {}

  History.prototype.history = [];

  History.prototype.update = function() {
    if (window.location.pathname !== '/login') {
      this.history.push(window.location.pathname);
    }
    return sessionStorage.setItem('history', JSON.stringify(this.history));
  };

  History.prototype.clear = function() {
    return sessionStorage.removeItem('history');
  };

  History.prototype.last = function() {
    return this.history[this.history.length - 1];
  };

  return History;

})();

module.exports = new History();


},{}],6:[function(require,module,exports){
var $, ModalManager;

$ = require('jquery');

ModalManager = (function() {
  function ModalManager() {
    this.modals = [];
  }

  ModalManager.prototype.add = function(modal) {
    var arrLength, m, _i, _len, _ref;
    _ref = this.modals;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      m = _ref[_i];
      m.$('.overlay').css('opacity', '0.2');
    }
    arrLength = this.modals.push(modal);
    modal.$('.overlay').css('z-index', 10000 + (arrLength * 2) - 1);
    modal.$('.modalbody').css('z-index', 10000 + (arrLength * 2));
    return $('body').prepend(modal.$el);
  };

  ModalManager.prototype.remove = function(modal) {
    var index;
    index = this.modals.indexOf(modal);
    this.modals.splice(index, 1);
    if (this.modals.length > 0) {
      this.modals[this.modals.length - 1].$('.overlay').css('opacity', '0.7');
    }
    modal.trigger('removed');
    modal.off();
    return modal.remove();
  };

  return ModalManager;

})();

module.exports = new ModalManager();


},{}],7:[function(require,module,exports){
var Token;

Token = (function() {
  function Token() {}

  Token.prototype.token = null;

  Token.prototype.set = function(token, type) {
    this.token = token;
    if (type == null) {
      type = 'SimpleAuth';
    }
    sessionStorage.setItem('huygens_token_type', type);
    return sessionStorage.setItem('huygens_token', this.token);
  };

  Token.prototype.getType = function() {
    return sessionStorage.getItem('huygens_token_type');
  };

  Token.prototype.get = function() {
    if (this.token == null) {
      this.token = sessionStorage.getItem('huygens_token');
    }
    return this.token;
  };

  Token.prototype.clear = function() {
    sessionStorage.removeItem('huygens_token');
    return sessionStorage.removeItem('huygens_token_type');
  };

  return Token;

})();

module.exports = new Token();


},{}],8:[function(require,module,exports){
var StringFn, ViewManager, cachedViews, currentView,
  __hasProp = {}.hasOwnProperty;

StringFn = require('../utils/string');

currentView = null;

cachedViews = {};

ViewManager = (function() {
  function ViewManager() {}

  ViewManager.prototype.clear = function() {
    var hashCode, view;
    for (hashCode in cachedViews) {
      if (!__hasProp.call(cachedViews, hashCode)) continue;
      view = cachedViews[hashCode];
      view.destroy();
    }
    return cachedViews = {};
  };

  ViewManager.prototype.show = function($el, View, options) {
    var el, viewHashCode;
    if (options == null) {
      options = {};
    }
    if (options.append == null) {
      options.append = false;
    }
    if (options.prepend == null) {
      options.prepend = false;
    }
    if (options.cache == null) {
      options.cache = true;
    }
    viewHashCode = StringFn.hashCode(View.toString() + JSON.stringify(options));
    if (!(cachedViews.hasOwnProperty(viewHashCode) && options.cache)) {
      cachedViews[viewHashCode] = new View(options);
    }
    currentView = cachedViews[viewHashCode];
    el = $el[0];
    if (!(options.append || options.prepend)) {
      el.innerHTML = '';
    }
    if (options.prepend && (el.firstChild != null)) {
      el.insertBefore(currentView.el, el.firstChild);
    } else {
      el.appendChild(currentView.el);
    }
    return currentView;
  };

  return ViewManager;

})();

module.exports = new ViewManager();


},{"../utils/string":19}],9:[function(require,module,exports){
var $, Backbone, Fn, mainTpl, optionMixin, _;

Backbone = require('backbone');

_ = require('underscore');

$ = require('jquery');

Fn = require('../../utils/general');

optionMixin = require('./options');

mainTpl = require('./main.jade');

module.exports = {
  dropdownInitialize: function() {
    var models, _base, _base1, _base2, _base3, _ref, _ref1;
    if ((_base = this.options).config == null) {
      _base.config = {};
    }
    this.data = (_ref = this.options.config.data) != null ? _ref : {};
    this.settings = (_ref1 = this.options.config.settings) != null ? _ref1 : {};
    if ((_base1 = this.settings).mutable == null) {
      _base1.mutable = false;
    }
    if ((_base2 = this.settings).editable == null) {
      _base2.editable = false;
    }
    if ((_base3 = this.settings).defaultAdd == null) {
      _base3.defaultAdd = true;
    }
    this.selected = null;
    if (this.data instanceof Backbone.Collection) {
      this.collection = this.data;
    } else if (_.isArray(this.data) && _.isString(this.data[0])) {
      models = this.strArray2optionArray(this.data);
      this.collection = new Backbone.Collection(models);
    } else {
      console.error('No valid data passed to dropdown');
    }
    this.filtered_options = this.collection.clone();
    _.extend(this.filtered_options, optionMixin);
    if (this.settings.mutable) {
      this.listenTo(this.collection, 'add', (function(_this) {
        return function(model, collection, options) {
          _this.selected = model;
          return _this.triggerChange();
        };
      })(this));
    }
    this.listenTo(this.collection, 'add', (function(_this) {
      return function(model, collection, options) {
        _this.trigger('change:data', _this.collection.models);
        return _this.filtered_options.add(model);
      };
    })(this));
    this.listenTo(this.filtered_options, 'add', this.renderOptions);
    this.listenTo(this.filtered_options, 'reset', this.renderOptions);
    this.listenTo(this.filtered_options, 'currentOption:change', (function(_this) {
      return function(model) {
        return _this.$('li[data-id="' + model.id + '"]').addClass('active');
      };
    })(this));
    this.on('change', (function(_this) {
      return function() {
        return _this.resetOptions();
      };
    })(this));
    return this.delegateEvents();
  },
  dropdownRender: function(tpl) {
    var rtpl;
    if (this.preDropdownRender != null) {
      this.preDropdownRender();
    }
    rtpl = tpl({
      viewId: this.cid,
      selected: this.selected,
      settings: this.settings
    });
    this.$el.html(rtpl);
    this.$optionlist = this.$('ul.list');
    this.renderOptions();
    this.$('input').focus();
    $('body').click((function(_this) {
      return function(ev) {
        if (!(_this.el === ev.target || Fn.isDescendant(_this.el, ev.target))) {
          return _this.hideOptionlist();
        }
      };
    })(this));
    if (this.settings.inputClass != null) {
      this.$('input').addClass(this.settings.inputClass);
    }
    if (this.postDropdownRender != null) {
      this.postDropdownRender();
    }
    return this;
  },
  renderOptions: function() {
    var rtpl;
    rtpl = mainTpl({
      collection: this.filtered_options,
      selected: this.selected
    });
    return this.$optionlist.html(rtpl);
  },
  dropdownEvents: function(cid) {
    var evs;
    evs = {
      'click .caret': 'toggleList',
      'click li.list': 'addSelected'
    };
    evs['keyup input[data-view-id="' + cid + '"]'] = 'onKeyup';
    evs['keydown input[data-view-id="' + cid + '"]'] = 'onKeydown';
    return evs;
  },
  toggleList: function(ev) {
    this.$optionlist.toggle();
    return this.$('input').focus();
  },
  onKeydown: function(ev) {
    if (ev.keyCode === 38 && this.$optionlist.is(':visible')) {
      return ev.preventDefault();
    }
  },
  onKeyup: function(ev) {
    this.$('.active').removeClass('active');
    if (ev.keyCode === 38) {
      this.$optionlist.show();
      return this.filtered_options.prev();
    } else if (ev.keyCode === 40) {
      this.$optionlist.show();
      return this.filtered_options.next();
    } else if (ev.keyCode === 13) {
      return this.addSelected(ev);
    } else if (ev.keyCode === 27) {
      return this.$optionlist.hide();
    } else {
      return this.filter(ev.currentTarget.value);
    }
  },
  destroy: function() {
    $('body').off('click');
    return this.remove();
  },
  resetOptions: function() {
    this.filtered_options.reset(this.collection.reject((function(_this) {
      return function(model) {
        return _this.selected.get(model.id) != null;
      };
    })(this)));
    this.filtered_options.resetCurrentOption();
    return this.hideOptionlist();
  },
  hideOptionlist: function() {
    return this.$optionlist.hide();
  },
  filter: function(value) {
    var models, re;
    if (this.settings.editable) {
      this.$('button.edit').removeClass('visible');
    }
    this.resetOptions();
    if (value.length > 1) {
      value = Fn.escapeRegExp(value);
      re = new RegExp(value, 'i');
      models = this.collection.filter(function(model) {
        return re.test(model.get('title'));
      });
      if (models.length > 0) {
        this.filtered_options.reset(models);
        this.$optionlist.show();
      }
    }
    if (this.postDropdownFilter != null) {
      return this.postDropdownFilter(models);
    }
  },
  strArray2optionArray: function(strArray) {
    return _.map(strArray, function(item) {
      return {
        id: item,
        title: item
      };
    });
  }
};


},{"../../utils/general":17,"./main.jade":10,"./options":11}],10:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (collection, selected, undefined) {
// iterate collection.models
;(function(){
  var $$obj = collection.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + (jade.cls(['list',selected===model?'active':''], [null,true])) + ">" + (jade.escape(null == (jade_interp = model.get('title')) ? "" : jade_interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + (jade.cls(['list',selected===model?'active':''], [null,true])) + ">" + (jade.escape(null == (jade_interp = model.get('title')) ? "" : jade_interp)) + "</li>");
    }

  }
}).call(this);
}.call(this,"collection" in locals_for_with?locals_for_with.collection:typeof collection!=="undefined"?collection:undefined,"selected" in locals_for_with?locals_for_with.selected:typeof selected!=="undefined"?selected:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":36}],11:[function(require,module,exports){
module.exports = {
  dropdownOptionsInitialize: function() {
    return this.resetCurrentOption();
  },
  resetCurrentOption: function() {
    return this.currentOption = null;
  },
  setCurrentOption: function(model) {
    this.currentOption = model;
    return this.trigger('currentOption:change', this.currentOption);
  },
  prev: function() {
    var previousIndex;
    previousIndex = this.indexOf(this.currentOption) - 1;
    if (previousIndex < 0) {
      previousIndex = this.length - 1;
    }
    return this.setCurrentOption(this.at(previousIndex));
  },
  next: function() {
    var nextIndex;
    nextIndex = this.indexOf(this.currentOption) + 1;
    if (nextIndex > (this.length - 1)) {
      nextIndex = 0;
    }
    return this.setCurrentOption(this.at(nextIndex));
  }
};


},{}],12:[function(require,module,exports){
module.exports = function(attrs) {
  return {
    changedSinceLastSave: null,
    initChangedSinceLastSave: function() {
      var attr, _i, _len, _results;
      this.on('sync', (function(_this) {
        return function() {
          return _this.changedSinceLastSave = null;
        };
      })(this));
      _results = [];
      for (_i = 0, _len = attrs.length; _i < _len; _i++) {
        attr = attrs[_i];
        _results.push(this.on("change:" + attr, (function(_this) {
          return function(model, options) {
            if (_this.changedSinceLastSave == null) {
              return _this.changedSinceLastSave = model.previousAttributes()[attr];
            }
          };
        })(this)));
      }
      return _results;
    },
    cancelChanges: function() {
      var attr, _i, _len;
      for (_i = 0, _len = attrs.length; _i < _len; _i++) {
        attr = attrs[_i];
        this.set(attr, this.changedSinceLastSave);
      }
      return this.changedSinceLastSave = null;
    }
  };
};


},{}],13:[function(require,module,exports){
var ajax, token;

ajax = require('../managers/ajax');

token = require('../managers/token');

module.exports = {
  syncOverride: function(method, model, options) {
    var data, defaults, jqXHR, name, obj, _i, _len, _ref;
    if (options.attributes != null) {
      obj = {};
      _ref = options.attributes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        name = _ref[_i];
        obj[name] = this.get(name);
      }
      data = JSON.stringify(obj);
    } else {
      data = JSON.stringify(model.toJSON());
    }
    defaults = {
      url: this.url(),
      dataType: 'text',
      data: data
    };
    options = $.extend(defaults, options);
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post(options);
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var xhr;
          if (jqXHR.status === 201) {
            xhr = ajax.get({
              url: jqXHR.getResponseHeader('Location')
            });
            return xhr.done(function(data, textStatus, jqXHR) {
              _this.trigger('sync');
              return options.success(data);
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          return console.log('fail', response);
        };
      })(this));
    } else if (method === 'update') {
      ajax.token = token.get();
      jqXHR = ajax.put(options);
      jqXHR.done((function(_this) {
        return function(response) {
          return _this.trigger('sync');
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          return console.log('fail', response);
        };
      })(this));
    }
  }
};


},{"../managers/ajax":3,"../managers/token":7}],14:[function(require,module,exports){
var Backbone;

Backbone = require('backbone');

module.exports = {
  subscribe: function(ev, done) {
    return this.listenTo(Backbone, ev, done);
  },
  publish: function() {
    return Backbone.trigger.apply(Backbone, arguments);
  }
};


},{}],15:[function(require,module,exports){
var $, Fn, validate, validateAttr, validators, _,
  __hasProp = {}.hasOwnProperty;

_ = require('underscore');

$ = require('jquery');

Fn = require('../utils/general');

validate = function(attrs, options) {
  var attr, flatAttrs, invalids, invalidsPart, settings, _ref;
  invalids = [];
  flatAttrs = Fn.flattenObject(attrs);
  _ref = this.validation;
  for (attr in _ref) {
    if (!__hasProp.call(_ref, attr)) continue;
    settings = _ref[attr];
    invalidsPart = this.validateAttr(attr, flatAttrs[attr], attrs);
    if (invalidsPart != null) {
      invalids = _.union(invalids, invalidsPart);
    }
  }
  if (invalids.length > 0) {
    return invalids;
  }
};

validateAttr = function(attr, value, attrs) {
  var invalids, msg, setting, settingValue, _ref;
  if (this.validation == null) {
    return;
  }
  invalids = [];
  _ref = this.validation[attr];
  for (setting in _ref) {
    if (!__hasProp.call(_ref, setting)) continue;
    settingValue = _ref[setting];
    msg = validators[setting](settingValue, value, attr, attrs);
    if (msg != null) {
      invalids.push({
        attr: attr,
        msg: msg
      });
    }
  }
  if (invalids.length > 0) {
    return invalids;
  }
};

validators = {
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
      return "" + settingValue + " and " + attr + " should be equal.";
    }
  },
  required: function(settingValue, attrValue) {
    if (settingValue && attrValue.length === 0) {
      return "Required field, please enter a value.";
    }
  },
  'min-length': function(settingValue, attrValue) {
    var _ref;
    if ((0 < (_ref = attrValue.length) && _ref < settingValue)) {
      return "Length should be " + settingValue + " at least.";
    }
  },
  'max-length': function(settingValue, attrValue) {
    if (attrValue.length > settingValue) {
      return "Length should be " + settingValue + " at most.";
    }
  }
};

module.exports = {
  validatorInit: function() {
    var listenToObject;
    if (this.model != null) {
      listenToObject = this.model;
      this.model.validate = validate;
      this.model.validateAttr = validateAttr;
    } else if (this.collection != null) {
      listenToObject = this.collection;
      this.collection.each((function(_this) {
        return function(model) {
          model.validate = validate;
          return model.validateAttr = validateAttr;
        };
      })(this));
      this.listenTo(this.collection, 'add', (function(_this) {
        return function(model, collection, options) {
          return model.validate = validate;
        };
      })(this));
    } else {
      console.error("Validator mixin: no model or collection attached to view!");
      return;
    }
    return this.validatorAddListeners(listenToObject);
  },
  validatorAddListeners: function(listenToObject) {
    this.listenTo(listenToObject, 'invalid', (function(_this) {
      return function(model, errors, options) {
        var error, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = errors.length; _i < _len; _i++) {
          error = errors[_i];
          _results.push(_this.validatorAddError(model, error));
        }
        return _results;
      };
    })(this));
    this.listenTo(listenToObject, 'change', this.validatorCheckErrors);
    return this.listenTo(listenToObject, 'invalid', function(model, errors, options) {
      var div, error, _i, _len, _results;
      this.$('button[name="submit"]').removeClass('loader').addClass('disabled');
      this.$('div.error').remove();
      _results = [];
      for (_i = 0, _len = errors.length; _i < _len; _i++) {
        error = errors[_i];
        div = $('<div class="error" />').html(error.msg);
        _results.push(this.$("[name=\"" + error.attr + "\"]").after(div));
      }
      return _results;
    });
  },
  validatorCheckErrors: function(model, options) {
    var attr, error, errors, value, _ref, _results;
    model = this.model != null ? this.model : this.getModel(ev);
    this.$('button[name="submit"]').removeClass('disabled');
    _ref = model.changedAttributes();
    _results = [];
    for (attr in _ref) {
      value = _ref[attr];
      if (errors = model.validateAttr(attr, value)) {
        _results.push((function() {
          var _i, _len, _results1;
          _results1 = [];
          for (_i = 0, _len = errors.length; _i < _len; _i++) {
            error = errors[_i];
            _results1.push(this.validatorAddError(model.cid, error));
          }
          return _results1;
        }).call(this));
      } else {
        _results.push(this.validatorRemoveError(model.cid, attr));
      }
    }
    return _results;
  },
  validatorAddError: function(cid, error) {
    var form;
    form = this.$("[data-model-id=\"" + cid + "\"]");
    form.find("[name=\"" + error.attr + "\"]").addClass('invalid').attr('title', error.msg);
    return form.find("label[for=\"" + error.attr + "\"]").addClass('invalid').attr('title', error.msg);
  },
  validatorRemoveError: function(cid, attr) {
    var form, input;
    form = this.$("[data-model-id=\"" + cid + "\"]");
    form.find("label[for=\"" + attr + "\"]").removeClass('invalid').attr('title', '');
    input = form.find("[name=\"" + attr + "\"]");
    input.removeClass('invalid').attr('title', '');
    return input.siblings('.error').remove();
  }
};


},{"../utils/general":17}],16:[function(require,module,exports){
var DOM, _;

_ = require('underscore');

DOM = function(el) {
  if (_.isString(el)) {
    el = document.querySelector(el);
  }
  return {
    el: el,
    q: function(query) {
      return DOM(query);
    },
    find: function(query) {
      return DOM(query);
    },
    findAll: function(query) {
      return DOM(el.querySelectorAll(query));
    },
    html: function(html) {
      if (html == null) {
        return el.innerHTML;
      }
      if (html.nodeType === 1 || html.nodeType === 11) {
        el.innerHTML = '';
        return el.appendChild(html);
      } else {
        return el.innerHTML = html;
      }
    },
    hide: function() {
      el.style.display = 'none';
      return this;
    },
    show: function(displayType) {
      if (displayType == null) {
        displayType = 'block';
      }
      el.style.display = displayType;
      return this;
    },
    toggle: function(displayType, show) {
      var dt;
      if (displayType == null) {
        displayType = 'block';
      }
      dt = el.style.display === displayType ? 'none' : displayType;
      if (show != null) {
        dt = show ? displayType : 'none';
      }
      el.style.display = dt;
      return this;
    },
    closest: function(selector) {
      var matchesSelector;
      matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
      while (el) {
        if (matchesSelector.bind(el)(selector)) {
          return el;
        } else {
          el = el.parentNode;
        }
      }
    },
    append: function(childEl) {
      return el.appendChild(childEl);
    },
    prepend: function(childEl) {
      return el.insertBefore(childEl, el.firstChild);
    },

    /*
    	Native alternative to jQuery's $.offset()
    
    	http://www.quirksmode.org/js/findpos.html
     */
    position: function(parent) {
      var left, loopEl, top;
      if (parent == null) {
        parent = document.body;
      }
      left = 0;
      top = 0;
      loopEl = el;
      while ((loopEl != null) && loopEl !== parent) {
        if (this.hasDescendant(parent)) {
          break;
        }
        left += loopEl.offsetLeft;
        top += loopEl.offsetTop;
        loopEl = loopEl.offsetParent;
      }
      return {
        left: left,
        top: top
      };
    },

    /*
    	Is child el a descendant of parent el?
    
    	http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
     */
    hasDescendant: function(child) {
      var node;
      node = child.parentNode;
      while (node != null) {
        if (node === el) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    },
    boundingBox: function() {
      var box;
      box = this.position();
      box.width = el.clientWidth;
      box.height = el.clientHeight;
      box.right = box.left + box.width;
      box.bottom = box.top + box.height;
      return box;
    },
    insertAfter: function(referenceElement) {
      return referenceElement.parentNode.insertBefore(el, referenceElement.nextSibling);
    },
    highlightUntil: function(endNode, options) {
      if (options == null) {
        options = {};
      }
      if (options.highlightClass == null) {
        options.highlightClass = 'highlight';
      }
      if (options.tagName == null) {
        options.tagName = 'span';
      }
      return {
        on: function() {
          var filter, newNode, range, range2, treewalker;
          range = document.createRange();
          range.setStartAfter(el);
          range.setEndBefore(endNode);
          filter = (function(_this) {
            return function(node) {
              var end, r, start;
              r = document.createRange();
              r.selectNode(node);
              start = r.compareBoundaryPoints(Range.START_TO_START, range);
              end = r.compareBoundaryPoints(Range.END_TO_START, range);
              if (start === -1 || end === 1) {
                return NodeFilter.FILTER_SKIP;
              } else {
                return NodeFilter.FILTER_ACCEPT;
              }
            };
          })(this);
          filter.acceptNode = filter;
          treewalker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, filter, false);
          while (treewalker.nextNode()) {
            range2 = new Range();
            range2.selectNode(treewalker.currentNode);
            newNode = document.createElement(options.tagName);
            newNode.className = options.highlightClass;
            range2.surroundContents(newNode);
          }
          return this;
        },
        off: function() {
          var _i, _len, _ref, _results;
          _ref = document.querySelectorAll('.' + options.highlightClass);
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            el = _ref[_i];
            el.parentElement.insertBefore(el.firstChild, el);
            _results.push(el.parentElement.removeChild(el));
          }
          return _results;
        }
      };
    },
    hasClass: function(name) {
      return (' ' + el.className + ' ').indexOf(' ' + name + ' ') > -1;
    },
    addClass: function(name) {
      if (!this.hasClass(name)) {
        return el.className += ' ' + name;
      }
    },
    removeClass: function(name) {
      var names;
      names = ' ' + el.className + ' ';
      names = names.replace(' ' + name + ' ', '');
      return el.className = names.replace(/^\s+|\s+$/g, '');
    },
    toggleClass: function(name) {
      if (this.hasClass(name)) {
        return this.addClass(name);
      } else {
        return this.removeClass(name);
      }
    },
    inViewport: function(parent) {
      var doc, rect, win;
      win = parent != null ? parent : window;
      doc = parent != null ? parent : document.documentElement;
      rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (win.innerHeight || doc.clientHeight) && rect.right <= (win.innerWidth || doc.clientWidth);
    },
    createTreeWalker: function(endNode, nodeFilterConstant) {
      var filter, range;
      if (nodeFilterConstant == null) {
        nodeFilterConstant = NodeFilter.SHOW_ELEMENT;
      }
      range = document.createRange();
      range.setStartAfter(el);
      range.setEndBefore(endNode);
      filter = (function(_this) {
        return function(node) {
          var end, r, start;
          r = document.createRange();
          r.selectNode(node);
          start = r.compareBoundaryPoints(Range.START_TO_START, range);
          end = r.compareBoundaryPoints(Range.END_TO_START, range);
          if (start === -1 || end === 1) {
            return NodeFilter.FILTER_SKIP;
          } else {
            return NodeFilter.FILTER_ACCEPT;
          }
        };
      })(this);
      filter.acceptNode = filter;
      return document.createTreeWalker(range.commonAncestorContainer, nodeFilterConstant, filter, false);
    }
  };
};

module.exports = DOM;


},{}],17:[function(require,module,exports){
var $, _,
  __hasProp = {}.hasOwnProperty;

$ = require('jquery');

_ = require('underscore');

module.exports = {
  closest: function(el, selector) {
    var matchesSelector;
    matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
    while (el) {
      if (matchesSelector.bind(el)(selector)) {
        return el;
      } else {
        el = el.parentNode;
      }
    }
  },

  /*
  	Generates an ID that starts with a letter
  	
  	Example: "aBc12D34"
  
  	param Number length of the id
  	return String
   */
  generateID: function(length) {
    var chars, text;
    length = (length != null) && length > 0 ? length - 1 : 7;
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    text = chars.charAt(Math.floor(Math.random() * 52));
    while (length--) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  },

  /*
  	Deepcopies arrays and object literals
  	
  	return Array or object
   */
  deepCopy: function(object) {
    var newEmpty;
    newEmpty = Array.isArray(object) ? [] : {};
    return $.extend(true, newEmpty, object);
  },
  timeoutWithReset: (function() {
    var timer;
    timer = null;
    return function(ms, cb, onResetFn) {
      if (timer != null) {
        if (onResetFn != null) {
          onResetFn();
        }
        clearTimeout(timer);
      }
      return timer = setTimeout((function() {
        timer = null;
        return cb();
      }), ms);
    };
  })(),

  /*
  	Highlight text between two nodes. 
  
  	Creates a span.hilite between two given nodes, surrounding the contents of the nodes
  
  	Example usage:
  	hl = Fn.highlighter
  		className: 'highlight' # optional
  		tagName: 'div' # optional
  
  	supEnter = (ev) -> hl.on
  		startNode: el.querySelector(#someid) # required
  		endNode: ev.currentTarget # required
  	supLeave = -> hl.off()
  	$(sup).hover supEnter, supLeave
   */
  highlighter: function(args) {
    var className, el, tagName;
    if (args == null) {
      args = {};
    }
    className = args.className, tagName = args.tagName;
    if (className == null) {
      className = 'hilite';
    }
    if (tagName == null) {
      tagName = 'span';
    }
    el = null;
    return {
      on: function(args) {
        var endNode, range, startNode;
        startNode = args.startNode, endNode = args.endNode;
        range = document.createRange();
        range.setStartAfter(startNode);
        range.setEndBefore(endNode);
        el = document.createElement(tagName);
        el.className = className;
        el.appendChild(range.extractContents());
        return range.insertNode(el);
      },
      off: function() {
        return $(el).replaceWith(function() {
          return $(this).contents();
        });
      }
    };
  },

  /*
  	Native alternative to jQuery's $.offset()
  
  	http://www.quirksmode.org/js/findpos.html
   */
  position: function(el, parent) {
    var left, top;
    left = 0;
    top = 0;
    while (el !== parent) {
      left += el.offsetLeft;
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return {
      left: left,
      top: top
    };
  },
  boundingBox: function(el) {
    var box;
    box = $(el).offset();
    box.width = el.clientWidth;
    box.height = el.clientHeight;
    box.right = box.left + box.width;
    box.bottom = box.top + box.height;
    return box;
  },

  /*
  	Is child el a descendant of parent el?
  
  	http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
   */
  isDescendant: function(parent, child) {
    var node;
    node = child.parentNode;
    while (node != null) {
      if (node === parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  },

  /*
  	Removes an item from an array
   */
  removeFromArray: function(arr, item) {
    var index;
    index = arr.indexOf(item);
    arr.splice(index, 1);
    return arr;
  },

  /* Escape a regular expression */
  escapeRegExp: function(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  },

  /*
  	Flattens an object
  
  	songs:
  		mary:
  			had:
  				little: 'lamb'
  
  	becomes
  
  	songs:
  		mary.had.little: 'lamb'
  
  	Taken from: http://thedersen.com/projects/backbone-validation
   */
  flattenObject: function(obj, into, prefix) {
    var k, v;
    if (into == null) {
      into = {};
    }
    if (prefix == null) {
      prefix = '';
    }
    for (k in obj) {
      if (!__hasProp.call(obj, k)) continue;
      v = obj[k];
      if (_.isObject(v) && !_.isArray(v) && !_.isFunction(v) && !(v instanceof Backbone.Model) && !(v instanceof Backbone.Collection)) {
        this.flattenObject(v, into, prefix + k + '.');
      } else {
        into[prefix + k] = v;
      }
    }
    return into;
  },
  compareJSON: function(current, changed) {
    var attr, changes, value;
    changes = {};
    for (attr in current) {
      if (!__hasProp.call(current, attr)) continue;
      value = current[attr];
      if (!changed.hasOwnProperty(attr)) {
        changes[attr] = 'removed';
      }
    }
    for (attr in changed) {
      if (!__hasProp.call(changed, attr)) continue;
      value = changed[attr];
      if (current.hasOwnProperty(attr)) {
        if (_.isArray(value) || this.isObjectLiteral(value)) {
          if (!_.isEqual(current[attr], changed[attr])) {
            changes[attr] = changed[attr];
          }
        } else {
          if (current[attr] !== changed[attr]) {
            changes[attr] = changed[attr];
          }
        }
      } else {
        changes[attr] = 'added';
      }
    }
    return changes;
  },
  isObjectLiteral: function(obj) {
    var ObjProto;
    if ((obj == null) || typeof obj !== "object") {
      return false;
    }
    ObjProto = obj;
    while (Object.getPrototypeOf(ObjProto = Object.getPrototypeOf(ObjProto)) !== null) {
      0;
    }
    return Object.getPrototypeOf(obj) === ObjProto;
  },
  getScrollPercentage: function(el) {
    var left, scrolledLeft, scrolledTop, top, totalLeft, totalTop;
    scrolledTop = el.scrollTop;
    totalTop = el.scrollHeight - el.clientHeight;
    scrolledLeft = el.scrollLeft;
    totalLeft = el.scrollWidth - el.clientWidth;
    top = totalTop === 0 ? 0 : Math.floor((scrolledTop / totalTop) * 100);
    left = totalLeft === 0 ? 0 : Math.floor((scrolledLeft / totalLeft) * 100);
    return {
      top: top,
      left: left
    };
  },
  setScrollPercentage: function(el, percentages) {
    if (percentages.top < 5) {
      percentages.top = 0;
    }
    if (percentages.top > 95) {
      percentages.top = 100;
    }
    el.scrollTop = (el.scrollHeight - el.clientHeight) * percentages.top / 100;
    return el.scrollLeft = (el.scrollWidth - el.clientWidth) * percentages.left / 100;
  },
  checkCheckboxes: function(selector, checked, baseEl) {
    var cb, checkboxes, _i, _len, _results;
    if (selector == null) {
      selector = 'input[type="checkbox"]';
    }
    if (checked == null) {
      checked = true;
    }
    if (baseEl == null) {
      baseEl = document;
    }
    checkboxes = baseEl.querySelectorAll(selector);
    _results = [];
    for (_i = 0, _len = checkboxes.length; _i < _len; _i++) {
      cb = checkboxes[_i];
      _results.push(cb.checked = checked);
    }
    return _results;
  },
  setCursorToEnd: function(textEl, windowEl) {
    var range, sel, win;
    win = windowEl != null ? windowEl : window;
    if (windowEl == null) {
      windowEl = textEl;
    }
    windowEl.focus();
    range = document.createRange();
    range.selectNodeContents(textEl);
    range.collapse(false);
    sel = win.getSelection();
    if (sel != null) {
      sel.removeAllRanges();
      return sel.addRange(range);
    }
  },
  arraySum: function(arr) {
    if (arr.length === 0) {
      return 0;
    }
    return arr.reduce(function(prev, current) {
      return current + prev;
    });
  },
  getAspectRatio: function(originalWidth, originalHeight, boxWidth, boxHeight) {
    var heightRatio, widthRatio;
    widthRatio = boxWidth / originalWidth;
    heightRatio = boxHeight / originalHeight;
    return Math.min(widthRatio, heightRatio);
  },
  hasScrollBar: function(el) {
    return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
  },
  hasXScrollBar: function(el) {
    return el.scrollWidth > el.clientWidth;
  },
  hasYScrollBar: function(el) {
    return el.scrollHeight > el.clientHeight;
  }
};


},{}],18:[function(require,module,exports){
var $;

$ = require('jquery');

(function(jQuery) {
  jQuery.expr[":"].contains = $.expr.createPseudo(function(arg) {
    return function(elem) {
      return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
  });
  jQuery.fn.scrollTo = function(newPos, args) {
    var defaults, extraOffset, options, scrollTop, top;
    defaults = {
      start: function() {},
      complete: function() {},
      duration: 500
    };
    options = $.extend(defaults, args);
    if (options.start) {
      options.start();
    }
    scrollTop = this.scrollTop();
    top = this.offset().top;
    extraOffset = 60;
    newPos = newPos + scrollTop - top - extraOffset;
    if (newPos !== scrollTop) {
      return this.animate({
        scrollTop: newPos
      }, options.duration, options.complete);
    } else {
      return options.complete();
    }
  };
  jQuery.fn.highlight = function(delay) {
    delay = delay || 3000;
    this.addClass('highlight');
    return setTimeout(((function(_this) {
      return function() {
        return _this.removeClass('highlight');
      };
    })(this)), delay);
  };

  /*
  	Render remove button in element
   */
  return jQuery.fn.appendCloseButton = function(args) {
    var $closeButton, close, corner, html;
    if (args == null) {
      args = {};
    }
    corner = args.corner, html = args.html, close = args.close;
    if (html == null) {
      html = '<img src="/images/icon.close.png">';
    }
    if (corner == null) {
      corner = 'topright';
    }
    $closeButton = $('<div class="closebutton">').html(html);
    $closeButton.css('position', 'absolute');
    $closeButton.css('opacity', '0.2');
    $closeButton.css('cursor', 'pointer');
    switch (corner) {
      case 'topright':
        $closeButton.css('right', '8px');
        $closeButton.css('top', '8px');
        break;
      case 'bottomright':
        $closeButton.css('right', '8px');
        $closeButton.css('bottom', '8px');
    }
    this.prepend($closeButton);
    $closeButton.hover((function(ev) {
      return $closeButton.css('opacity', 100);
    }), (function(ev) {
      return $closeButton.css('opacity', 0.2);
    }));
    return $closeButton.click((function(_this) {
      return function() {
        return close();
      };
    })(this));
  };
})($);


},{}],19:[function(require,module,exports){
var $;

$ = require('jquery');

module.exports = {
  ucfirst: function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /*
  	Slugify a string
   */
  slugify: function(str) {
    var from, index, strlen, to;
    from = "àáäâèéëêìíïîòóöôùúüûñç·/_:;";
    to = "aaaaeeeeiiiioooouuuunc-----";
    str = str.trim().toLowerCase();
    strlen = str.length;
    while (strlen--) {
      index = from.indexOf(str[strlen]);
      if (index !== -1) {
        str = str.substr(0, strlen) + to[index] + str.substr(strlen + 1);
      }
    }
    return str.replace(/[^a-z0-9 -]/g, '').replace(/\s+|\-+/g, '-').replace(/^\-+|\-+$/g, '');
  },

  /*
  	Strips the tags from a string
  	
  	Example: "This is a <b>string</b>." => "This is a string."
  	
  	return String
   */
  stripTags: function(str) {
    return $('<span />').html(str).text();
  },

  /*
  	Removes non numbers from a string
  	
  	Example: "Count the 12 monkeys." => "12"
  	
  	return String
   */
  onlyNumbers: function(str) {
    return str.replace(/[^\d.]/g, '');
  },
  hashCode: function(str) {
    var c, chr, hash, i, _i, _len;
    if (str.length === 0) {
      return false;
    }
    hash = 0;
    for (i = _i = 0, _len = str.length; _i < _len; i = ++_i) {
      chr = str[i];
      c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash;
    }
    return hash;
  },
  insertAt: function(str, needle, index) {
    return str.slice(0, index) + needle + str.slice(index);
  }
};


},{}],20:[function(require,module,exports){
var $, Backbone, BaseView, Pubsub, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

$ = require('jquery');

Backbone.$ = $;

_ = require('underscore');

Pubsub = require('../mixins/pubsub');

BaseView = (function(_super) {
  __extends(BaseView, _super);

  function BaseView() {
    return BaseView.__super__.constructor.apply(this, arguments);
  }

  BaseView.prototype.initialize = function() {
    _.extend(this, Pubsub);
    return this.subviews = {};
  };

  BaseView.prototype.destroy = function() {
    var name, subview, _ref;
    _ref = this.subviews;
    for (name in _ref) {
      subview = _ref[name];
      subview.destroy();
    }
    return this.remove();
  };

  return BaseView;

})(Backbone.View);

module.exports = BaseView;


},{"../mixins/pubsub":14}],21:[function(require,module,exports){
var Backbone, Collections, ComboList, Views, dom, dropdown, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

dom = require('../../../utils/dom');

Collections = {
  Base: require('../../../collections/base')
};

Views = {
  Base: require('../../base')
};

tpl = require('./main.jade');

dropdown = require('../../../mixins/dropdown/main');

ComboList = (function(_super) {
  __extends(ComboList, _super);

  function ComboList() {
    return ComboList.__super__.constructor.apply(this, arguments);
  }

  ComboList.prototype.className = 'combolist';

  ComboList.prototype.initialize = function(options) {
    var models, _base, _base1, _ref;
    this.options = options;
    ComboList.__super__.initialize.apply(this, arguments);
    if ((_base = this.options).config == null) {
      _base.config = {};
    }
    this.settings = (_ref = this.options.config.settings) != null ? _ref : {};
    if ((_base1 = this.settings).confirmRemove == null) {
      _base1.confirmRemove = false;
    }
    _.extend(this, dropdown);
    this.dropdownInitialize();
    if (this.options.value instanceof Backbone.Collection) {
      this.selected = this.options.value;
    } else if (_.isArray(this.options.value)) {
      models = this.strArray2optionArray(this.options.value);
      this.selected = new Collections.Base(models);
    } else {
      console.error('No valid value passed to combolist');
    }
    this.listenTo(this.selected, 'add', (function(_this) {
      return function(model) {
        _this.dropdownRender(tpl);
        return _this.triggerChange({
          added: model.id
        });
      };
    })(this));
    this.listenTo(this.selected, 'remove', (function(_this) {
      return function(model) {
        _this.dropdownRender(tpl);
        return _this.triggerChange({
          removed: model.id
        });
      };
    })(this));
    return this.dropdownRender(tpl);
  };

  ComboList.prototype.postDropdownRender = function() {
    return this.filtered_options.reset(this.collection.reject((function(_this) {
      return function(model) {
        return _this.selected.get(model.id) != null;
      };
    })(this)));
  };

  ComboList.prototype.events = function() {
    return _.extend(dropdown.dropdownEvents(this.cid), {
      'click li.selected span': 'removeSelected',
      'click button.add': 'createModel',
      'keyup input': 'toggleAddButton'
    });
  };

  ComboList.prototype.toggleAddButton = function(ev) {
    var button;
    if (!this.settings.mutable) {
      return;
    }
    button = dom(this.el).q('button');
    if (ev.currentTarget.value.length > 1 && ev.keyCode !== 13) {
      return button.show('inline-block');
    } else {
      return button.hide();
    }
  };

  ComboList.prototype.createModel = function(ev) {
    var value;
    value = this.el.querySelector('input').value;
    if (this.settings.mutable && value.length > 1) {
      return this.selected.add({
        id: value,
        title: value
      });
    }
  };

  ComboList.prototype.removeSelected = function(ev) {
    var listitemID, remove;
    listitemID = ev.currentTarget.parentNode.getAttribute('data-id');
    remove = (function(_this) {
      return function() {
        return _this.selected.removeById(listitemID);
      };
    })(this);
    if (this.settings.confirmRemove) {
      return this.trigger('confirmRemove', listitemID, remove);
    } else {
      return remove();
    }
  };

  ComboList.prototype.addSelected = function(ev) {
    var model;
    if ((ev.keyCode != null) && ev.keyCode === 13) {
      if (this.filtered_options.currentOption != null) {
        model = this.filtered_options.currentOption;
      }
      if (model == null) {
        this.createModel();
        return;
      }
    } else {
      model = this.collection.get(ev.currentTarget.getAttribute('data-id'));
    }
    return this.selected.add(model);
  };

  ComboList.prototype.triggerChange = function(options) {
    if (options.added == null) {
      options.added = null;
    }
    if (options.removed == null) {
      options.removed = null;
    }
    return this.trigger('change', {
      selected: this.selected.toJSON(),
      added: options.added,
      removed: options.removed
    });
  };

  ComboList.prototype.strArray2optionArray = function(strArray) {
    return _.map(strArray, function(item) {
      return {
        id: item,
        title: item
      };
    });
  };

  return ComboList;

})(Views.Base);

module.exports = ComboList;


},{"../../../collections/base":2,"../../../mixins/dropdown/main":9,"../../../utils/dom":16,"../../base":20,"./main.jade":22}],22:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (selected, settings, undefined, viewId) {
buf.push("<div class=\"input\"><input type=\"text\"" + (jade.attr("data-view-id", viewId, true, false)) + (jade.attr("placeholder", settings.placeholder, true, false)) + "/><div class=\"caret\"></div></div>");
if ( settings.mutable)
{
buf.push("<button class=\"add\">Add</button>");
}
if ( settings.editable)
{
buf.push("<button class=\"edit\">Edit</button>");
}
buf.push("<ul class=\"list\"></ul>");
if ( selected.length > 0)
{
buf.push("<ul class=\"selected\">");
// iterate selected.models
;(function(){
  var $$obj = selected.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + " class=\"selected\"><span>" + (jade.escape(null == (jade_interp = model.get('title')) ? "" : jade_interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + " class=\"selected\"><span>" + (jade.escape(null == (jade_interp = model.get('title')) ? "" : jade_interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul>");
}
else
{
buf.push("<div class=\"empty\">The list is empty.</div>");
}}.call(this,"selected" in locals_for_with?locals_for_with.selected:typeof selected!=="undefined"?selected:undefined,"settings" in locals_for_with?locals_for_with.settings:typeof settings!=="undefined"?settings:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined,"viewId" in locals_for_with?locals_for_with.viewId:typeof viewId!=="undefined"?viewId:undefined));;return buf.join("");
};
},{"jade/runtime":36}],23:[function(require,module,exports){
var Collections, EditableList, Views, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

Collections = {
  Base: require('../../../collections/base')
};

Views = {
  Base: require('../../base')
};

tpl = require('./main.jade');

EditableList = (function(_super) {
  __extends(EditableList, _super);

  function EditableList() {
    return EditableList.__super__.constructor.apply(this, arguments);
  }

  EditableList.prototype.className = 'editablelist';

  EditableList.prototype.initialize = function(options) {
    var value, _base, _base1, _base2, _ref;
    this.options = options;
    EditableList.__super__.initialize.apply(this, arguments);
    if ((_base = this.options).config == null) {
      _base.config = {};
    }
    this.settings = (_ref = this.options.config.settings) != null ? _ref : {};
    if ((_base1 = this.settings).placeholder == null) {
      _base1.placeholder = '';
    }
    if ((_base2 = this.settings).confirmRemove == null) {
      _base2.confirmRemove = false;
    }
    value = _.map(this.options.value, function(val) {
      return {
        id: val
      };
    });
    this.selected = new Collections.Base(value);
    this.listenTo(this.selected, 'add', this.render);
    this.listenTo(this.selected, 'remove', this.render);
    return this.render();
  };

  EditableList.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      viewId: this.cid,
      selected: this.selected,
      settings: this.settings
    });
    this.$el.html(rtpl);
    this.triggerChange();
    if (this.settings.inputClass != null) {
      this.$('input').addClass(this.settings.inputClass);
    }
    this.$('input').focus();
    return this;
  };

  EditableList.prototype.events = function() {
    var evs;
    evs = {
      'click li span': 'removeLi',
      'click button': 'addSelected'
    };
    evs['keyup input'] = 'onKeyup';
    return evs;
  };

  EditableList.prototype.removeLi = function(ev) {
    var listitemID;
    listitemID = ev.currentTarget.parentNode.getAttribute('data-id');
    if (this.settings.confirmRemove) {
      return this.trigger('confirmRemove', listitemID, (function(_this) {
        return function() {
          return _this.selected.removeById(listitemID);
        };
      })(this));
    } else {
      return this.selected.removeById(listitemID);
    }
  };

  EditableList.prototype.onKeyup = function(ev) {
    var valueLength;
    valueLength = ev.currentTarget.value.length;
    if (ev.keyCode === 13 && valueLength > 0) {
      return this.addSelected();
    } else if (valueLength > 1) {
      return this.showButton();
    } else {
      return this.hideButton();
    }
  };

  EditableList.prototype.addSelected = function() {
    this.selected.add({
      id: this.el.querySelector('input').value
    });
    return this.el.querySelector('button').style.display = 'none';
  };

  EditableList.prototype.showButton = function(ev) {
    return this.el.querySelector('button').style.display = 'inline-block';
  };

  EditableList.prototype.hideButton = function(ev) {
    return this.el.querySelector('button').style.display = 'none';
  };

  EditableList.prototype.triggerChange = function() {
    return this.trigger('change', this.selected.pluck('id'));
  };

  return EditableList;

})(Views.Base);

module.exports = EditableList;


},{"../../../collections/base":2,"../../base":20,"./main.jade":24}],24:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (selected, settings, undefined, viewId) {
buf.push("<div class=\"input\"><input" + (jade.attr("data-view-id", viewId, true, false)) + (jade.attr("placeholder", settings.placeholder, true, false)) + "/></div><button class=\"add\">Add</button>");
if ( selected.length > 0)
{
buf.push("<ul class=\"selected\">");
// iterate selected.models
;(function(){
  var $$obj = selected.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + "><span>" + (jade.escape(null == (jade_interp = model.id) ? "" : jade_interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + "><span>" + (jade.escape(null == (jade_interp = model.id) ? "" : jade_interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul>");
}
else
{
buf.push("<div class=\"empty\">The list is empty.</div>");
}}.call(this,"selected" in locals_for_with?locals_for_with.selected:typeof selected!=="undefined"?selected:undefined,"settings" in locals_for_with?locals_for_with.settings:typeof settings!=="undefined"?settings:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined,"viewId" in locals_for_with?locals_for_with.viewId:typeof viewId!=="undefined"?viewId:undefined));;return buf.join("");
};
},{"jade/runtime":36}],25:[function(require,module,exports){
var $, Backbone, Fn, Form, Views, validation, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

$ = require('jquery');

Fn = require('../../utils/general');

Views = {
  Base: require('../base')
};

validation = require('../../mixins/validation');

Form = (function(_super) {
  __extends(Form, _super);

  function Form() {
    this.renderSubform = __bind(this.renderSubform, this);
    this.addSubform = __bind(this.addSubform, this);
    return Form.__super__.constructor.apply(this, arguments);
  }

  Form.prototype.tagName = 'form';

  Form.prototype.className = 'hilib';

  Form.prototype.initialize = function(options) {
    var _base, _ref;
    this.options = options != null ? options : {};
    Form.__super__.initialize.apply(this, arguments);
    _.extend(this, validation);
    if ((_base = this.options).saveOnSubmit == null) {
      _base.saveOnSubmit = true;
    }
    if (this.subformConfig == null) {
      this.subformConfig = this.options.subformConfig;
    }
    if (this.subformConfig == null) {
      this.subformConfig = {};
    }
    if (this.Model == null) {
      this.Model = this.options.Model;
    }
    if (this.Model == null) {
      this.Model = Backbone.Model;
    }
    this.tplData = (_ref = this.options.tplData) != null ? _ref : {};
    if (this.tpl == null) {
      this.tpl = this.options.tpl;
    }
    if (this.tpl == null) {
      throw 'Unknow template!';
    }
    this.on('createModels:finished', this.render, this);
    this.createModels();
    this.validatorInit();
    return this.addListeners();
  };

  Form.prototype.preRender = function() {};

  Form.prototype.render = function() {
    var View, attr, rtpl, _ref;
    this.preRender();
    this.tplData.viewId = this.cid;
    if (this.model != null) {
      this.tplData.model = this.model;
    }
    if (this.collection != null) {
      this.tplData.collection = this.collection;
    }
    if (this.tpl == null) {
      throw 'Unknow template!';
    }
    rtpl = _.isString(this.tpl) ? _.template(this.tpl, this.tplData) : this.tpl(this.tplData);
    this.$el.html(rtpl);
    if (this.subforms == null) {
      this.subforms = {};
    }
    _ref = this.subforms;
    for (attr in _ref) {
      if (!__hasProp.call(_ref, attr)) continue;
      View = _ref[attr];
      this.addSubform(attr, View);
    }
    this.$('textarea').each((function(_this) {
      return function(index, textarea) {
        return textarea.style.height = textarea.scrollHeight + 6 > 32 ? textarea.scrollHeight + 6 + 'px' : '32px';
      };
    })(this));
    this.postRender();
    return this;
  };

  Form.prototype.postRender = function() {};

  Form.prototype.events = function() {
    var evs;
    evs = {};
    evs["keyup [data-model-id='" + this.model.cid + "'] textarea"] = "inputChanged";
    evs["keyup [data-model-id='" + this.model.cid + "'] input"] = "inputChanged";
    evs["change [data-model-id='" + this.model.cid + "'] input[type=\"checkbox\"]"] = "inputChanged";
    evs["change [data-model-id='" + this.model.cid + "'] select"] = "inputChanged";
    evs["keydown [data-model-id='" + this.model.cid + "'] textarea"] = "textareaKeyup";
    evs["click input[type=\"submit\"]"] = "submit";
    evs["click button[name=\"submit\"]"] = "submit";
    evs["click button[name=\"cancel\"]"] = "cancel";
    return evs;
  };

  Form.prototype.inputChanged = function(ev) {
    var model, value;
    model = this.model != null ? this.model : this.getModel(ev);
    value = ev.currentTarget.type === 'checkbox' ? ev.currentTarget.checked : ev.currentTarget.value;
    if (ev.currentTarget.name !== '') {
      return model.set(ev.currentTarget.name, value);
    }
  };

  Form.prototype.textareaKeyup = function(ev) {
    ev.currentTarget.style.height = '32px';
    return ev.currentTarget.style.height = ev.currentTarget.scrollHeight + 6 + 'px';
  };

  Form.prototype.saveModel = function(validate) {
    if (validate == null) {
      validate = true;
    }
    return this.model.save([], {
      validate: validate,
      success: (function(_this) {
        return function(model, response, options) {
          var target;
          _this.trigger('save:success', model, response, options);
          target = typeof ev !== "undefined" && ev !== null ? _this.$(ev.currentTarget) : _this.$('button[name="submit"]');
          target.removeClass('loader');
          return target.addClass('disabled');
        };
      })(this),
      error: (function(_this) {
        return function(model, xhr, options) {
          return _this.trigger('save:error', model, xhr, options);
        };
      })(this)
    });
  };

  Form.prototype.submit = function(ev) {
    var invalids, target;
    ev.preventDefault();
    target = this.$(ev.currentTarget);
    if (!(target.hasClass('loader') || target.hasClass('disabled'))) {
      target.addClass('loader');
      if (this.options.saveOnSubmit) {
        return this.saveModel();
      } else {
        invalids = this.model.validate(this.model.attributes);
        if (invalids != null) {
          return this.model.trigger('invalid', this.model, invalids);
        } else {
          return this.trigger('submit', this.model);
        }
      }
    }
  };

  Form.prototype.cancel = function(ev) {
    ev.preventDefault();
    return this.trigger('cancel');
  };

  Form.prototype.customAdd = function() {
    return console.error('Form.customAdd is not implemented!');
  };

  Form.prototype.reset = function() {
    var target;
    target = this.$('button[name="submit"]');
    target.removeClass('loader');
    target.addClass('disabled');
    this.stopListening(this.model);
    this.model = this.model.clone();
    this.model.clear({
      silent: true
    });
    this.model.set(this.model.defaults());
    this.validatorInit();
    this.addListeners();
    this.delegateEvents();
    this.el.querySelector('[data-model-id]').setAttribute('data-model-id', this.model.cid);
    return this.el.reset();
  };

  Form.prototype.createModels = function() {
    var _base;
    if (this.model == null) {
      if ((_base = this.options).value == null) {
        _base.value = {};
      }
      this.model = new this.Model(this.options.value);
      if (this.model.isNew()) {
        return this.trigger('createModels:finished');
      } else {
        return this.model.fetch({
          success: (function(_this) {
            return function() {
              return _this.trigger('createModels:finished');
            };
          })(this)
        });
      }
    } else {
      return this.trigger('createModels:finished');
    }

    /* @on 'validator:validated', => $('button.save').prop('disabled', false).removeAttr('title') */

    /* @on 'validator:invalidated', => $('button.save').prop('disabled', true).attr 'title', 'The form cannot be saved due to invalid values.' */
  };

  Form.prototype.addListeners = function() {
    this.listenTo(this.model, 'change', (function(_this) {
      return function() {
        return _this.triggerChange();
      };
    })(this));
    return this.listenTo(this.model, 'invalid', (function(_this) {
      return function(model, errors, options) {
        var error, found, _i, _len;
        if (_this.options.validationAttributes != null) {
          found = false;
          for (_i = 0, _len = errors.length; _i < _len; _i++) {
            error = errors[_i];
            if (_this.options.validationAttributes.indexOf(error.name) > -1) {
              found = true;
            }
          }
          if (!found) {
            _this.$('button[name="submit"]').addClass('loader');
            return _this.saveModel(false);
          }
        }
      };
    })(this));
  };

  Form.prototype.triggerChange = function() {
    var object;
    object = this.model != null ? this.model : this.collection;
    return this.trigger('change', object.toJSON(), object);
  };

  Form.prototype.addSubform = function(attr, View) {
    return this.renderSubform(attr, View, this.model);
  };

  Form.prototype.renderSubform = function(attr, View, model) {
    var htmlSafeAttr, placeholders, value, view;
    value = attr.indexOf('.') > -1 ? Fn.flattenObject(model.attributes)[attr] : model.get(attr);
    if (value == null) {
      console.error('Subform value is undefined!', this.model);
    }
    view = new View({
      value: value,
      config: this.subformConfig[attr]
    });
    this.subviews.push(view);
    htmlSafeAttr = attr.split('.').join('_');
    placeholders = this.el.querySelectorAll("[data-cid='" + model.cid + "'] ." + htmlSafeAttr + "-placeholder");
    if (placeholders.length > 1) {
      _.each(placeholders, (function(_this) {
        return function(placeholder) {
          var el;
          el = Fn.closest(placeholder, '[data-cid]');
          if (el.getAttribute('data-cid') === model.cid && placeholder.innerHTML === '') {
            return placeholder.appendChild(view.el);
          }
        };
      })(this));
    } else {
      placeholders[0].appendChild(view.el);
    }
    this.listenTo(view, 'change', (function(_this) {
      return function(data) {
        return model.set(attr, data);
      };
    })(this));
    this.listenTo(view, 'customAdd', this.customAdd);
    return this.listenTo(view, 'change:data', (function(_this) {
      return function(models) {
        return _this.subformConfig[attr].data = _this.subformConfig[attr].data.reset(models);
      };
    })(this));
  };

  Form.prototype.destroy = function() {
    var view, _i, _len, _ref;
    _ref = this.subviews;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      view = _ref[_i];
      view.destroy();
    }
    return this.remove();
  };

  return Form;

})(Views.Base);

module.exports = Form;


},{"../../mixins/validation":15,"../../utils/general":17,"../base":20}],26:[function(require,module,exports){
module.exports = {
  65: 'a',
  66: 'b',
  67: 'c',
  68: 'd',
  69: 'e',
  70: 'f',
  71: 'g',
  72: 'h',
  73: 'i',
  74: 'j',
  75: 'k',
  76: 'l',
  78: 'n',
  79: 'o',
  80: 'p',
  82: 'r',
  83: 's',
  84: 't',
  85: 'u',
  86: 'v',
  87: 'w',
  89: 'y',
  90: 'z',
  187: '=',
  189: '-',
  190: '.',
  222: "'"
};


},{}],27:[function(require,module,exports){
module.exports = {
  'A': 'ĀĂÀÁÂÃÄÅĄⱭ∀Æ',
  'B': 'Ɓ',
  'C': 'ÇĆĈĊČƆ',
  'D': 'ÐĎĐḎƊ',
  'E': 'ÈÉÊËĒĖĘẸĚƏÆƎƐ€',
  'F': 'ƑƩ',
  'G': 'ĜĞĠĢƢ',
  'H': 'ĤĦ',
  'I': 'ÌÍÎÏĪĮỊİIƗĲ',
  'J': 'ĴĲ',
  'K': 'ĶƘ',
  'L': 'ĹĻĽŁΛ',
  'N': 'ÑŃŅŇŊƝ₦',
  'O': 'ÒÓÔÕÖŌØŐŒƠƟ',
  'P': 'Ƥ¶',
  'R': 'ŔŘɌⱤ',
  'S': 'ßſŚŜŞṢŠÞ§',
  'T': 'ŢŤṮƬƮ',
  'U': 'ÙÚÛÜŪŬŮŰŲɄƯƱ',
  'V': 'Ʋ',
  'W': 'ŴẄΩ',
  'Y': 'ÝŶŸƔƳ',
  'Z': 'ŹŻŽƵƷẔ',
  'a': 'āăàáâãäåąɑæαª',
  'b': 'ßβɓ',
  'c': 'çςćĉċč¢ɔ',
  'd': 'ðďđɖḏɖɗ',
  'e': 'èéêëēėęẹěəæεɛ€',
  'f': 'ƒʃƭ',
  'g': 'ĝğġģɠƣ',
  'h': 'ĥħɦẖ',
  'i': 'ìíîïīįịiiɨĳι',
  'j': 'ĵɟĳ',
  'k': 'ķƙ',
  'l': 'ĺļľłλ',
  'n': 'ñńņňŋɲ',
  'o': 'òóôõöōøőœơɵ°',
  'p': 'ƥ¶',
  'r': 'ŕřɍɽ',
  's': 'ßſśŝşṣšþ§',
  't': 'ţťṯƭʈ',
  'u': 'ùúûüūŭůűųưμυʉʊ',
  'v': 'ʋ',
  'w': 'ŵẅω',
  'y': 'ýŷÿɣyƴ',
  'z': 'źżžƶẕʒƹ',
  '$': '£¥€₩₨₳Ƀ¤',
  '!': '¡‼‽',
  '?': '¿‽',
  '%': '‰',
  '.': '…••',
  '-': '±‐–—',
  '+': '±†‡',
  '\'': '′″‴‘’‚‛',
  '"': '“”„‟',
  '<': '≤‹',
  '>': '≥›',
  '=': '≈≠≡'
};


},{}],28:[function(require,module,exports){
var Fn, Longpress, Views, codes, diacritics, shiftcodes,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('../../utils/general');

Views = {
  Base: require('../base')
};

codes = require('./codes');

shiftcodes = require('./shiftcodes');

diacritics = require('./diacritics');

Longpress = (function(_super) {
  __extends(Longpress, _super);

  function Longpress() {
    return Longpress.__super__.constructor.apply(this, arguments);
  }

  Longpress.prototype.initialize = function(options) {
    this.options = options;
    Longpress.__super__.initialize.apply(this, arguments);
    this.timer = null;
    this.lastKeyCode = null;
    this.keyDown = false;
    this.iframe = this.options.parent.querySelector('iframe');
    this.iframeBody = this.iframe.contentDocument.querySelector('body');
    this.iframeBody.addEventListener('keydown', this.onKeydown.bind(this));
    this.iframeBody.addEventListener('keyup', this.onKeyup.bind(this));
    this.editorBody = this.options.parent;
    return this.editorBody.addEventListener('click', this.onClick.bind(this));
  };

  Longpress.prototype.render = function(pressedChar) {
    var frag, ul;
    ul = document.createElement('ul');
    ul.className = 'longpress';
    frag = document.createDocumentFragment();
    _.each(diacritics[pressedChar], (function(_this) {
      return function(chr) {
        var li;
        li = document.createElement('li');
        li.textContent = chr;
        $(li).mouseenter(function(e) {
          return _this.replaceChar(e.target.textContent);
        });
        return frag.appendChild(li);
      };
    })(this));
    ul.appendChild(frag);
    return ul;
  };

  Longpress.prototype.onKeydown = function(e) {
    var pressedChar;
    if (this.longKeyDown) {
      e.preventDefault();
      return false;
    }
    pressedChar = e.shiftKey ? shiftcodes[e.keyCode] : codes[e.keyCode];
    if (e.keyCode === this.lastKeyCode) {
      e.preventDefault();
      if (pressedChar != null) {
        this.longKeyDown = true;
        if (this.timer == null) {
          this.timer = setTimeout(((function(_this) {
            return function() {
              var list;
              _this.rangeManager.set(_this.iframe.contentWindow.getSelection().getRangeAt(0));
              list = _this.render(pressedChar);
              return _this.show(list);
            };
          })(this)), 300);
        }
      }
    }
    return this.lastKeyCode = e.keyCode;
  };

  Longpress.prototype.onKeyup = function(e) {
    this.longKeyDown = false;
    return this.hide();
  };

  Longpress.prototype.onClick = function(e) {
    if (this.editorBody.querySelector('ul.longpress') != null) {
      e.preventDefault();
      e.stopPropagation();
      return this.resetFocus();
    }
  };

  Longpress.prototype.destroy = function() {
    this.iframeBody.removeEventListener('keydown', this.onKeydown);
    this.iframeBody.removeEventListener('keyup', this.onKeyup);
    this.editorBody.removeEventListener('click', this.onClick);
    return this.remove();
  };

  Longpress.prototype.rangeManager = (function() {
    var currentRange;
    currentRange = null;
    return {
      get: (function(_this) {
        return function() {
          return currentRange;
        };
      })(this),
      set: (function(_this) {
        return function(r) {
          return currentRange = r.cloneRange();
        };
      })(this),
      clear: (function(_this) {
        return function() {
          return currentRange = null;
        };
      })(this)
    };
  })();

  Longpress.prototype.show = function(list) {
    return this.editorBody.appendChild(list);
  };

  Longpress.prototype.hide = function() {
    var list;
    this.lastKeyCode = null;
    list = this.editorBody.querySelector('.longpress');
    if (list != null) {
      clearTimeout(this.timer);
      this.timer = null;
      this.rangeManager.clear();
      return this.editorBody.removeChild(list);
    }
  };

  Longpress.prototype.replaceChar = function(chr) {
    var range;
    range = this.rangeManager.get();
    range.setStart(range.startContainer, range.startOffset - 1);
    range.deleteContents();
    range.insertNode(document.createTextNode(chr));
    range.collapse(false);
    return this.resetFocus();
  };

  Longpress.prototype.resetFocus = function() {
    var sel;
    this.iframe.contentWindow.focus();
    sel = this.iframe.contentWindow.getSelection();
    sel.removeAllRanges();
    return sel.addRange(this.rangeManager.get());
  };

  return Longpress;

})(Views.Base);

module.exports = Longpress;


},{"../../utils/general":17,"../base":20,"./codes":26,"./diacritics":27,"./shiftcodes":29}],29:[function(require,module,exports){
module.exports = {
  65: 'A',
  66: 'B',
  67: 'C',
  68: 'D',
  69: 'E',
  70: 'F',
  71: 'G',
  72: 'H',
  73: 'I',
  74: 'J',
  75: 'K',
  76: 'L',
  78: 'N',
  79: 'O',
  80: 'P',
  82: 'R',
  83: 'S',
  84: 'T',
  85: 'U',
  86: 'V',
  87: 'W',
  89: 'Y',
  90: 'Z',
  49: '!',
  52: '$',
  53: '%',
  187: '+',
  188: '<',
  190: '>',
  191: '?',
  222: '"'
};


},{}],30:[function(require,module,exports){
var $, Backbone, Modal, modalManager, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

$ = require('jquery');

tpl = require('./main.jade');

modalManager = require('../../managers/modal');

Modal = (function(_super) {
  __extends(Modal, _super);

  function Modal() {
    return Modal.__super__.constructor.apply(this, arguments);
  }

  Modal.prototype.className = "modal";

  Modal.prototype.defaultOptions = function() {
    return {
      title: '',
      titleClass: '',
      cancelAndSubmit: true,
      cancelValue: 'Cancel',
      submitValue: 'Submit',
      customClassName: '',
      focusOnFirstInput: true,
      clickOverlay: true
    };
  };

  Modal.prototype.initialize = function(options) {
    this.options = options != null ? options : {};
    Modal.__super__.initialize.apply(this, arguments);
    this.options = _.extend(this.defaultOptions(), this.options);
    if (this.options.customClassName.length > 0) {
      this.$el.addClass(this.options.customClassName);
    }
    return this.render();
  };

  Modal.prototype.render = function() {
    var body, bodyTop, firstInput, marginLeft, offsetTop, rtpl, viewportHeight;
    rtpl = tpl(this.options);
    this.$el.html(rtpl);
    body = this.$('.body');
    if (this.options.html != null) {
      body.html(this.options.html);
    } else {
      body.hide();
    }
    this.$('.body').scroll((function(_this) {
      return function(ev) {
        return ev.stopPropagation();
      };
    })(this));
    modalManager.add(this);
    if (this.options.width != null) {
      this.$('.modalbody').css('width', this.options.width);
      marginLeft = -1 * parseInt(this.options.width, 10) / 2;
      if (this.options.width.slice(-1) === '%') {
        marginLeft += '%';
      }
      if (this.options.width.slice(-2) === 'vw') {
        marginLeft += 'vw';
      }
      if (this.options.width === 'auto') {
        marginLeft = this.$('.modalbody').width() / -2;
      }
      this.$('.modalbody').css('margin-left', marginLeft);
    }
    if (this.options.height != null) {
      this.$('.modalbody').css('height', this.options.height);
    }
    viewportHeight = document.documentElement.clientHeight;
    offsetTop = this.$('.modalbody').outerHeight() / 2;
    bodyTop = this.$('.modalbody').offset().top;
    if (offsetTop > bodyTop) {
      offsetTop = bodyTop - 20;
    }
    this.$('.modalbody').css('margin-top', -1 * offsetTop);
    this.$('.modalbody .body').css('max-height', viewportHeight - 175);
    if (this.options.focusOnFirstInput) {
      firstInput = this.$('input[type="text"]').first();
      if (firstInput.length > 0) {
        firstInput.focus();
      }
    }
    return this;
  };

  Modal.prototype.events = {
    "click button.submit": 'submit',
    "click button.cancel": "cancel",
    "click .overlay": function() {
      if (this.options.clickOverlay) {
        return this.cancel();
      }
    },
    "keydown input": function(ev) {
      if (ev.keyCode === 13) {
        ev.preventDefault();
        return this.submit(ev);
      }
    }
  };

  Modal.prototype.submit = function(ev) {
    var target;
    target = $(ev.currentTarget);
    if (!target.hasClass('loader')) {
      target.addClass('loader');
      this.$('button.cancel').hide();
      return this.trigger('submit');
    }
  };

  Modal.prototype.cancel = function(ev) {
    if (ev != null) {
      ev.preventDefault();
    }
    this.trigger('cancel');
    return this.close();
  };

  Modal.prototype.close = function() {
    this.trigger('close');
    return modalManager.remove(this);
  };

  Modal.prototype.destroy = function() {
    return this.close();
  };

  Modal.prototype.fadeOut = function(delay) {
    var speed;
    if (delay == null) {
      delay = 1000;
    }
    speed = delay === 0 ? 0 : 500;
    this.$(".modalbody").delay(delay).fadeOut(speed);
    return setTimeout(((function(_this) {
      return function() {
        return _this.close();
      };
    })(this)), delay + speed - 100);
  };

  Modal.prototype.message = function(type, message) {
    if (["success", "warning", "error"].indexOf(type) === -1) {
      return console.error("Unknown message type!");
    }
    this.$("p.message").show();
    return this.$("p.message").html(message).addClass(type);
  };

  Modal.prototype.messageAndFade = function(type, message, delay) {
    this.$(".modalbody .body").hide();
    this.$("footer").hide();
    this.message(type, message);
    return this.fadeOut(delay);
  };

  return Modal;

})(Backbone.View);

module.exports = Modal;


},{"../../managers/modal":6,"./main.jade":31}],31:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (cancelAndSubmit, cancelValue, submitValue, title, titleClass) {
buf.push("<div class=\"overlay\"></div><div class=\"modalbody\"><header>");
if ( (title !== ''))
{
buf.push("<h2" + (jade.cls([titleClass], [true])) + ">" + (null == (jade_interp = title) ? "" : jade_interp) + "</h2>");
}
buf.push("<p class=\"message\"></p></header><div class=\"body\"></div>");
if ( (cancelAndSubmit))
{
buf.push("<footer><button class=\"cancel\">" + (jade.escape(null == (jade_interp = cancelValue) ? "" : jade_interp)) + "</button><button class=\"submit\">" + (jade.escape(null == (jade_interp = submitValue) ? "" : jade_interp)) + "</button></footer>");
}
buf.push("</div>");}.call(this,"cancelAndSubmit" in locals_for_with?locals_for_with.cancelAndSubmit:typeof cancelAndSubmit!=="undefined"?cancelAndSubmit:undefined,"cancelValue" in locals_for_with?locals_for_with.cancelValue:typeof cancelValue!=="undefined"?cancelValue:undefined,"submitValue" in locals_for_with?locals_for_with.submitValue:typeof submitValue!=="undefined"?submitValue:undefined,"title" in locals_for_with?locals_for_with.title:typeof title!=="undefined"?title:undefined,"titleClass" in locals_for_with?locals_for_with.titleClass:typeof titleClass!=="undefined"?titleClass:undefined));;return buf.join("");
};
},{"jade/runtime":36}],32:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<ul class=\"diacritics\"><li>Ā</li><li>Ă</li><li>À</li><li>Á</li><li>Â</li><li>Ã</li><li>Ä</li><li>Å</li><li>Ą</li><li>Ɑ</li><li>∀</li><li>Æ</li><li>ā</li><li>ă</li><li>à</li><li>á</li><li>â</li><li>ã</li><li>ä</li><li>å</li><li>ą</li><li>ɑ</li><li>æ</li><li>α</li><li>ª</li><li>ƀ</li><li>Ɓ</li><li>β</li><li>ɓ</li><li>Ç</li><li>Ć</li><li>Ĉ</li><li>Ċ</li><li>Č</li><li>Ɔ</li><li>ɔ</li><li>ç</li><li>ς</li><li>ć</li><li>ĉ</li><li>ċ</li><li>č</li><li>¢</li><li>đ</li><li>Ð</li><li>Ď</li><li>Đ</li><li>Ḏ</li><li>Ɗ</li><li>ð</li><li>ď</li><li>ḏ</li><li>ɖ</li><li>ɗ</li><li>È</li><li>É</li><li>Ê</li><li>Ë</li><li>Ē</li><li>Ė</li><li>Ę</li><li>Ẹ</li><li>Ě</li><li>Ə</li><li>Æ</li><li>Ǝ</li><li>Ɛ</li><li>€</li><li>è</li><li>é</li><li>ê</li><li>ë</li><li>ē</li><li>ė</li><li>ę</li><li>ẹ</li><li>ě</li><li>ə</li><li>æ</li><li>ε</li><li>ɛ</li><li>€</li><li>Ƒ</li><li>Ʃ</li><li>ƒ</li><li>ʃ</li><li>ƭ</li><li>Ĝ</li><li>Ğ</li><li>Ġ</li><li>Ģ</li><li>Ƣ</li><li>ĝ</li><li>ğ</li><li>ġ</li><li>ģ</li><li>ɠ</li><li>ƣ</li><li>Ĥ</li><li>Ħ</li><li>ĥ</li><li>ħ</li><li>ɦ</li><li>ẖ</li><li>Ì</li><li>Í</li><li>Î</li><li>Ï</li><li>Ī</li><li>Į</li><li>Ị</li><li>İ</li><li>Ɨ</li><li>ì</li><li>í</li><li>î</li><li>ï</li><li>ī</li><li>į</li><li>ị</li><li>ɨ</li><li>Ĳ</li><li>ĳ</li><li>ι</li><li>Ĵ</li><li>ĵ</li><li>ɟ</li><li>ĳ</li><li>Ķ</li><li>Ƙ</li><li>ķ</li><li>ƙ</li><li>ꝁ</li><li>Ĺ</li><li>Ļ</li><li>Ľ</li><li>Ł</li><li>Λ</li><li>ĺ</li><li>ļ</li><li>ľ</li><li>ł</li><li>ƚ</li><li>λ</li><li>Ñ</li><li>Ń</li><li>Ņ</li><li>Ň</li><li>Ŋ</li><li>Ɲ</li><li>₦</li><li>ñ</li><li>ń</li><li>ņ</li><li>ň</li><li>ŋ</li><li>ɲ</li><li>Ò</li><li>Ó</li><li>Ô</li><li>Õ</li><li>Ö</li><li>Ō</li><li>Ø</li><li>Ő</li><li>Œ</li><li>Ơ</li><li>Ɵ</li><li>ò</li><li>ó</li><li>ô</li><li>õ</li><li>ö</li><li>ō</li><li>ø</li><li>ő</li><li>œ</li><li>ơ</li><li>ɵ</li><li>°</li><li></li><li>ꝑ</li><li>Ƥ</li><li>¶</li><li>ƥ</li><li>ꝗ</li><li>Ŕ</li><li>Ř</li><li>Ɍ</li><li>Ɽ</li><li>ŕ</li><li>ř</li><li>ɍ</li><li>ɽ</li><li>ſ</li><li>Ś</li><li>Ŝ</li><li>Ş</li><li>Ṣ</li><li>Š</li><li>ś</li><li>ŝ</li><li>ş</li><li>ṣ</li><li>š</li><li>ẜ</li><li>Þ</li><li>§</li><li>ß</li><li>ſ</li><li>þ</li><li>Ţ</li><li>Ť</li><li>Ṯ</li><li>Ƭ</li><li>Ʈ</li><li>ţ</li><li>ť</li><li>ṯ</li><li>ƭ</li><li>ʈ</li><li>Ù</li><li>Ú</li><li>Û</li><li>Ü</li><li>Ū</li><li>Ŭ</li><li>Ů</li><li>Ű</li><li>Ų</li><li>Ʉ</li><li>Ư</li><li>Ʊ</li><li>ù</li><li>ú</li><li>û</li><li>ü</li><li>ū</li><li>ŭ</li><li>ů</li><li>ű</li><li>ų</li><li>ư</li><li>μ</li><li>υ</li><li>ʉ</li><li>ʊ</li><li>Ʋ</li><li>ʋ</li><li>Ŵ</li><li>Ẅ</li><li>Ω</li><li>ŵ</li><li>ẅ</li><li>ω</li><li>Ý</li><li>Ŷ</li><li>Ÿ</li><li>Ɣ</li><li>Ƴ</li><li>ý</li><li>ŷ</li><li>ÿ</li><li>ȳ</li><li>ɣ</li><li>y</li><li>ƴ</li><li>Ź</li><li>Ż</li><li>Ž</li><li>Ƶ</li><li>Ʒ</li><li>Ẕ</li><li>ź</li><li>ż</li><li>ž</li><li>ƶ</li><li>ẕ</li><li>ʒ</li><li>ƹ</li><li>£</li><li>¥</li><li>€</li><li>₩</li><li>₨</li><li>₳</li><li>Ƀ</li><li>℔</li><li>¤</li><li>¡</li><li>‼</li><li>‽</li><li>¿</li><li>‽</li><li>‰</li><li>…</li><li>∻</li><li>•</li><li>±</li><li>‐</li><li>–</li><li>—</li><li>±</li><li>†</li><li>‡</li><li>′</li><li>″</li><li>‴</li><li>‘</li><li>’</li><li>‚</li><li>‛</li><li>“</li><li>”</li><li>„</li><li>‟</li><li>≤</li><li>‹</li><li>≥</li><li>›</li><li>≈</li><li>≠</li><li>≡</li><li>ꝵ</li><li>&rtailstrok;</li></ul>");;return buf.join("");
};
},{"jade/runtime":36}],33:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<div class=\"ste-header\"></div><div class=\"ste-body\"></div>");;return buf.join("");
};
},{"jade/runtime":36}],34:[function(require,module,exports){
var $, Fn, Longpress, StringFn, SuperTinyEditor, Views, diacriticsTpl, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

$ = require('jquery');

Fn = require('../../utils/general');

StringFn = require('../../utils/string');

require('../../utils/jquery.mixin');

Longpress = require('../longpress/main');

Views = {
  Base: require('../base')
};

tpl = require('./main.jade');

diacriticsTpl = require('./diacritics.jade');

SuperTinyEditor = (function(_super) {
  __extends(SuperTinyEditor, _super);

  function SuperTinyEditor() {
    return SuperTinyEditor.__super__.constructor.apply(this, arguments);
  }

  SuperTinyEditor.prototype.className = 'supertinyeditor';

  SuperTinyEditor.prototype.initialize = function(options) {
    var _base, _base1, _base2, _base3, _base4;
    this.options = options;
    SuperTinyEditor.__super__.initialize.apply(this, arguments);
    if ((_base = this.options).cssFile == null) {
      _base.cssFile = '';
    }
    if ((_base1 = this.options).html == null) {
      _base1.html = '';
    }
    if ((_base2 = this.options).width == null) {
      _base2.width = '320';
    }
    if ((_base3 = this.options).height == null) {
      _base3.height = '200';
    }
    if ((_base4 = this.options).wrap == null) {
      _base4.wrap = false;
    }
    this.on('button:save', (function(_this) {
      return function() {};
    })(this));
    return this.render();
  };

  SuperTinyEditor.prototype.render = function() {
    this.el.innerHTML = tpl();
    this.$currentHeader = this.$('.ste-header');
    this.renderControls();
    this.renderIframe();
    return this;
  };

  SuperTinyEditor.prototype.renderControls = function() {
    var controlName, diacriticsUL, div, _i, _len, _ref, _results;
    _ref = this.options.controls;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      controlName = _ref[_i];
      div = document.createElement('div');
      if (controlName === 'n') {
        div.className = 'ste-header';
        this.$('.ste-body').before(div);
        _results.push(this.$currentHeader = $(div));
      } else if (controlName === '|') {
        div.className = 'ste-divider';
        _results.push(this.$currentHeader.append(div));
      } else if (controlName === 'diacritics') {
        div.className = 'ste-control-diacritics ' + controlName;
        div.setAttribute('title', StringFn.ucfirst(controlName));
        div.setAttribute('data-action', controlName);
        diacriticsUL = document.createElement('div');
        diacriticsUL.className = 'diacritics-placeholder';
        diacriticsUL.innerHTML = diacriticsTpl();
        div.appendChild(diacriticsUL);
        _results.push(this.$currentHeader.append(div));
      } else if (controlName === 'wordwrap') {
        div.className = 'ste-control-wordwrap';
        div.setAttribute('title', 'Word wrap');
        div.setAttribute('data-action', controlName);
        _results.push(this.$currentHeader.append(div));
      } else if (controlName.substr(0, 2) === 'b_') {
        controlName = controlName.substr(2);
        div.className = 'ste-button';
        div.setAttribute('data-action', controlName);
        div.setAttribute('title', StringFn.ucfirst(controlName));
        div.innerHTML = StringFn.ucfirst(controlName);
        _results.push(this.$currentHeader.append(div));
      } else {
        div.className = 'ste-control ' + controlName;
        div.setAttribute('title', StringFn.ucfirst(controlName));
        div.setAttribute('data-action', controlName);
        _results.push(this.$currentHeader.append(div));
      }
    }
    return _results;
  };

  SuperTinyEditor.prototype.renderIframe = function() {
    var iframe, steBody;
    iframe = document.createElement('iframe');
    iframe.style.width = this.options.width + 'px';
    iframe.style.height = this.options.height + 'px';
    iframe.src = "about:blank";
    iframe.onload = (function(_this) {
      return function() {
        _this.iframeDocument = iframe.contentDocument;
        _this.iframeDocument.designMode = 'On';
        _this.iframeDocument.open();
        _this.iframeDocument.write("<!DOCTYPE html> <html> <head><meta charset='UTF-8'><link rel='stylesheet' href='" + _this.options.cssFile + "'></head> <body class='ste-iframe-body' spellcheck='false' contenteditable='true'>" + (_this.model.get(_this.options.htmlAttribute)) + "</body> </html>");
        _this.iframeDocument.close();
        _this.iframeBody = _this.iframeDocument.querySelector('body');
        if (_this.options.wrap) {
          _this.iframeBody.style.whiteSpace = 'normal';
        }
        _this.setFocus();
        _this.longpress = new Longpress({
          parent: _this.el.querySelector('.ste-body')
        });
        _this.iframeDocument.addEventListener('scroll', function() {
          if (!_this.autoScroll) {
            return _this.triggerScroll();
          }
        });
        return _this.iframeDocument.addEventListener('keyup', function(ev) {
          return Fn.timeoutWithReset(500, function() {
            _this.triggerScroll();
            return _this.saveHTMLToModel();
          });
        });
      };
    })(this);
    steBody = this.el.querySelector('.ste-body');
    return steBody.appendChild(iframe);
  };

  SuperTinyEditor.prototype.events = function() {
    return {
      'click .ste-control': 'controlClicked',
      'click .ste-control-diacritics ul.diacritics li': 'diacriticClicked',
      'click .ste-control-wordwrap': 'wordwrapClicked',
      'click .ste-button': 'buttonClicked'
    };
  };

  SuperTinyEditor.prototype.buttonClicked = function(ev) {
    var action;
    action = ev.currentTarget.getAttribute('data-action');
    if (action !== 'save' || (action === 'save' && $(ev.currentTarget).hasClass('active'))) {
      return this.trigger('button:' + action);
    }
  };

  SuperTinyEditor.prototype.controlClicked = function(ev) {
    var action;
    action = ev.currentTarget.getAttribute('data-action');
    this.iframeDocument.execCommand(action, false, null);
    this.saveHTMLToModel();
    return this.trigger('control:' + action);
  };

  SuperTinyEditor.prototype.wordwrapClicked = function(ev) {
    var iframeBody;
    iframeBody = $(this.iframeBody);
    iframeBody.toggleClass('wrap');
    return this.trigger('control:wordwrap', iframeBody.hasClass('wrap'));
  };

  SuperTinyEditor.prototype.diacriticClicked = function(ev) {
    var range, sel, textNode;
    sel = this.el.querySelector('iframe').contentWindow.getSelection();
    range = sel.getRangeAt(0);
    range.deleteContents();
    textNode = ev.currentTarget.childNodes[0].cloneNode();
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);
    this.saveHTMLToModel();
    return this.trigger('control:diacritic', textNode);
  };

  SuperTinyEditor.prototype.destroy = function() {
    this.longpress.destroy();
    return this.remove();
  };

  SuperTinyEditor.prototype.saveHTMLToModel = function() {
    this.$('[data-action="save"]').addClass('active');
    return this.model.set(this.options.htmlAttribute, this.iframeBody.innerHTML);
  };

  SuperTinyEditor.prototype.triggerScroll = function() {
    var iframe, target;
    iframe = this.el.querySelector('iframe');
    target = {
      scrollLeft: $(iframe).contents().scrollLeft(),
      scrollWidth: iframe.contentWindow.document.documentElement.scrollWidth,
      clientWidth: iframe.contentWindow.document.documentElement.clientWidth,
      scrollTop: $(iframe).contents().scrollTop(),
      scrollHeight: iframe.contentWindow.document.documentElement.scrollHeight,
      clientHeight: iframe.contentWindow.document.documentElement.clientHeight
    };
    return this.trigger('scrolled', Fn.getScrollPercentage(target));
  };

  SuperTinyEditor.prototype.setModel = function(model) {
    this.setInnerHTML(model.get(this.options.htmlAttribute));
    this.model = model;
    return this.setFocus();
  };

  SuperTinyEditor.prototype.setInnerHTML = function(html) {
    return this.iframeBody.innerHTML = html;
  };

  SuperTinyEditor.prototype.setIframeHeight = function(height) {
    var iframe;
    iframe = this.el.querySelector('iframe');
    return iframe.style.height = height + 'px';
  };

  SuperTinyEditor.prototype.setIframeWidth = function(width) {
    var iframe;
    iframe = this.el.querySelector('iframe');
    return iframe.style.width = width + 'px';
  };

  SuperTinyEditor.prototype.setFocus = function() {
    var win;
    if ((this.iframeBody != null) && (win = this.el.querySelector('iframe').contentWindow)) {
      return Fn.setCursorToEnd(this.iframeBody, win);
    }
  };

  SuperTinyEditor.prototype.setScrollPercentage = function(percentages) {
    var clientHeight, clientWidth, contentWindow, documentElement, left, scrollHeight, scrollWidth, top;
    contentWindow = this.el.querySelector('iframe').contentWindow;
    documentElement = contentWindow.document.documentElement;
    clientWidth = documentElement.clientWidth;
    scrollWidth = documentElement.scrollWidth;
    clientHeight = documentElement.clientHeight;
    scrollHeight = documentElement.scrollHeight;
    top = (scrollHeight - clientHeight) * percentages.top / 100;
    left = (scrollWidth - clientWidth) * percentages.left / 100;
    this.autoScroll = true;
    contentWindow.scrollTo(left, top);
    return setTimeout(((function(_this) {
      return function() {
        return _this.autoScroll = false;
      };
    })(this)), 200);
  };

  return SuperTinyEditor;

})(Views.Base);

module.exports = SuperTinyEditor;


},{"../../utils/general":17,"../../utils/jquery.mixin":18,"../../utils/string":19,"../base":20,"../longpress/main":28,"./diacritics.jade":32,"./main.jade":33}],35:[function(require,module,exports){
(function (global){
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.FacetedSearch=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = _dereq_('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":6}],2:[function(_dereq_,module,exports){

},{}],3:[function(_dereq_,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],4:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],5:[function(_dereq_,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],6:[function(_dereq_,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = _dereq_('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = _dereq_('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,_dereq_("FWaASH"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":5,"FWaASH":4,"inherits":3}],7:[function(_dereq_,module,exports){
(function() {
  module.exports = {
    el: function(el) {
      return {
        closest: function(selector) {
          var matchesSelector;
          matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
          while (el) {
            if (matchesSelector.bind(el)(selector)) {
              return el;
            } else {
              el = el.parentNode;
            }
          }
        },

        /*
        		Native alternative to jQuery's $.offset()
        
        		http://www.quirksmode.org/js/findpos.html
         */
        position: function(parent) {
          var left, loopEl, top;
          if (parent == null) {
            parent = document.body;
          }
          left = 0;
          top = 0;
          loopEl = el;
          while ((loopEl != null) && loopEl !== parent) {
            if (this.hasDescendant(parent)) {
              break;
            }
            left += loopEl.offsetLeft;
            top += loopEl.offsetTop;
            loopEl = loopEl.offsetParent;
          }
          return {
            left: left,
            top: top
          };
        },
        boundingBox: function() {
          var box;
          box = this.position();
          box.width = el.clientWidth;
          box.height = el.clientHeight;
          box.right = box.left + box.width;
          box.bottom = box.top + box.height;
          return box;
        },

        /*
        		Is child el a descendant of parent el?
        
        		http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
         */
        hasDescendant: function(child) {
          var node;
          node = child.parentNode;
          while (node != null) {
            if (node === el) {
              return true;
            }
            node = node.parentNode;
          }
          return false;
        },
        insertAfter: function(referenceElement) {
          return referenceElement.parentNode.insertBefore(el, referenceElement.nextSibling);
        },
        hasScrollBar: function(el) {
          return hasScrollBarX(el) || hasScrollBarY(el);
        },
        hasScrollBarX: function(el) {
          return el.scrollWidth > el.clientWidth;
        },
        hasScrollBarY: function(el) {
          return el.scrollHeight > el.clientHeight;
        },
        inViewport: function(parent) {
          var doc, rect, win;
          win = parent != null ? parent : window;
          doc = parent != null ? parent : document.documentElement;
          rect = el.getBoundingClientRect();
          return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (win.innerHeight || doc.clientHeight) && rect.right <= (win.innerWidth || doc.clientWidth);
        }
      };
    }
  };

}).call(this);

},{}],8:[function(_dereq_,module,exports){
(function() {
  var __hasProp = {}.hasOwnProperty;

  module.exports = {
    get: function(url, options) {
      if (options == null) {
        options = {};
      }
      return this._sendRequest('GET', url, options);
    },
    post: function(url, options) {
      if (options == null) {
        options = {};
      }
      return this._sendRequest('POST', url, options);
    },
    put: function(url, options) {
      if (options == null) {
        options = {};
      }
      return this._sendRequest('PUT', url, options);
    },
    _promise: function() {
      return {
        done: function(fn) {
          return this.callDone = fn;
        },
        callDone: null,
        fail: function(fn) {
          return this.callFail = fn;
        },
        callFail: null,
        always: function(fn) {
          return this.callAlways = fn;
        },
        callAlways: null
      };
    },
    _sendRequest: function(method, url, options) {
      var header, promise, value, xhr, _ref;
      if (options == null) {
        options = {};
      }
      promise = this._promise();
      if (options.headers == null) {
        options.headers = {};
      }
      xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        var _ref;
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (promise.callAlways != null) {
            promise.callAlways(xhr);
          }
          if ((200 <= (_ref = xhr.status) && _ref <= 206)) {
            if (promise.callDone != null) {
              return promise.callDone(xhr);
            }
          } else {
            if (promise.callFail != null) {
              return promise.callFail(xhr);
            }
          }
        }
      };
      xhr.open(method, url, true);
      xhr.setRequestHeader("Content-type", "application/json");
      _ref = options.headers;
      for (header in _ref) {
        if (!__hasProp.call(_ref, header)) continue;
        value = _ref[header];
        xhr.setRequestHeader(header, value);
      }
      xhr.send(options.data);
      return promise;
    }
  };

}).call(this);

},{}],9:[function(_dereq_,module,exports){
(function(){module.exports={generateID:function(t){var n,r;for(t=null!=t&&t>0?t-1:7,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",r=n.charAt(Math.floor(52*Math.random()));t--;)r+=n.charAt(Math.floor(Math.random()*n.length));return r},setResetTimeout:function(){var t;return t=null,function(n,r,e){return null!=t&&(null!=e&&e(),clearTimeout(t)),t=setTimeout(function(){return t=null,r()},n)}}()}}).call(this);
},{}],10:[function(_dereq_,module,exports){
(function (global){
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.Pagination=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function(){module.exports={generateID:function(t){var n,r;for(t=null!=t&&t>0?t-1:7,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",r=n.charAt(Math.floor(52*Math.random()));t--;)r+=n.charAt(Math.floor(Math.random()*n.length));return r},setResetTimeout:function(){var t;return t=null,function(n,r,e){return null!=t&&(null!=e&&e(),clearTimeout(t)),t=setTimeout(function(){return t=null,r()},n)}}()}}).call(this);
},{}],2:[function(_dereq_,module,exports){
(function (global){
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.jade=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return Array.isArray(val) ? val.map(joinClasses).filter(nulls).join(' ') : val;
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};

/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  var result = String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str = str || _dereq_('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

},{"fs":2}],2:[function(_dereq_,module,exports){

},{}]},{},[1])
(1)
});
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(_dereq_,module,exports){
var $, Backbone, Pagination, tpl, util,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

$ = _dereq_('jquery');

util = _dereq_('funcky.util');

tpl = _dereq_('./main.jade');


/*
Create a pagination view.
@class
@extends Backbone.View
 */

Pagination = (function(_super) {
  __extends(Pagination, _super);

  function Pagination() {
    return Pagination.__super__.constructor.apply(this, arguments);
  }

  Pagination.prototype.tagName = 'ul';

  Pagination.prototype.className = 'hibb-pagination';


  /*
  	@constructs
  	@param {object} this.options
  	@prop {number} options.resultsTotal - Total number of results.
  	@prop {number} options.resultsPerPage - Number of results per page.
  	@prop {number} [options.resultsStart=0] - The result item to start at. Not the start page!
  	@prop {boolean} [options.step10=true] - Render (<< and >>) for steps of 10.
  	@prop {boolean} [options.triggerPageNumber=true] - Trigger the new pageNumber (true) or prev/next (false).
   */

  Pagination.prototype.initialize = function(options) {
    var _base, _base1;
    this.options = options;
    if ((_base = this.options).step10 == null) {
      _base.step10 = true;
    }
    if ((_base1 = this.options).triggerPageNumber == null) {
      _base1.triggerPageNumber = true;
    }
    this._currentPageNumber = (this.options.resultsStart != null) && this.options.resultsStart > 0 ? (this.options.resultsStart / this.options.resultsPerPage) + 1 : 1;
    return this.setPageNumber(this._currentPageNumber, true);
  };

  Pagination.prototype.render = function() {
    var attrs;
    this._pageCount = Math.ceil(this.options.resultsTotal / this.options.resultsPerPage);
    attrs = $.extend(this.options, {
      currentPageNumber: this._currentPageNumber,
      pageCount: this._pageCount
    });
    this.el.innerHTML = tpl(attrs);
    if (this._pageCount <= 1) {
      this.$el.hide();
    }
    return this;
  };

  Pagination.prototype.events = function() {
    return {
      'click li.prev10.active': '_handlePrev10',
      'click li.prev.active': '_handlePrev',
      'click li.next.active': '_handleNext',
      'click li.next10.active': '_handleNext10',
      'click li.current:not(.active)': '_handleCurrentClick',
      'blur li.current.active input': '_handleBlur',
      'keyup li.current.active input': '_handleKeyup'
    };
  };

  Pagination.prototype._handlePrev10 = function() {
    return this.setPageNumber(this._currentPageNumber - 10);
  };

  Pagination.prototype._handlePrev = function() {
    return this.setPageNumber(this._currentPageNumber - 1);
  };

  Pagination.prototype._handleNext = function() {
    return this.setPageNumber(this._currentPageNumber + 1);
  };

  Pagination.prototype._handleNext10 = function() {
    return this.setPageNumber(this._currentPageNumber + 10);
  };

  Pagination.prototype._handleCurrentClick = function(ev) {
    var input, span, target;
    target = this.$(ev.currentTarget);
    span = target.find('span');
    input = target.find('input');
    input.width(span.width());
    target.addClass('active');
    input.animate({
      width: 40
    }, 'fast');
    input.focus();
    return input.val(this._currentPageNumber);
  };

  Pagination.prototype._handleKeyup = function(ev) {
    var input, newPageNumber;
    input = this.$(ev.currentTarget);
    newPageNumber = +input.val();
    if (ev.keyCode === 13) {
      if ((1 <= newPageNumber && newPageNumber <= this._pageCount)) {
        this.setPageNumber(newPageNumber);
      }
      return this._deactivateCurrentLi(input);
    }
  };

  Pagination.prototype._handleBlur = function(ev) {
    return this._deactivateCurrentLi(this.$(ev.currentTarget));
  };

  Pagination.prototype._deactivateCurrentLi = function(input) {
    return input.animate({
      width: 0
    }, 'fast', function() {
      var li;
      li = input.parent();
      return li.removeClass('active');
    });
  };


  /*
  	@method getCurrentPageNumber
  	@returns {number}
   */

  Pagination.prototype.getCurrentPageNumber = function() {
    return this._currentPageNumber;
  };


  /*
  	@method setPageNumber
  	@param {number} pageNumber
  	@param {boolean} [silent=false]
   */

  Pagination.prototype.setPageNumber = function(pageNumber, silent) {
    var direction;
    if (silent == null) {
      silent = false;
    }
    if (!this.triggerPageNumber) {
      direction = pageNumber < this._currentPageNumber ? 'prev' : 'next';
      this.trigger(direction);
    }
    this._currentPageNumber = pageNumber;
    this.render();
    if (!silent) {
      return util.setResetTimeout(500, (function(_this) {
        return function() {
          return _this.trigger('change:pagenumber', pageNumber);
        };
      })(this));
    }
  };

  Pagination.prototype.destroy = function() {
    return this.remove();
  };

  return Pagination;

})(Backbone.View);

module.exports = Pagination;



},{"./main.jade":4,"funcky.util":1}],4:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (step10, pageCount, currentPageNumber, showPageNames) {
if ( (step10 && pageCount >= 10))
{
buf.push("<li" + (jade.cls(['prev10',currentPageNumber>10?'active':''], [null,true])) + ">&laquo;</li>");
}
buf.push("<li" + (jade.cls(['prev',currentPageNumber>1?'active':''], [null,true])) + ">&lsaquo;</li>");
if ( (showPageNames != null))
{
buf.push("<li class=\"pageNameSingular\">" + (jade.escape(null == (jade_interp = showPageNames[0]) ? "" : jade_interp)) + "</li>");
}
buf.push("<li class=\"current\"><input type=\"text\"" + (jade.attr("value", currentPageNumber, true, false)) + "/><span>" + (jade.escape(null == (jade_interp = currentPageNumber) ? "" : jade_interp)) + "</span></li><li class=\"text\">of</li><li class=\"pagecount\">" + (jade.escape(null == (jade_interp = pageCount) ? "" : jade_interp)) + "</li>");
if ( (showPageNames != null))
{
buf.push("<li class=\"pageNamePlural\">" + (jade.escape(null == (jade_interp = showPageNames[1]) ? "" : jade_interp)) + "</li>");
}
buf.push("<li" + (jade.cls(['next',currentPageNumber<pageCount?'active':''], [null,true])) + ">&rsaquo;</li>");
if ( (step10 && pageCount >= 10))
{
buf.push("<li" + (jade.cls(['next10',currentPageNumber<=pageCount-10?'active':''], [null,true])) + ">&raquo;</li>");
}}.call(this,"step10" in locals_for_with?locals_for_with.step10:typeof step10!=="undefined"?step10:undefined,"pageCount" in locals_for_with?locals_for_with.pageCount:typeof pageCount!=="undefined"?pageCount:undefined,"currentPageNumber" in locals_for_with?locals_for_with.currentPageNumber:typeof currentPageNumber!=="undefined"?currentPageNumber:undefined,"showPageNames" in locals_for_with?locals_for_with.showPageNames:typeof showPageNames!=="undefined"?showPageNames:undefined));;return buf.join("");
};
},{"jade/runtime":2}]},{},[3])
(3)
});
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(_dereq_,module,exports){
(function (global){
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.jade=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return (Array.isArray(val) ? val.map(joinClasses) :
    (val && typeof val === 'object') ? Object.keys(val).filter(function (key) { return val[key]; }) :
    [val]).filter(nulls).join(' ');
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};


exports.style = function (val) {
  if (val && typeof val === 'object') {
    return Object.keys(val).map(function (style) {
      return style + ':' + val[style];
    }).join(';');
  } else {
    return val;
  }
};
/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if (key === 'style') {
    val = exports.style(val);
  }
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    if (JSON.stringify(val).indexOf('&') !== -1) {
      console.warn('Since Jade 2.0.0, ampersands (`&`) in data attributes ' +
                   'will be escaped to `&amp;`');
    };
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will eliminate the double quotes around dates in ' +
                   'ISO form after 2.0.0');
    }
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will stringify dates in ISO form after 2.0.0');
    }
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will stringify dates in ISO form after 2.0.0');
    }
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  var result = String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str = str || _dereq_('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

},{"fs":2}],2:[function(_dereq_,module,exports){

},{}]},{},[1])(1)
});
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"fs":2}],12:[function(_dereq_,module,exports){
var Backbone, ListOptions, Models, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

_ = _dereq_('underscore');

Models = {
  Option: _dereq_('../models/facets/list.option.coffee')
};

ListOptions = (function(_super) {
  __extends(ListOptions, _super);

  function ListOptions() {
    return ListOptions.__super__.constructor.apply(this, arguments);
  }

  ListOptions.prototype.model = Models.Option;

  ListOptions.prototype.initialize = function() {
    return this.comparator = this.strategies.amount_desc;
  };

  ListOptions.prototype.revert = function() {
    this.comparator = this.strategies.amount_desc;
    return this.each((function(_this) {
      return function(option) {
        return option.set('checked', false, {
          silent: true
        });
      };
    })(this));
  };

  ListOptions.prototype.updateOptions = function(newOptions) {
    if (newOptions == null) {
      newOptions = [];
    }
    this.each((function(_this) {
      return function(option) {
        return option.set('count', 0, {
          silent: true
        });
      };
    })(this));
    _.each(newOptions, (function(_this) {
      return function(newOption) {
        var opt;
        opt = _this.get(newOption.name);
        if (opt != null) {
          return opt.set('count', newOption.count, {
            silent: true
          });
        } else {
          opt = new Models.Option(newOption);
          return _this.add(opt);
        }
      };
    })(this));
    return this.sort();
  };

  ListOptions.prototype.strategies = {
    alpha_asc: function(model) {
      return +(!model.get('visible')) + (+(!model.get('count')) + model.get('name'));
    },
    alpha_desc: function(model) {
      var str;
      str = String.fromCharCode.apply(String, _.map(model.get('name').split(''), function(c) {
        return 0xffff - c.charCodeAt();
      }));
      return +(!model.get('visible')) + (+(!model.get('count')) + str);
    },
    amount_asc: function(model) {
      var cnt, tmp;
      tmp = model.get('visible') ? 0 : 10;
      tmp += +(!model.get('count'));
      cnt = model.get('count') === 0 ? model.get('total') : model.get('count');
      return tmp -= 1 / cnt;
    },
    amount_desc: function(model) {
      var cnt, tmp;
      tmp = model.get('visible') ? 0 : 10;
      tmp += +(!model.get('count'));
      cnt = model.get('count') === 0 ? model.get('total') : model.get('count');
      return tmp += 1 / cnt;
    }
  };

  ListOptions.prototype.orderBy = function(strategy, silent) {
    if (silent == null) {
      silent = false;
    }
    this.comparator = this.strategies[strategy];
    return this.sort({
      silent: silent
    });
  };

  ListOptions.prototype.setAllVisible = function() {
    this.each(function(model) {
      return model.set('visible', true);
    });
    return this.sort();
  };

  return ListOptions;

})(Backbone.Collection);

module.exports = ListOptions;



},{"../models/facets/list.option.coffee":19}],13:[function(_dereq_,module,exports){
var Backbone, SearchResult, SearchResults, funcky, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

_ = _dereq_('underscore');

SearchResult = _dereq_('../models/searchresult');

funcky = _dereq_('funcky.req');


/*
@class
 */

SearchResults = (function(_super) {
  __extends(SearchResults, _super);

  function SearchResults() {
    return SearchResults.__super__.constructor.apply(this, arguments);
  }

  SearchResults.prototype.model = SearchResult;


  /*
  	@constructs
  	@param {object[]} models
  	@param {object} options
  	@param {Backbone.Model} options.config
   */

  SearchResults.prototype.initialize = function(models, options) {
    this.config = options.config;
    return this.cachedModels = {};
  };

  SearchResults.prototype.clearCache = function() {
    return this.cachedModels = {};
  };

  SearchResults.prototype.getCurrent = function() {
    return this._current;
  };

  SearchResults.prototype._setCurrent = function(_current, changeMessage) {
    this._current = _current;
    return this.trigger(changeMessage, this._current);
  };


  /*
  	Add the latest search result model to a collection for caching.
  
  	@method
  	@param {string} url - Base location of the resultModel. Is used to fetch parts of the result which are not prev or next but at a different place (for example: row 100 - 110) in the result set.
  	@param {object} attrs - The properties/attributes of the resultModel.
  	@param {string} cacheId - The ID to file the props/attrs under for caching.
  	@param {string} changeMessage - The event message to trigger.
   */

  SearchResults.prototype._addModel = function(url, attrs, cacheId, changeMessage) {
    attrs.location = url;
    this.cachedModels[cacheId] = new this.model(attrs);
    this.add(this.cachedModels[cacheId]);
    return this._setCurrent(this.cachedModels[cacheId], changeMessage);
  };


  /*
  	@method
  	@param {object} queryOptions
  	@param {object} [options={}]
  	@param {boolean} options.cache - Determines if the result can be fetched from the cachedModels (searchResult models). In case of a reset or a refresh, options.cache is set to false.
   */

  SearchResults.prototype.runQuery = function(queryOptions, options) {
    var changeMessage, queryOptionsString;
    if (options == null) {
      options = {};
    }
    if (options.cache == null) {
      options.cache = true;
    }
    changeMessage = 'change:results';
    queryOptionsString = JSON.stringify(queryOptions);
    if (options.cache && this.cachedModels.hasOwnProperty(queryOptionsString)) {
      return this._setCurrent(this.cachedModels[queryOptionsString], changeMessage);
    } else {
      return this.postQuery(queryOptions, (function(_this) {
        return function(url) {
          var getUrl;
          getUrl = "" + url + "?rows=" + (_this.config.get('resultRows'));
          return _this.getResults(getUrl, function(response) {
            return _this._addModel(url, response, queryOptionsString, changeMessage);
          });
        };
      })(this));
    }
  };

  SearchResults.prototype.moveCursor = function(direction) {
    var changeMessage, url;
    url = direction === '_prev' || direction === '_next' ? this._current.get(direction) : direction;
    changeMessage = 'change:cursor';
    if (url != null) {
      if (this.cachedModels.hasOwnProperty(url)) {
        return this._setCurrent(this.cachedModels[url], changeMessage);
      } else {
        return this.getResults(url, (function(_this) {
          return function(response) {
            return _this._addModel(_this._current.get('location'), response, url, changeMessage);
          };
        })(this));
      }
    }
  };

  SearchResults.prototype.page = function(pagenumber, database) {
    var changeMessage, start, url;
    changeMessage = 'change:page';
    start = this.config.get('resultRows') * (pagenumber - 1);
    url = this._current.get('location') + ("?rows=" + (this.config.get('resultRows')) + "&start=" + start);
    if (database != null) {
      url += "&database=" + database;
    }
    if (this.cachedModels.hasOwnProperty(url)) {
      return this._setCurrent(this.cachedModels[url], changeMessage);
    } else {
      return this.getResults(url, (function(_this) {
        return function(response) {
          return _this._addModel(_this._current.get('location'), response, url, changeMessage);
        };
      })(this));
    }
  };

  SearchResults.prototype.postQuery = function(queryOptions, done) {
    var ajaxOptions, req;
    this.trigger('request');
    ajaxOptions = {
      data: JSON.stringify(queryOptions)
    };
    if (this.config.has('authorizationHeaderToken')) {
      ajaxOptions.headers = {
        Authorization: this.config.get('authorizationHeaderToken')
      };
    }
    if (this.config.has('requestOptions')) {
      _.extend(ajaxOptions, this.config.get('requestOptions'));
    }
    req = funcky.post(this.config.get('baseUrl') + this.config.get('searchPath'), ajaxOptions);
    req.done((function(_this) {
      return function(res) {
        if (res.status === 201) {
          return done(res.getResponseHeader('Location'));
        }
      };
    })(this));
    return req.fail((function(_this) {
      return function(res) {
        if (res.status === 401) {
          return _this.trigger('unauthorized');
        } else {
          _this.trigger('request:failed', res);
          throw new Error('Failed posting FacetedSearch queryOptions to the server!', res);
        }
      };
    })(this));
  };

  SearchResults.prototype.getResults = function(url, done) {
    var options, req;
    this.trigger('request');
    if (this.config.has('authorizationHeaderToken')) {
      options = {
        headers: {
          Authorization: this.config.get('authorizationHeaderToken')
        }
      };
    }
    req = funcky.get(url, options);
    req.done((function(_this) {
      return function(res) {
        done(JSON.parse(res.responseText));
        return _this.trigger('sync');
      };
    })(this));
    return req.fail((function(_this) {
      return function(res) {
        if (res.status === 401) {
          return _this.trigger('unauthorized');
        } else {
          _this.trigger('request:failed', res);
          throw new Error('Failed getting FacetedSearch results from the server!', res);
        }
      };
    })(this));
  };

  return SearchResults;

})(Backbone.Collection);

module.exports = SearchResults;



},{"../models/searchresult":23,"funcky.req":8}],14:[function(_dereq_,module,exports){
var Backbone, Config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

Config = (function(_super) {
  __extends(Config, _super);

  function Config() {
    return Config.__super__.constructor.apply(this, arguments);
  }


  /*
  	@prop {object} [facetTitleMap={}] - Map of facet names, mapping to facet titles. Use this map to give user friendly display names to facets in case the server doesn't give them.
  	@prop {string[]} [facetOrder=[]] - Define the rendering order of the facets. If undefined, the facets are rendered in the order returned by the backend.
  	@prop {boolean} [results=false] - Render the results. When kept to false, the showing of the results has to be taken care of in the application.
  	@prop {string} [termSingular="entry"] - Name of one result, for example: book, woman, country, alumnus, etc.
  	@prop {string} [termPlural="entries"] - Name of multiple results, for example: books, women, countries, alunmi, etc.
  	@prop {boolean} [sortLevels=true] - Render sort levels in the results header
  	@prop {boolean} [showMetadata=true] - Render show metadata toggle in the results header
  
  	@prop {object} [textSearchOptions] - Options that are passed to the text search component
  	@prop {boolean} [textSearchOptions.caseSensitive=false] - Render caseSensitive option?
  	@prop {boolean} [textSearchOptions.fuzzy=false] - Render fuzzy option?
  	@prop {object[]} [textSearchOptions.fullTextSearchParameters] - Objects passed have a name and term attribute. Used for searching multiple fields.
   */

  Config.prototype.defaults = function() {
    return {
      resultRows: 10,
      baseUrl: '',
      searchPath: '',
      textSearch: 'advanced',
      textSearchOptions: {
        caseSensitive: false,
        fuzzy: false
      },
      labels: {
        fullTextSearchFields: "Search in",
        numFound: "Found",
        filterOptions: "Filter options",
        sortAlphabetically: "Sort alphabetically",
        sortNumerically: "Sort numerically"
      },
      authorizationHeaderToken: null,
      queryOptions: {},
      facetTitleMap: {},
      facetOrder: [],
      templates: {},
      autoSearch: true,
      requestOptions: {},
      results: false,
      sortLevels: true,
      showMetadata: true,
      termSingular: 'entry',
      termPlural: 'entries',
      entryMetadataFields: [],
      levels: []
    };
  };

  return Config;

})(Backbone.Model);

module.exports = Config;



},{}],15:[function(_dereq_,module,exports){
var $, Backbone, Config, MainView, QueryOptions, SearchResults, Views, assert, funcky, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

$ = _dereq_('jquery');

Backbone.$ = $;

assert = _dereq_('assert');

_ = _dereq_('underscore');

funcky = _dereq_('funcky.el').el;

Config = _dereq_('./config');

QueryOptions = _dereq_('./models/query-options');

SearchResults = _dereq_('./collections/searchresults');

Views = {
  TextSearch: _dereq_('./views/text-search'),
  Facets: _dereq_('./views/facets'),
  Results: _dereq_('./views/results'),
  ListFacet: _dereq_('./views/facets/list')
};

tpl = _dereq_('../jade/main.jade');

MainView = (function(_super) {
  __extends(MainView, _super);

  function MainView() {
    return MainView.__super__.constructor.apply(this, arguments);
  }

  MainView.prototype.initialize = function(options) {
    if (options == null) {
      options = {};
    }
    if (options.facetViewMap != null) {
      this.facetViewMap = _.clone(options.facetViewMap);
      delete options.facetViewMap;
    }
    this.extendConfig(options);
    if (this.config.get('textSearch') === 'simple' || this.config.get('textSearch') === 'advanced') {
      this.initTextSearch();
    }
    this.initQueryOptions();
    this.initSearchResults();
    this.render();
    if (this.config.get('development')) {
      this.searchResults.add(JSON.parse(localStorage.getItem('faceted-search-dev-model')));
      this.searchResults.cachedModels['{"facetValues":[],"sortParameters":[]}'] = this.searchResults.first();
      return setTimeout(((function(_this) {
        return function() {
          return _this.$('.overlay').hide();
        };
      })(this)), 100);
    }
  };

  MainView.prototype.render = function() {
    if (this.config.get('templates').hasOwnProperty('main')) {
      tpl = this.config.get('templates').main;
    }
    this.el.innerHTML = tpl();
    this.initFacets(this.facetViewMap);
    this.$('.faceted-search').addClass("search-type-" + (this.config.get('textSearch')));
    this.renderTextSearch();
    if (this.config.get('results')) {
      this.renderResults();
    }
    return this;
  };

  MainView.prototype.initTextSearch = function() {
    this.textSearch = new Views.TextSearch({
      config: this.config
    });
    this.listenTo(this.textSearch, 'change', (function(_this) {
      return function(queryOptions) {
        return _this.queryOptions.set(queryOptions, {
          silent: true
        });
      };
    })(this));
    return this.listenTo(this.textSearch, 'search', (function(_this) {
      return function() {
        return _this.search();
      };
    })(this));
  };

  MainView.prototype.renderTextSearch = function() {
    var textSearchPlaceholder;
    if (this.textSearch == null) {
      return;
    }
    this.textSearch.render();
    textSearchPlaceholder = this.el.querySelector('.text-search-placeholder');
    return textSearchPlaceholder.parentNode.replaceChild(this.textSearch.el, textSearchPlaceholder);
  };

  MainView.prototype.renderResults = function() {
    this.$el.addClass('with-results');
    this.results = new Views.Results({
      el: this.$('.results'),
      config: this.config,
      searchResults: this.searchResults
    });
    this.listenTo(this.results, 'result:click', function(data) {
      return this.trigger('result:click', data);
    });
    this.listenTo(this.results, 'result:layer-click', function(layer, data) {
      return this.trigger('result:layer-click', layer, data);
    });
    return this.listenTo(this.results, 'change:sort-levels', function(sortParameters) {
      return this.sortResultsBy(sortParameters);
    });
  };

  MainView.prototype.events = function() {
    return {
      'click ul.facets-menu li.collapse-expand': function(ev) {
        return this.facets.toggle(ev);
      },
      'click ul.facets-menu li.reset': 'onReset',
      'click ul.facets-menu li.switch button': 'onSwitchType'
    };
  };

  MainView.prototype.onSwitchType = function(ev) {
    var textSearch;
    ev.preventDefault();
    textSearch = this.config.get('textSearch') === 'advanced' ? 'simple' : 'advanced';
    this.config.set({
      textSearch: textSearch
    });
    this.$('.faceted-search').toggleClass('search-type-simple');
    this.$('.faceted-search').toggleClass('search-type-advanced');
    if (this.searchResults.length === 1) {
      return this.search();
    } else if (this.searchResults.length > 1) {
      return this.update();
    }
  };

  MainView.prototype.onReset = function(ev) {
    ev.preventDefault();
    return this.reset();
  };

  MainView.prototype.destroy = function() {
    if (this.facets != null) {
      this.facets.destroy();
    }
    if (this.textSearch != null) {
      this.textSearch.destroy();
    }
    if (this.results != null) {
      this.results.destroy();
    }
    return this.remove();
  };

  MainView.prototype.extendConfig = function(options) {
    var key, toBeExtended, value;
    toBeExtended = {
      facetTitleMap: null,
      textSearchOptions: null,
      labels: null
    };
    for (key in toBeExtended) {
      value = toBeExtended[key];
      toBeExtended[key] = options[key];
      delete options[key];
    }
    this.config = new Config(options);
    for (key in toBeExtended) {
      value = toBeExtended[key];
      this.config.set(key, _.extend(this.config.get(key), value));
    }
    if (['none', 'simple', 'advanced'].indexOf(this.config.get('textSearch')) === -1) {
      this.config.set({
        textSearch: 'advanced'
      });
    }
    return this.listenTo(this.config, 'change:resultRows', (function(_this) {
      return function() {
        return _this.refresh();
      };
    })(this));
  };

  MainView.prototype.initQueryOptions = function() {
    var attrs;
    attrs = _.extend(this.config.get('queryOptions'), this.textSearch.model.attributes);
    delete attrs.term;
    this.queryOptions = new QueryOptions(attrs);
    if (this.config.get('autoSearch')) {
      return this.listenTo(this.queryOptions, 'change', (function(_this) {
        return function() {
          return _this.search();
        };
      })(this));
    }
  };

  MainView.prototype.initSearchResults = function() {
    this.searchResults = new SearchResults(null, {
      config: this.config
    });
    this.listenToOnce(this.searchResults, 'change:results', (function(_this) {
      return function(responseModel) {
        var textSearchOptions;
        if (responseModel.has('fullTextSearchFields')) {
          textSearchOptions = _.clone(_this.config.get('textSearchOptions'));
          textSearchOptions.fullTextSearchParameters = responseModel.get('fullTextSearchFields');
          return _this.config.set({
            textSearchOptions: textSearchOptions
          });
        }
      };
    })(this));
    this.listenTo(this.searchResults, 'change:results', (function(_this) {
      return function(responseModel) {
        if (_this.config.get('textSearch') !== 'simple') {
          _this.update();
        }
        return _this.trigger('change:results', responseModel);
      };
    })(this));
    this.listenTo(this.searchResults, 'change:cursor', (function(_this) {
      return function(responseModel) {
        return _this.trigger('change:results', responseModel);
      };
    })(this));
    this.listenTo(this.searchResults, 'change:page', (function(_this) {
      return function(responseModel, database) {
        return _this.trigger('change:page', responseModel, database);
      };
    })(this));
    this.listenTo(this.searchResults, 'request', (function(_this) {
      return function() {
        return _this.showLoader();
      };
    })(this));
    this.listenTo(this.searchResults, 'sync', (function(_this) {
      return function() {
        return _this.hideLoader();
      };
    })(this));
    this.listenTo(this.searchResults, 'unauthorized', (function(_this) {
      return function() {
        return _this.trigger('unauthorized');
      };
    })(this));
    return this.listenTo(this.searchResults, 'request:failed', (function(_this) {
      return function(res) {
        return _this.trigger('request:failed', res);
      };
    })(this));
  };

  MainView.prototype.initFacets = function(viewMap) {
    var facetsPlaceholder;
    if (viewMap == null) {
      viewMap = {};
    }
    this.facets = new Views.Facets({
      viewMap: viewMap,
      config: this.config
    });
    facetsPlaceholder = this.el.querySelector('.facets-placeholder');
    facetsPlaceholder.parentNode.replaceChild(this.facets.el, facetsPlaceholder);
    return this.listenTo(this.facets, 'change', (function(_this) {
      return function(queryOptions, options) {
        return _this.queryOptions.set(queryOptions, options);
      };
    })(this));
  };

  MainView.prototype.showLoader = function() {
    var calc, overlay;
    overlay = this.el.querySelector('.overlay');
    if (overlay.style.display === 'block') {
      return false;
    }
    calc = (function(_this) {
      return function() {
        var facetedSearch, fsBox, left, loader, top;
        facetedSearch = _this.el.querySelector('.faceted-search');
        fsBox = funcky(facetedSearch).boundingBox();
        left = (fsBox.left + fsBox.width / 2 - 12) + 'px';
        top = (fsBox.top + fsBox.height / 2 - 12) + 'px';
        if (fsBox.height > window.innerHeight) {
          top = '50vh';
        }
        loader = overlay.children[0];
        loader.style.left = left;
        loader.style.top = top;
        overlay.style.width = fsBox.width + 'px';
        overlay.style.height = fsBox.height + 'px';
        return overlay.style.display = 'block';
      };
    })(this);
    return setTimeout(calc, 0);
  };

  MainView.prototype.hideLoader = function() {
    return this.el.querySelector('.overlay').style.display = 'none';
  };

  MainView.prototype.update = function() {
    var facets;
    facets = this.searchResults.getCurrent().get('facets');
    if (this.searchResults.length === 1) {
      return this.facets.renderFacets(facets);
    } else if (this.searchResults.length > 1) {
      return this.facets.update(facets);
    }
  };

  MainView.prototype.page = function(pagenumber, database) {
    return this.searchResults.page(pagenumber, database);
  };

  MainView.prototype.next = function() {
    return this.searchResults.moveCursor('_next');
  };

  MainView.prototype.prev = function() {
    return this.searchResults.moveCursor('_prev');
  };

  MainView.prototype.hasNext = function() {
    return this.searchResults.getCurrent().has('_next');
  };

  MainView.prototype.hasPrev = function() {
    return this.searchResults.getCurrent().has('_prev');
  };

  MainView.prototype.sortResultsBy = function(sortParameters) {
    return this.queryOptions.set({
      sortParameters: sortParameters,
      resultFields: _.pluck(sortParameters, 'fieldname')
    });
  };

  MainView.prototype.reset = function(cache) {
    if (cache == null) {
      cache = false;
    }
    if (this.textSearch != null) {
      this.textSearch.reset();
    }
    if (this.results != null) {
      this.results.reset();
    }
    this.facets.reset();
    this.queryOptions.reset();
    if (!cache) {
      this.searchResults.clearCache();
    }
    return this.search({
      cache: cache
    });
  };


  /*
  	A refresh of the Faceted Search means (re)sending the current @attributes (queryOptions) again.
  	We set the cache flag to false, otherwise the searchResults collection will return the cached
  	model, instead of fetching a new one from the server.
  	The newQueryOptions are optional. The can be used to add or update one or more queryOptions
  	before sending the same (or now altered) queryOptions to the server again.
   */

  MainView.prototype.refresh = function(newQueryOptions) {
    if (newQueryOptions == null) {
      newQueryOptions = {};
    }
    if (Object.keys(newQueryOptions).length > 0) {
      this.queryOptions.set(newQueryOptions, {
        silent: true
      });
    }
    return this.search({
      cache: false
    });
  };

  MainView.prototype.search = function(options) {
    return this.searchResults.runQuery(this.queryOptions.attributes, options);
  };


  /*
  	Search for a single value. Programmatic version of a user
  	checking (clicking the checkbox) one value right after init.
  
  	TODO: this is a dirty implementation. Better would be to reset the
  	views, reset and update the queryOptions and run @search.
  
  	@param {string} facetName - Name of the facet.
  	@param {string} value - Value of option to be selected.
  	@param {object} options - Options to pass to @search
   */

  MainView.prototype.searchValue = function(facetName, value, options) {
    var name, view, _ref;
    this.queryOptions.reset();
    _ref = this.facets.views;
    for (name in _ref) {
      view = _ref[name];
      if (view instanceof Views.ListFacet) {
        view.revert();
      }
    }
    assert.ok(this.$(".facet[data-name=\"" + facetName + "\"] li[data-value=\"" + value + "\"]").length > 0, ".facet[data-name=\"" + facetName + "\"] li[data-value=\"" + value + "\"] not found!");
    return this.$(".facet[data-name=\"" + facetName + "\"] li[data-value=\"" + value + "\"]").click();
  };

  return MainView;

})(Backbone.View);

module.exports = MainView;



},{"../jade/main.jade":46,"./collections/searchresults":13,"./config":14,"./models/query-options":21,"./views/facets":24,"./views/facets/list":27,"./views/results":33,"./views/text-search":39,"assert":1,"funcky.el":7}],16:[function(_dereq_,module,exports){
var BooleanFacet, Models,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Models = {
  Facet: _dereq_('./main')
};

BooleanFacet = (function(_super) {
  __extends(BooleanFacet, _super);

  function BooleanFacet() {
    return BooleanFacet.__super__.constructor.apply(this, arguments);
  }

  BooleanFacet.prototype.set = function(attrs, options) {
    if (attrs === 'options') {
      options = this.parseOptions(options);
    } else if (attrs.hasOwnProperty('options')) {
      attrs.options = this.parseOptions(attrs.options);
    }
    return BooleanFacet.__super__.set.call(this, attrs, options);
  };

  BooleanFacet.prototype.parseOptions = function(options) {
    var _ref;
    options = (_ref = this.get('options')) != null ? _ref : options;
    if (options.length === 1) {
      options.push({
        name: (!JSON.parse(options[0].name)).toString(),
        count: 0
      });
    }
    return options;
  };

  return BooleanFacet;

})(Models.Facet);

module.exports = BooleanFacet;



},{"./main":20}],17:[function(_dereq_,module,exports){




},{}],18:[function(_dereq_,module,exports){
var List, Models,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Models = {
  Facet: _dereq_('./main')
};

List = (function(_super) {
  __extends(List, _super);

  function List() {
    return List.__super__.constructor.apply(this, arguments);
  }

  return List;

})(Models.Facet);

module.exports = List;



},{"./main":20}],19:[function(_dereq_,module,exports){
var Backbone, ListOption,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

ListOption = (function(_super) {
  __extends(ListOption, _super);

  function ListOption() {
    return ListOption.__super__.constructor.apply(this, arguments);
  }

  ListOption.prototype.idAttribute = 'name';

  ListOption.prototype.defaults = function() {
    return {
      name: '',
      count: 0,
      total: 0,
      checked: false,
      visible: false
    };
  };

  ListOption.prototype.parse = function(attrs) {
    attrs.total = attrs.count;
    return attrs;
  };

  return ListOption;

})(Backbone.Model);

module.exports = ListOption;



},{}],20:[function(_dereq_,module,exports){
var Backbone, Facet, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

config = _dereq_('../../config');

Facet = (function(_super) {
  __extends(Facet, _super);

  function Facet() {
    return Facet.__super__.constructor.apply(this, arguments);
  }

  Facet.prototype.idAttribute = 'name';

  Facet.prototype.defaults = function() {
    return {
      name: null,
      title: null,
      type: null,
      options: null
    };
  };

  return Facet;

})(Backbone.Model);

module.exports = Facet;



},{"../../config":14}],21:[function(_dereq_,module,exports){
var Backbone, QueryOptions, config, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

_ = _dereq_('underscore');

config = _dereq_('../config');

QueryOptions = (function(_super) {
  __extends(QueryOptions, _super);

  function QueryOptions() {
    return QueryOptions.__super__.constructor.apply(this, arguments);
  }


  /*
  	@prop {object[]} facetValues=[] - Array of objects containing a facet name and values: {name: 'facet_s_writers', values: ['pietje', 'pukje']}
  	@prop {object[]} sortParameters=[] - Array of objects containing fieldname and direction: {fieldname: 'language', direction: 'desc'}
  	@prop {string[]} [resultFields] - List of metadata fields to be returned by the server for every result.
   */

  QueryOptions.prototype.defaults = function() {
    return {
      facetValues: [],
      sortParameters: []
    };
  };


  /*
  	@constructs
  	@param {object} this.initialAttributes - The initial attributes are stored and not mutated, because on reset the original data is needed.
   */

  QueryOptions.prototype.initialize = function(initialAttributes) {
    this.initialAttributes = initialAttributes;
  };

  QueryOptions.prototype.set = function(attrs, options) {
    var facetValues;
    if (attrs.facetValue != null) {
      facetValues = _.reject(this.get('facetValues'), function(data) {
        return data.name === attrs.facetValue.name;
      });
      if (attrs.facetValue.values != null) {
        if (attrs.facetValue.values.length > 0) {
          facetValues.push(attrs.facetValue);
        }
      } else {
        facetValues.push(attrs.facetValue);
      }
      attrs.facetValues = facetValues;
      delete attrs.facetValue;
    }
    return QueryOptions.__super__.set.call(this, attrs, options);
  };

  QueryOptions.prototype.reset = function() {
    this.clear({
      silent: true
    });
    this.set(this.defaults(), {
      silent: true
    });
    return this.set(this.initialAttributes, {
      silent: true
    });
  };

  return QueryOptions;

})(Backbone.Model);

module.exports = QueryOptions;



},{"../config":14}],22:[function(_dereq_,module,exports){
var Backbone, Search, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

_ = _dereq_('underscore');

Search = (function(_super) {
  __extends(Search, _super);

  function Search() {
    return Search.__super__.constructor.apply(this, arguments);
  }

  Search.prototype.defaults = function() {};

  return Search;

})(Backbone.Model);

module.exports = Search;



},{}],23:[function(_dereq_,module,exports){
var Backbone, SearchResult, config, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

_ = _dereq_('underscore');

config = _dereq_('../config');

SearchResult = (function(_super) {
  __extends(SearchResult, _super);

  function SearchResult() {
    return SearchResult.__super__.constructor.apply(this, arguments);
  }

  SearchResult.prototype.defaults = function() {
    return {
      _next: null,
      _prev: null,
      ids: [],
      numFound: null,
      results: [],
      rows: null,
      solrquery: '',
      sortableFields: [],
      start: null,
      facets: []
    };
  };

  return SearchResult;

})(Backbone.Model);

module.exports = SearchResult;



},{"../config":14}],24:[function(_dereq_,module,exports){
var $, Backbone, Facets, assert, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

_ = _dereq_('underscore');

$ = _dereq_('jquery');

assert = _dereq_('assert');

Facets = (function(_super) {
  __extends(Facets, _super);

  function Facets() {
    this.renderFacet = __bind(this.renderFacet, this);
    return Facets.__super__.constructor.apply(this, arguments);
  }

  Facets.prototype.className = 'facets';

  Facets.prototype.viewMap = {
    BOOLEAN: _dereq_('./facets/boolean'),
    DATE: _dereq_('./facets/date'),
    RANGE: _dereq_('./facets/range'),
    LIST: _dereq_('./facets/list')
  };


  /*
  	@constructs
  	@param {object} this.options
  	@param {object} this.options.viewMap
  	@param {Backbone.Model} this.options.config
   */

  Facets.prototype.initialize = function(options) {
    this.options = options;
    _.extend(this.viewMap, this.options.viewMap);
    this.views = {};
    return this.render();
  };

  Facets.prototype.render = function() {
    var tpl;
    if (this.options.config.get('templates').hasOwnProperty('facets')) {
      tpl = this.options.config.get('templates').facets;
      this.el.innerHTML = tpl();
    }
    return this;
  };

  Facets.prototype.renderFacets = function(data) {
    var facet, facetData, facetName, facets, fragment, index, placeholder, _i, _j, _len, _len1, _ref;
    this.destroyFacets();
    if (this.options.config.get('templates').hasOwnProperty('facets')) {
      for (index = _i = 0, _len = data.length; _i < _len; index = ++_i) {
        facetData = data[index];
        if (this.viewMap.hasOwnProperty(facetData.type)) {
          placeholder = this.el.querySelector("." + facetData.name + "-placeholder");
          if (placeholder != null) {
            placeholder.parentNode.replaceChild(this.renderFacet(facetData).el, placeholder);
          }
        }
      }
    } else {
      facets = new Backbone.Collection(data, {
        model: Backbone.Model.extend({
          idAttribute: 'name'
        })
      });
      if (this.options.config.get('facetOrder').length === 0) {
        this.options.config.set({
          facetOrder: facets.pluck('name')
        });
      }
      fragment = document.createDocumentFragment();
      _ref = this.options.config.get('facetOrder');
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        facetName = _ref[_j];
        assert.ok(facets.get(facetName) != null, "FacetedSearch :: config.facetOrder : Unknown facet name: \"" + facetName + "\"!");
        facet = facets.get(facetName);
        if (this.viewMap.hasOwnProperty(facet.get('type'))) {
          fragment.appendChild(this.renderFacet(facet.attributes).el);
        } else {
          console.error('Unknown facetView', facet.get('type'));
        }
      }
      this.el.innerHTML = '';
      this.el.appendChild(fragment);
      this._postRenderFacets();
    }
    return this;
  };

  Facets.prototype.renderFacet = function(facetData) {
    var View;
    if (_.isString(facetData)) {
      facetData = _.findWhere(this.searchResults.first().get('facets'), {
        name: facetData
      });
    }
    View = this.viewMap[facetData.type];
    this.views[facetData.name] = new View({
      attrs: facetData,
      config: this.options.config
    });
    this.listenTo(this.views[facetData.name], 'change', (function(_this) {
      return function(queryOptions, options) {
        if (options == null) {
          options = {};
        }
        return _this.trigger('change', queryOptions, options);
      };
    })(this));
    return this.views[facetData.name];
  };

  Facets.prototype._postRenderFacets = function() {
    var facetName, view, _ref, _results;
    _ref = this.views;
    _results = [];
    for (facetName in _ref) {
      view = _ref[facetName];
      _results.push(view.postRender());
    }
    return _results;
  };

  Facets.prototype.update = function(facetData) {
    var data, options, view, viewName, _ref, _results;
    _ref = this.views;
    _results = [];
    for (viewName in _ref) {
      if (!__hasProp.call(_ref, viewName)) continue;
      view = _ref[viewName];
      data = _.findWhere(facetData, {
        name: viewName
      });
      options = data != null ? data.options : [];
      _results.push(view.update(options));
    }
    return _results;
  };

  Facets.prototype.reset = function() {
    var facetView, key, _ref, _results;
    _ref = this.views;
    _results = [];
    for (key in _ref) {
      if (!__hasProp.call(_ref, key)) continue;
      facetView = _ref[key];
      if (typeof facetView.reset === 'function') {
        _results.push(facetView.reset());
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  Facets.prototype.destroyFacets = function() {
    var view, viewName, _ref, _results;
    this.stopListening();
    _ref = this.views;
    _results = [];
    for (viewName in _ref) {
      if (!__hasProp.call(_ref, viewName)) continue;
      view = _ref[viewName];
      view.destroy();
      _results.push(delete this.views[viewName]);
    }
    return _results;
  };

  Facets.prototype.destroy = function() {
    this.destroyFacets();
    return this.remove();
  };

  Facets.prototype.toggle = function(ev) {
    var facetNames, icon, index, open, slideFacet, span, text;
    ev.preventDefault();
    icon = $(ev.currentTarget).find('i.fa');
    span = $(ev.currentTarget).find('span');
    open = icon.hasClass('fa-expand');
    icon.toggleClass('fa-compress');
    icon.toggleClass('fa-expand');
    text = open ? 'Collapse' : 'Expand';
    span.text("" + text + " filters");
    facetNames = _.keys(this.views);
    index = 0;
    slideFacet = (function(_this) {
      return function() {
        var facet, facetName;
        facetName = facetNames[index++];
        facet = _this.views[facetName];
        if (facet != null) {
          if (open) {
            return facet.showBody(function() {
              return slideFacet();
            });
          } else {
            return facet.hideBody(function() {
              return slideFacet();
            });
          }
        }
      };
    })(this);
    return slideFacet();
  };

  return Facets;

})(Backbone.View);

module.exports = Facets;



},{"./facets/boolean":25,"./facets/date":26,"./facets/list":27,"./facets/range":31,"assert":1}],25:[function(_dereq_,module,exports){
var $, BooleanFacet, Models, Views, bodyTpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

$ = _dereq_('jquery');

_ = _dereq_('underscore');

Models = {
  Boolean: _dereq_('../../models/facets/boolean')
};

Views = {
  Facet: _dereq_('./main')
};

bodyTpl = _dereq_('../../../jade/facets/boolean.body.jade');

BooleanFacet = (function(_super) {
  __extends(BooleanFacet, _super);

  function BooleanFacet() {
    return BooleanFacet.__super__.constructor.apply(this, arguments);
  }

  BooleanFacet.prototype.className = 'facet boolean';

  BooleanFacet.prototype.initialize = function(options) {
    BooleanFacet.__super__.initialize.apply(this, arguments);
    this.model = new Models.Boolean(options.attrs, {
      parse: true
    });
    this.listenTo(this.model, 'change:options', this.render);
    return this.render();
  };

  BooleanFacet.prototype.render = function() {
    var rtpl;
    BooleanFacet.__super__.render.apply(this, arguments);
    rtpl = bodyTpl(_.extend(this.model.attributes, {
      ucfirst: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
    }));
    this.$('.body').html(rtpl);
    this.$('header i.fa').remove();
    return this;
  };

  BooleanFacet.prototype.events = function() {
    return _.extend({}, BooleanFacet.__super__.events.apply(this, arguments), {
      'click i': 'checkChanged',
      'click label': 'checkChanged'
    });
  };

  BooleanFacet.prototype.checkChanged = function(ev) {
    var $target, option, value, _i, _len, _ref;
    $target = ev.currentTarget.tagName === 'LABEL' ? this.$('i[data-value="' + ev.currentTarget.getAttribute('data-value') + '"]') : $(ev.currentTarget);
    $target.toggleClass('fa-square-o');
    $target.toggleClass('fa-check-square-o');
    value = $target.attr('data-value');
    _ref = this.model.get('options');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      if (option.name === value) {
        option.checked = $target.hasClass('fa-check-square-o');
      }
    }
    return this.trigger('change', {
      facetValue: {
        name: this.model.get('name'),
        values: _.map(this.$('i.fa-check-square-o'), function(cb) {
          return cb.getAttribute('data-value');
        })
      }
    });
  };

  BooleanFacet.prototype.update = function(newOptions) {
    return this.model.set('options', newOptions);
  };

  BooleanFacet.prototype.reset = function() {
    return this.render();
  };

  return BooleanFacet;

})(Views.Facet);

module.exports = BooleanFacet;



},{"../../../jade/facets/boolean.body.jade":40,"../../models/facets/boolean":16,"./main":29}],26:[function(_dereq_,module,exports){
var DateFacet, Models, Views, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Models = {
  Date: _dereq_('../../models/facets/date')
};

Views = {
  Facet: _dereq_('./main')
};

tpl = _dereq_('../../../jade/facets/date.jade');

DateFacet = (function(_super) {
  __extends(DateFacet, _super);

  function DateFacet() {
    return DateFacet.__super__.constructor.apply(this, arguments);
  }

  DateFacet.prototype.className = 'facet date';

  DateFacet.prototype.initialize = function(options) {
    DateFacet.__super__.initialize.apply(this, arguments);
    this.model = new Models.Date(options.attrs, {
      parse: true
    });
    this.listenTo(this.model, 'change:options', this.render);
    return this.render();
  };

  DateFacet.prototype.render = function() {
    var rtpl;
    DateFacet.__super__.render.apply(this, arguments);
    rtpl = tpl(_.extend(this.model.attributes, {
      ucfirst: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
    }));
    this.$('.placeholder').html(rtpl);
    return this;
  };

  DateFacet.prototype.update = function(newOptions) {};

  DateFacet.prototype.reset = function() {};

  return DateFacet;

})(Views.Facet);

module.exports = DateFacet;



},{"../../../jade/facets/date.jade":41,"../../models/facets/date":17,"./main":29}],27:[function(_dereq_,module,exports){
var $, Collections, ListFacet, Models, Views, menuTpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

$ = _dereq_('jquery');

_ = _dereq_('underscore');

Models = {
  List: _dereq_('../../models/facets/list')
};

Collections = {
  Options: _dereq_('../../collections/list.options')
};

Views = {
  Facet: _dereq_('./main'),
  Options: _dereq_('./list.options')
};

menuTpl = _dereq_('../../../jade/facets/list.menu.jade');

ListFacet = (function(_super) {
  __extends(ListFacet, _super);

  function ListFacet() {
    return ListFacet.__super__.constructor.apply(this, arguments);
  }

  ListFacet.prototype.className = 'facet list';

  ListFacet.prototype.initialize = function(options) {
    ListFacet.__super__.initialize.apply(this, arguments);
    this.resetActive = false;
    this.config = options.config;
    this.model = new Models.List(options.attrs, {
      parse: true
    });
    this.collection = new Collections.Options(options.attrs.options, {
      parse: true
    });
    return this.render();
  };

  ListFacet.prototype.render = function() {
    var menu;
    ListFacet.__super__.render.apply(this, arguments);
    if (this.$('header .options').length > 0) {
      if (this.config.get('templates').hasOwnProperty('list.menu')) {
        menuTpl = this.config.get('templates')['list.menu'];
      }
      menu = menuTpl({
        model: this.model.attributes
      });
      this.$('header .options').html(menu);
    }
    this.optionsView = new Views.Options({
      collection: this.collection,
      facetName: this.model.get('name'),
      config: this.config
    });
    this.$('.body').html(this.optionsView.el);
    this.listenTo(this.optionsView, 'filter:finished', this.renderFilteredOptionCount);
    this.listenTo(this.optionsView, 'change', (function(_this) {
      return function(data) {
        return _this.trigger('change', data);
      };
    })(this));
    if (this.collection.length <= 3) {
      this.$('header i.openclose').hide();
    }
    return this;
  };

  ListFacet.prototype.postRender = function() {
    var el;
    el = this.el.querySelector('.body > .container');
    if (el.scrollHeight > el.clientHeight) {
      return this.$el.addClass('with-scrollbar');
    }
  };

  ListFacet.prototype.renderFilteredOptionCount = function() {
    var filteredModels, value, visibleModels, _ref;
    visibleModels = this.collection.filter(function(model) {
      return model.get('visible');
    });
    value = (0 < (_ref = visibleModels.length) && _ref < 21) ? 'visible' : 'hidden';
    this.$('input[type="checkbox"][name="all"]').css('visibility', value);
    filteredModels = this.collection.filter(function(model) {
      return model.get('visible');
    });
    if (filteredModels.length === 0 || filteredModels.length === this.collection.length) {
      this.$('header .options input[name="filter"]').addClass('nonefound');
    } else {
      this.$('header .options input[name="filter"]').removeClass('nonefound');
    }
    this.$('header small.optioncount').html(filteredModels.length + ' of ' + this.collection.length);
    return this;
  };

  ListFacet.prototype.events = function() {
    return _.extend({}, ListFacet.__super__.events.apply(this, arguments), {
      'keyup input[name="filter"]': function(ev) {
        return this.optionsView.filterOptions(ev.currentTarget.value);
      },
      'change header .options input[type="checkbox"][name="all"]': function(ev) {
        return this.optionsView.setCheckboxes(ev);
      },
      'click header .menu i.filter': 'toggleFilterMenu',
      'click header .menu i.alpha': 'changeOrder',
      'click header .menu i.amount': 'changeOrder'
    });
  };

  ListFacet.prototype.toggleFilterMenu = function() {
    var filterIcon, optionsDiv;
    optionsDiv = this.$('header .options');
    filterIcon = this.$('i.filter');
    filterIcon.toggleClass('active');
    return optionsDiv.slideToggle(150, (function(_this) {
      return function() {
        var input;
        input = optionsDiv.find('input[name="filter"]');
        if (filterIcon.hasClass('active')) {
          input.focus();
          _this.optionsView.appendOptions(true);
          return _this.renderFilteredOptionCount();
        } else {
          input.val('');
          return _this.collection.setAllVisible();
        }
      };
    })(this));
  };

  ListFacet.prototype.changeOrder = function(ev) {
    var $target, order, type;
    if (!this.$('i.filter').hasClass('active')) {
      this.optionsView.renderAll();
    }
    $target = $(ev.currentTarget);
    if ($target.hasClass('active')) {
      if ($target.hasClass('alpha')) {
        $target.toggleClass('fa-sort-alpha-desc');
        $target.toggleClass('fa-sort-alpha-asc');
      } else if ($target.hasClass('amount')) {
        $target.toggleClass('fa-sort-amount-desc');
        $target.toggleClass('fa-sort-amount-asc');
      }
    } else {
      this.$('i.amount.active').removeClass('active');
      this.$('i.alpha.active').removeClass('active');
      $target.addClass('active');
    }
    type = $target.hasClass('alpha') ? 'alpha' : 'amount';
    order = $target.hasClass('fa-sort-' + type + '-desc') ? 'desc' : 'asc';
    return this.collection.orderBy(type + '_' + order);
  };

  ListFacet.prototype.update = function(newOptions) {
    if (this.resetActive) {
      this.collection.reset(newOptions, {
        parse: true
      });
      return this.resetActive = false;
    } else {
      return this.collection.updateOptions(newOptions);
    }
  };

  ListFacet.prototype.reset = function() {
    this.resetActive = true;
    if (this.$('i.filter').hasClass('active')) {
      return this.toggleFilterMenu();
    }
  };


  /*
  	Alias for reset, but used for different implementation. This should be the base
  	of the original reset, but no time for proper refactor. Current project (ebnm)
  	doesn't have a reset button, so harder to test.
  
  	TODO refactor @reset.
   */

  ListFacet.prototype.revert = function() {
    if (this.$('i.filter').hasClass('active')) {
      this.toggleFilterMenu();
    }
    this.collection.revert();
    return this.collection.sort();
  };

  return ListFacet;

})(Views.Facet);

module.exports = ListFacet;



},{"../../../jade/facets/list.menu.jade":43,"../../collections/list.options":12,"../../models/facets/list":18,"./list.options":28,"./main":29}],28:[function(_dereq_,module,exports){
var $, Backbone, ListFacetOptions, Models, bodyTpl, funcky, optionTpl, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

$ = _dereq_('jquery');

_ = _dereq_('underscore');

funcky = _dereq_('funcky.util');

Models = {
  List: _dereq_('../../models/facets/list')
};

bodyTpl = _dereq_('../../../jade/facets/list.body.jade');

optionTpl = _dereq_('../../../jade/facets/list.option.jade');

ListFacetOptions = (function(_super) {
  __extends(ListFacetOptions, _super);

  function ListFacetOptions() {
    this.triggerChange = __bind(this.triggerChange, this);
    return ListFacetOptions.__super__.constructor.apply(this, arguments);
  }

  ListFacetOptions.prototype.className = 'container';

  ListFacetOptions.prototype.initialize = function(options) {
    this.config = options.config;
    this.facetName = options.facetName;
    this.listenTo(this.collection, 'sort', (function(_this) {
      return function() {
        return _this.rerender();
      };
    })(this));
    this.listenTo(this.collection, 'reset', (function(_this) {
      return function() {
        _this.collection.orderBy('amount_desc', true);
        return _this.render();
      };
    })(this));
    if (this.config.get('templates').hasOwnProperty('list.option')) {
      optionTpl = this.config.get('templates')['list.option'];
    }
    return this.render();
  };

  ListFacetOptions.prototype.render = function() {
    this.showingCursor = 0;
    this.showingIncrement = 50;
    if (this.config.get('templates').hasOwnProperty('list.body')) {
      bodyTpl = this.config.get('templates')['list.body'];
    }
    this.$el.html(bodyTpl({
      facetName: this.facetName
    }));
    this.appendOptions();
    return this;
  };

  ListFacetOptions.prototype.rerender = function() {
    var i, model, tpl, visible;
    tpl = '';
    i = 0;
    model = this.collection.at(i);
    visible = model.get('visible');
    while (visible) {
      tpl += optionTpl({
        option: model
      });
      i = i + 1;
      model = this.collection.at(i);
      visible = (model != null) && model.get('visible') ? true : false;
    }
    return this.el.querySelector('ul').innerHTML = tpl;
  };

  ListFacetOptions.prototype.appendOptions = function(all) {
    var model, tpl;
    if (all == null) {
      all = false;
    }
    if (all) {
      this.showingIncrement = this.collection.length;
    }
    tpl = '';
    while (this.showingCursor < this.showingIncrement && this.showingCursor < this.collection.length) {
      model = this.collection.at(this.showingCursor);
      model.set('visible', true);
      tpl += optionTpl({
        option: model
      });
      this.showingCursor = this.showingCursor + 1;
    }
    return this.$('ul').append(tpl);
  };

  ListFacetOptions.prototype.renderAll = function() {
    return this.collection.setAllVisible();
  };

  ListFacetOptions.prototype.events = function() {
    return {
      'click li': 'checkChanged',
      'scroll': 'onScroll'
    };
  };

  ListFacetOptions.prototype.onScroll = function(ev) {
    var target, topPerc;
    if (this.showingCursor < this.collection.length) {
      target = ev.currentTarget;
      topPerc = target.scrollTop / target.scrollHeight;
      if (topPerc > (this.showingCursor / 2) / this.collection.length) {
        this.showingIncrement += this.showingIncrement;
        return this.appendOptions();
      }
    }
  };

  ListFacetOptions.prototype.checkChanged = function(ev) {
    var $target, id;
    $target = $(ev.currentTarget);
    id = $target.attr('data-value');
    $target.toggleClass('checked');
    this.collection.get(id).set('checked', $target.hasClass('checked'));
    if (this.$('li.checked').length === 0 || !this.config.get('autoSearch')) {
      return this.triggerChange();
    } else {
      return funcky.setResetTimeout(1000, (function(_this) {
        return function() {
          return _this.triggerChange();
        };
      })(this));
    }
  };

  ListFacetOptions.prototype.triggerChange = function(values) {
    var checkedModels;
    if (values == null) {
      checkedModels = this.collection.filter(function(item) {
        return item.get('checked');
      });
      values = _.map(checkedModels, function(item) {
        return item.get('name');
      });
    }
    return this.trigger('change', {
      facetValue: {
        name: this.facetName,
        values: values
      }
    });
  };


  /*
  	Called by parent (ListFacet) when user types in the search input
   */

  ListFacetOptions.prototype.filterOptions = function(value) {
    this.collection.map(function(model) {
      var re;
      re = new RegExp(value, 'i');
      return model.set('visible', re.test(model.id));
    });
    this.collection.sort();
    return this.trigger('filter:finished');
  };

  ListFacetOptions.prototype.setCheckboxes = function(ev) {
    var model, values, visibleModels, _i, _len;
    visibleModels = this.collection.filter(function(model) {
      return model.get('visible');
    });
    for (_i = 0, _len = visibleModels.length; _i < _len; _i++) {
      model = visibleModels[_i];
      model.set('checked', ev.currentTarget.checked);
    }
    if (ev.currentTarget.checked) {
      values = _.map(visibleModels, function(item) {
        return item.get('name');
      });
      return this.triggerChange(values);
    } else {
      return this.triggerChange();
    }
  };

  return ListFacetOptions;

})(Backbone.View);

module.exports = ListFacetOptions;



},{"../../../jade/facets/list.body.jade":42,"../../../jade/facets/list.option.jade":44,"../../models/facets/list":18,"funcky.util":9}],29:[function(_dereq_,module,exports){
var $, Backbone, Facet, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

$ = _dereq_('jquery');

_ = _dereq_('underscore');

tpl = _dereq_('../../../jade/facets/main.jade');

Facet = (function(_super) {
  __extends(Facet, _super);

  function Facet() {
    return Facet.__super__.constructor.apply(this, arguments);
  }

  Facet.prototype.initialize = function(options) {
    this.config = options.config;
    if (this.config.get('facetTitleMap').hasOwnProperty(options.attrs.name)) {
      return options.attrs.title = this.config.get('facetTitleMap')[options.attrs.name];
    }
  };

  Facet.prototype.render = function() {
    if (this.config.get('templates').hasOwnProperty('facets.main')) {
      tpl = this.config.get('templates')['facets.main'];
    }
    this.$el.html(tpl({
      model: this.model,
      config: this.config
    }));
    this.$el.attr('data-name', this.model.get('name'));
    return this;
  };

  Facet.prototype.events = function() {
    return {
      'click h3': 'toggleBody'
    };
  };

  Facet.prototype.toggleBody = function(ev) {
    var func;
    func = this.$('.body').is(':visible') ? this.hideBody : this.showBody;
    if (_.isFunction(ev)) {
      return func.call(this, ev);
    } else {
      return func.call(this);
    }
  };

  Facet.prototype.hideMenu = function() {
    var $button;
    $button = this.$('header i.openclose');
    $button.addClass('fa-plus-square-o');
    $button.removeClass('fa-minus-square-o');
    return this.$('header .options').slideUp(150);
  };

  Facet.prototype.hideBody = function(done) {
    this.hideMenu();
    return this.$('.body').slideUp(100, (function(_this) {
      return function() {
        if (done != null) {
          done();
        }
        return _this.$('header i.fa').fadeOut(100);
      };
    })(this));
  };

  Facet.prototype.showBody = function(done) {
    return this.$('.body').slideDown(100, (function(_this) {
      return function() {
        if (done != null) {
          done();
        }
        return _this.$('header i.fa').fadeIn(100);
      };
    })(this));
  };

  Facet.prototype.destroy = function() {
    return this.remove();
  };

  Facet.prototype.update = function(newOptions) {};

  Facet.prototype.reset = function() {};

  Facet.prototype.postRender = function() {};

  return Facet;

})(Backbone.View);

module.exports = Facet;



},{"../../../jade/facets/main.jade":45}],30:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (max, min) {
buf.push("<div class=\"slider\"><span class=\"dash\">-</span><div class=\"handle-min handle\"><input" + (jade.attr("value", min, true, false)) + " class=\"min\"/></div><div class=\"handle-max handle\"><input" + (jade.attr("value", max, true, false)) + " class=\"max\"/></div><div class=\"bar\">&nbsp;</div><button><svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 216 146\" xml:space=\"preserve\"><path d=\"M172.77,123.025L144.825,95.08c6.735-9.722,10.104-20.559,10.104-32.508c0-7.767-1.508-15.195-4.523-22.283c-3.014-7.089-7.088-13.199-12.221-18.332s-11.242-9.207-18.33-12.221c-7.09-3.015-14.518-4.522-22.285-4.522c-7.767,0-15.195,1.507-22.283,4.522c-7.089,3.014-13.199,7.088-18.332,12.221c-5.133,5.133-9.207,11.244-12.221,18.332c-3.015,7.089-4.522,14.516-4.522,22.283c0,7.767,1.507,15.193,4.522,22.283c3.014,7.088,7.088,13.197,12.221,18.33c5.133,5.134,11.244,9.207,18.332,12.222c7.089,3.015,14.516,4.522,22.283,4.522c11.951,0,22.787-3.369,32.509-10.104l27.945,27.863c1.955,2.064,4.397,3.096,7.332,3.096c2.824,0,5.27-1.032,7.332-3.096c2.064-2.063,3.096-4.508,3.096-7.332C175.785,127.479,174.781,125.034,172.77,123.025z M123.357,88.357c-7.143,7.143-15.738,10.714-25.787,10.714c-10.048,0-18.643-3.572-25.786-10.714c-7.143-7.143-10.714-15.737-10.714-25.786c0-10.048,3.572-18.644,10.714-25.786c7.142-7.143,15.738-10.714,25.786-10.714c10.048,0,18.643,3.572,25.787,10.714c7.143,7.142,10.715,15.738,10.715,25.786C134.072,72.62,130.499,81.214,123.357,88.357z\"></path></svg></button></div>");}.call(this,"max" in locals_for_with?locals_for_with.max:typeof max!=="undefined"?max:undefined,"min" in locals_for_with?locals_for_with.min:typeof min!=="undefined"?min:undefined));;return buf.join("");
};
},{"jade/runtime":11}],31:[function(_dereq_,module,exports){
var $, Facet, Range, RangeFacet, bodyTpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

$ = _dereq_('jquery');

_ = _dereq_('underscore');

Range = _dereq_('./model');

Facet = _dereq_('../main');

bodyTpl = _dereq_('./body.jade');

RangeFacet = (function(_super) {
  __extends(RangeFacet, _super);

  function RangeFacet() {
    return RangeFacet.__super__.constructor.apply(this, arguments);
  }

  RangeFacet.prototype.className = 'facet range';


  /*
  	@constructs
  	@param {object} 		this.options
  	@param {Backbone.Model} this.options.config
  	@param {object} 		this.options.attrs
   */

  RangeFacet.prototype.initialize = function(options) {
    this.options = options;
    RangeFacet.__super__.initialize.apply(this, arguments);
    this.draggingMin = false;
    this.draggingMax = false;
    this.model = new Range(this.options.attrs, {
      parse: true
    });
    this.listenTo(this.model, 'change:options', this.render);
    this.listenTo(this.model, 'change', (function(_this) {
      return function(model) {
        if (model.changed.hasOwnProperty('currentMin') || model.changed.hasOwnProperty('currentMax')) {
          if ((_this.button != null) && _this.options.config.get('autoSearch')) {
            return _this.button.style.display = 'block';
          }
        }
      };
    })(this));
    this.listenTo(this.model, 'change:handleMinLeft', (function(_this) {
      return function(model, value) {
        _this.handleMin.css('left', value);
        return _this.bar.css('left', value + (_this.model.get('handleWidth') / 2));
      };
    })(this));
    this.listenTo(this.model, 'change:handleMaxLeft', (function(_this) {
      return function(model, value) {
        _this.handleMax.css('left', value);
        return _this.bar.css('right', model.get('sliderWidth') - value - (_this.model.get('handleWidth') / 2));
      };
    })(this));
    this.listenTo(this.model, 'change:currentMin', (function(_this) {
      return function(model, value) {
        return _this.inputMin.val(Math.ceil(value));
      };
    })(this));
    this.listenTo(this.model, 'change:currentMax', (function(_this) {
      return function(model, value) {
        return _this.inputMax.val(Math.ceil(value));
      };
    })(this));
    return this.render();
  };

  RangeFacet.prototype.render = function() {
    var rtpl;
    RangeFacet.__super__.render.apply(this, arguments);
    if (this.options.config.get('templates').hasOwnProperty('range.body')) {
      bodyTpl = this.options.config.get('templates')['range.body'];
    }
    rtpl = bodyTpl(this.model.attributes);
    this.$('.body').html(rtpl);
    this.$('header .menu').hide();
    this.dragStopper = this.stopDragging.bind(this);
    this.$el.on('mouseleave', this.dragStopper);
    this.resizer = this.onResize.bind(this);
    window.addEventListener('resize', this.resizer);
    return this;
  };

  RangeFacet.prototype.postRender = function() {
    var slider;
    this.handleMin = this.$('.handle-min');
    this.handleMax = this.$('.handle-max');
    this.inputMin = this.$('input.min');
    this.inputMax = this.$('input.max');
    this.bar = this.$('.bar');
    this.button = this.el.querySelector('button');
    slider = this.$('.slider');
    return this.model.set({
      sliderWidth: slider.width(),
      sliderLeft: slider.offset().left,
      handleMinLeft: this.handleMin.position().left,
      handleMaxLeft: this.handleMax.position().left,
      handleWidth: this.handleMin.width()
    });
  };

  RangeFacet.prototype.events = function() {
    return _.extend({}, RangeFacet.__super__.events.apply(this, arguments), {
      'mousedown .handle': 'startDragging',
      'mousedown .bar': 'startDragging',
      'mouseup': 'stopDragging',
      'mousemove': 'drag',
      'blur input': 'setYear',
      'keyup input': 'setYear',
      'click button': 'doSearch',
      'dblclick input.min': function(ev) {
        return this.enableInputEditable(this.inputMin);
      },
      'dblclick input.max': function(ev) {
        return this.enableInputEditable(this.inputMax);
      }
    });
  };

  RangeFacet.prototype.setYear = function(ev) {
    if (ev.type === 'focusout' || ev.type === 'blur' || (ev.type === 'keyup' && ev.keyCode === 13)) {
      if (ev.currentTarget.className.indexOf('min') > -1) {
        this.model.set({
          currentMin: +ev.currentTarget.value
        });
        return this.disableInputEditable(this.inputMin);
      } else if (ev.currentTarget.className.indexOf('max') > -1) {
        this.model.set({
          currentMax: +ev.currentTarget.value
        });
        return this.disableInputEditable(this.inputMax);
      }
    }
  };

  RangeFacet.prototype.doSearch = function(ev) {
    ev.preventDefault();
    return this.triggerChange();
  };

  RangeFacet.prototype.startDragging = function(ev) {
    var input, target;
    target = $(ev.currentTarget);
    input = target.find('input');
    if (input.length > 0) {
      if (input.hasClass('edit')) {
        return;
      }
    }
    if (target.hasClass('handle-min')) {
      this.draggingMin = true;
      this.handleMax.css('z-index', 10);
      return target.css('z-index', 11);
    } else if (target.hasClass('handle-max')) {
      this.draggingMax = true;
      this.handleMin.css('z-index', 10);
      return target.css('z-index', 11);
    } else if (target.hasClass('bar')) {
      return this.draggingBar = {
        offsetLeft: (ev.clientX - this.model.get('sliderLeft')) - this.model.get('handleMinLeft'),
        barWidth: this.bar.width()
      };
    }
  };

  RangeFacet.prototype.drag = function(ev) {
    var left, mousePosLeft, right;
    mousePosLeft = ev.clientX - this.model.get('sliderLeft');
    if (this.draggingMin || this.draggingMax) {
      this.disableInputOverlap();
      this.checkInputOverlap();
    }
    if (this.draggingBar != null) {
      this.updateDash();
      left = mousePosLeft - this.draggingBar.offsetLeft;
      right = left + this.draggingBar.barWidth;
      if (-1 < left && right <= this.model.get('sliderWidth')) {
        this.model.dragMin(left);
        this.model.dragMax(right);
      }
    }
    if (this.draggingMin) {
      this.model.dragMin(mousePosLeft - (this.model.get('handleWidth') / 2));
    }
    if (this.draggingMax) {
      return this.model.dragMax(mousePosLeft - (this.model.get('handleWidth') / 2));
    }
  };

  RangeFacet.prototype.stopDragging = function() {
    if (this.draggingMin || this.draggingMax || (this.draggingBar != null)) {
      if (this.draggingMin) {
        if (this.model.get('currentMin') !== +this.inputMin.val()) {
          this.model.set({
            currentMin: +this.inputMin.val()
          });
        }
      }
      if (this.draggingMax) {
        if (this.model.get('currentMax') !== +this.inputMax.val()) {
          this.model.set({
            currentMax: +this.inputMax.val()
          });
        }
      }
      this.draggingMin = false;
      this.draggingMax = false;
      this.draggingBar = null;
      if (!this.options.config.get('autoSearch')) {
        return this.triggerChange({
          silent: true
        });
      }
    }
  };

  RangeFacet.prototype.enableInputEditable = function(input) {
    input.addClass('edit');
    return input.focus();
  };

  RangeFacet.prototype.disableInputEditable = function(input) {
    return input.removeClass('edit');
  };

  RangeFacet.prototype.destroy = function() {
    this.$el.off('mouseleave', this.dragStopper);
    window.removeEventListener('resize', this.resizer);
    return this.remove();
  };

  RangeFacet.prototype.triggerChange = function(options) {
    var queryOptions;
    if (options == null) {
      options = {};
    }
    queryOptions = {
      facetValue: {
        name: this.model.get('name'),
        lowerLimit: this.model.getLowerLimit(),
        upperLimit: this.model.getUpperLimit()
      }
    };
    return this.trigger('change', queryOptions, options);
  };

  RangeFacet.prototype.onResize = function() {
    this.postRender();
    this.update([
      {
        lowerLimit: this.model.get('currentMin'),
        upperLimit: this.model.get('currentMax')
      }
    ]);
    return this.checkInputOverlap();
  };

  RangeFacet.prototype.checkInputOverlap = function() {
    var diff, maxRect, minRect;
    minRect = this.inputMin[0].getBoundingClientRect();
    maxRect = this.inputMax[0].getBoundingClientRect();
    if (!(minRect.right < maxRect.left || minRect.left > maxRect.right || minRect.bottom < maxRect.top || minRect.top > maxRect.bottom)) {
      diff = minRect.right - maxRect.left;
      return this.enableInputOverlap(diff);
    } else {
      return this.disableInputOverlap();
    }
  };

  RangeFacet.prototype.enableInputOverlap = function(diff) {
    this.inputMin.css('left', -20 - diff / 2);
    this.inputMax.css('right', -20 - diff / 2);
    this.updateDash();
    this.$('.dash').show();
    this.inputMin.addClass('overlap');
    return this.inputMax.addClass('overlap');
  };

  RangeFacet.prototype.disableInputOverlap = function() {
    this.inputMin.css('left', -20);
    this.inputMax.css('right', -20);
    this.$('.dash').hide();
    this.inputMin.removeClass('overlap');
    return this.inputMax.removeClass('overlap');
  };

  RangeFacet.prototype.updateDash = function() {
    return this.$('.dash').css('left', this.model.get('handleMinLeft') + ((this.model.get('handleMaxLeft') - this.model.get('handleMinLeft')) / 2) + 3);
  };

  RangeFacet.prototype.update = function(newOptions) {
    var ll, ul;
    if (_.isArray(newOptions)) {
      if (newOptions[0] != null) {
        newOptions = newOptions[0];
        if (newOptions.lowerLimit < 2500) {
          ll = newOptions.lowerLimit;
          ul = newOptions.upperLimit;
        } else {
          ll = this.model.convertLimit2Year(newOptions.lowerLimit);
          ul = this.model.convertLimit2Year(newOptions.upperLimit);
        }
        this.model.set({
          currentMin: ll,
          currentMax: ul
        });
      }
    } else {
      this.model.reset();
    }
    if (this.button != null) {
      return this.button.style.display = 'none';
    }
  };

  return RangeFacet;

})(Facet);

module.exports = RangeFacet;



},{"../main":29,"./body.jade":30,"./model":32}],32:[function(_dereq_,module,exports){
var FacetModel, RangeFacet, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

FacetModel = _dereq_('../../../models/facets/main');

_ = _dereq_('underscore');

RangeFacet = (function(_super) {
  __extends(RangeFacet, _super);

  function RangeFacet() {
    this.dragMax = __bind(this.dragMax, this);
    this.dragMin = __bind(this.dragMin, this);
    return RangeFacet.__super__.constructor.apply(this, arguments);
  }

  RangeFacet.prototype.defaults = function() {
    return _.extend({}, RangeFacet.__super__.defaults.apply(this, arguments), {
      min: null,
      max: null,
      currentMin: null,
      currentMax: null,
      handleMinLeft: null,
      handleMaxLeft: null,
      sliderWidth: null
    });
  };

  RangeFacet.prototype.initialize = function() {
    return this.once('change', (function(_this) {
      return function() {
        _this.on('change:currentMin', function(model, value) {
          return _this.set({
            handleMinLeft: _this.getLeftFromYear(value)
          });
        });
        _this.on('change:currentMax', function(model, value) {
          return _this.set({
            handleMaxLeft: _this.getLeftFromYear(value)
          });
        });
        _this.on('change:handleMinLeft', function(model, value) {
          return _this.set({
            currentMin: _this.getYearFromLeft(value)
          });
        });
        return _this.on('change:handleMaxLeft', function(model, value) {
          return _this.set({
            currentMax: _this.getYearFromLeft(value)
          });
        });
      };
    })(this));
  };

  RangeFacet.prototype.set = function(attrs, options) {
    if (attrs.hasOwnProperty('currentMin')) {
      if (attrs.currentMin > this.get('currentMax')) {
        attrs.currentMax = +attrs.currentMin;
        attrs.currentMin = this.get('currentMax');
      }
    }
    if (attrs.hasOwnProperty('currentMax')) {
      if (attrs.currentMax < this.get('currentMin')) {
        attrs.currentMin = +attrs.currentMax;
        attrs.currentMax = this.get('currentMin');
      }
    }
    if (attrs.hasOwnProperty('currentMin') && this.has('min') && attrs.currentMin < this.get('min')) {
      attrs.currentMin = this.get('min');
    }
    if (attrs.hasOwnProperty('currentMax') && this.has('max') && attrs.currentMax > this.get('max')) {
      attrs.currentMax = this.get('max');
    }
    return RangeFacet.__super__.set.apply(this, arguments);
  };

  RangeFacet.prototype.parse = function(attrs) {
    RangeFacet.__super__.parse.apply(this, arguments);
    attrs.min = attrs.currentMin = this.convertLimit2Year(attrs.options[0].lowerLimit);
    attrs.max = attrs.currentMax = this.convertLimit2Year(attrs.options[0].upperLimit);
    delete attrs.options;
    return attrs;
  };


  /*
  	Convert the lower and upper limit string to a year.
  	For example "20141213" returns 2014; "8000101" returns 800.
  
  	@method convertLimit2Year
  	@param {number} limit - Lower or upper limit, for example: 20141213
  	@returns {number} A year, for example: 2014
   */

  RangeFacet.prototype.convertLimit2Year = function(limit) {
    var year;
    year = limit + '';
    if (year.length === 8) {
      year = year.substr(0, 4);
    } else if (year.length === 7) {
      year = year.substr(0, 3);
    } else {
      throw new Error("RangeFacet: lower or upper limit is not 7 or 8 chars!");
    }
    return +year;
  };


  /*
  	Convert a year to a lower or upper limit string
  	For example: 2014 returns "20141231"; 800 returns "8000101".
  
  	@method convertLimit2Year
  	@param {number} year - A year
  	@param {boolean} from - If from is true, the limit start at januari 1st, else it ends at december 31st
  	@returns {number} A limit, for example: 20140101
   */

  RangeFacet.prototype._convertYear2Limit = function(year, from) {
    var limit;
    if (from == null) {
      from = true;
    }
    limit = year + '';
    limit += from ? "0101" : "1231";
    return +limit;
  };

  RangeFacet.prototype.getLowerLimit = function() {
    return this._convertYear2Limit(this.get('currentMin'));
  };

  RangeFacet.prototype.getUpperLimit = function() {
    return this._convertYear2Limit(this.get('currentMax'), false);
  };

  RangeFacet.prototype.reset = function() {
    return this.set({
      currentMin: this.get('min'),
      currentMax: this.get('max'),
      lowerLimit: this.get('min'),
      upperLimit: this.get('max')
    });
  };

  RangeFacet.prototype.getLeftFromYear = function(year) {
    var hhw, ll, sw, ul;
    ll = this.get('min');
    ul = this.get('max');
    sw = this.get('sliderWidth');
    hhw = this.get('handleWidth') / 2;
    return (((year - ll) / (ul - ll)) * sw) - hhw;
  };

  RangeFacet.prototype.getYearFromLeft = function(left) {
    var hhw, ll, sw, ul;
    ll = this.get('min');
    ul = this.get('max');
    hhw = this.get('handleWidth') / 2;
    sw = this.get('sliderWidth');
    return Math.round((((left + hhw) / sw) * (ul - ll)) + ll);
  };

  RangeFacet.prototype.dragMin = function(pos) {
    var handelWidthHalf;
    handelWidthHalf = this.get('handleWidth') / 2;
    if (((-handelWidthHalf) <= pos && pos <= this.get('handleMaxLeft'))) {
      return this.set({
        handleMinLeft: pos
      });
    }
  };

  RangeFacet.prototype.dragMax = function(pos) {
    if ((this.get('handleMinLeft') < pos && pos <= this.get('sliderWidth') - (this.get('handleWidth') / 2))) {
      return this.set({
        handleMaxLeft: pos
      });
    }
  };

  return RangeFacet;

})(FacetModel);

module.exports = RangeFacet;



},{"../../../models/facets/main":20}],33:[function(_dereq_,module,exports){
var $, Backbone, Results, Views, listItems, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

$ = _dereq_('jquery');

_ = _dereq_('underscore');

Views = {
  Result: _dereq_('./result'),
  SortLevels: _dereq_('./sort'),
  Pagination: _dereq_('hibb-pagination')
};

tpl = _dereq_('./index.jade');

listItems = [];

Results = (function(_super) {
  __extends(Results, _super);

  function Results() {
    return Results.__super__.constructor.apply(this, arguments);
  }


  /* options
  	@constructs
  	@param {object} this.options={}
  	@prop {Backbone.Model} options.config
  	@prop {Backbone.Collection} options.searchResults
   */

  Results.prototype.initialize = function(options) {
    this.options = options != null ? options : {};

    /*
    		@prop resultItems
     */
    this.resultItems = [];
    this.isMetadataVisible = true;
    this.listenTo(this.options.searchResults, 'change:page', this.renderResultsPage);
    this.listenTo(this.options.searchResults, 'change:results', (function(_this) {
      return function(responseModel) {
        _this.$('header h3.numfound').html("" + (_this.options.config.get('labels').numFound) + " " + (responseModel.get('numFound')) + " " + (_this.options.config.get('termPlural')));
        _this.renderPagination(responseModel);
        return _this.renderResultsPage(responseModel);
      };
    })(this));
    this.subviews = {};
    return this.render();
  };

  Results.prototype.render = function() {
    this.$el.html(tpl({
      showMetadata: this.options.config.get('showMetadata'),
      resultsPerPage: this.options.config.get('resultRows'),
      config: this.options.config
    }));
    this.renderLevels();
    $(window).resize((function(_this) {
      return function() {
        var pages;
        pages = _this.$('div.pages');
        return pages.height($(window).height() - pages.offset().top);
      };
    })(this));
    return this;
  };

  Results.prototype.renderLevels = function() {
    if (!this.options.config.get('sortLevels')) {
      return;
    }
    if (this.subviews.sortLevels != null) {
      this.subviews.sortLevels.destroy();
    }
    this.subviews.sortLevels = new Views.SortLevels({
      config: this.options.config
    });
    this.$('header nav ul').prepend(this.subviews.sortLevels.$el);
    return this.listenTo(this.subviews.sortLevels, 'change', (function(_this) {
      return function(sortParameters) {
        return _this.trigger('change:sort-levels', sortParameters);
      };
    })(this));
  };


  /*
  	@method renderResultsPage
  	@param {object} responseModel - The model returned by the server.
   */

  Results.prototype.renderResultsPage = function(responseModel) {
    var frag, fulltext, pageNumber, result, ul, _i, _len, _ref;
    this.destroyResultItems();
    this.$("div.pages").html('');
    fulltext = false;
    if (responseModel.get('results').length > 0 && (responseModel.get('results')[0].terms != null)) {
      if (Object.keys(responseModel.get('results')[0].terms).length > 0) {
        fulltext = true;
      }
    }
    frag = document.createDocumentFragment();
    _ref = responseModel.get('results');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      result = _ref[_i];
      result = new Views.Result({
        data: result,
        fulltext: fulltext,
        config: this.options.config
      });
      this.resultItems.push(result);
      this.listenTo(result, 'click', function(resultData) {
        return this.trigger('result:click', resultData);
      });
      this.listenTo(result, 'layer:click', function(layer, resultData) {
        return this.trigger('result:layer-click', layer, resultData);
      });
      frag.appendChild(result.el);
    }
    pageNumber = this.subviews.pagination.getCurrentPageNumber();
    ul = $("<ul class=\"page\" data-page-number=\"" + pageNumber + "\" />");
    ul.html(frag);
    return this.$("div.pages").append(ul);
  };

  Results.prototype.renderPagination = function(responseModel) {
    if (this.subviews.pagination != null) {
      this.stopListening(this.subviews.pagination);
      this.subviews.pagination.destroy();
    }
    this.subviews.pagination = new Views.Pagination({
      resultsStart: responseModel.get('start'),
      resultsPerPage: this.options.config.get('resultRows'),
      resultsTotal: responseModel.get('numFound')
    });
    this.listenTo(this.subviews.pagination, 'change:pagenumber', this.changePage);
    return this.$('header .pagination').html(this.subviews.pagination.el);
  };

  Results.prototype.changePage = function(pageNumber) {
    var page, pages;
    pages = this.$('div.pages');
    pages.find('ul.page').hide();
    page = pages.find("ul.page[data-page-number=\"" + pageNumber + "\"]");
    if (page.length > 0) {
      return page.show();
    } else {
      return this.options.searchResults.page(pageNumber);
    }
  };

  Results.prototype.events = function() {
    return {
      'change li.show-metadata input': 'showMetadata',
      'change li.results-per-page select': 'onChangeResultsPerPage'
    };
  };

  Results.prototype.onChangeResultsPerPage = function(ev) {
    var t;
    t = ev.currentTarget;
    return this.options.config.set('resultRows', t.options[t.selectedIndex].value);
  };

  Results.prototype.showMetadata = function(ev) {
    this.isMetadataVisible = ev.currentTarget.checked;
    return this.$('.metadata').toggle(this.isMetadataVisible);
  };

  Results.prototype.reset = function() {
    return this.renderLevels();
  };

  Results.prototype.destroy = function() {
    this.destroyResultItems();
    return this.subviews.sortLevels.destroy();
  };

  Results.prototype.destroyResultItems = function() {
    var item, _i, _len, _ref, _results;
    _ref = this.resultItems;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      item = _ref[_i];
      _results.push(item.destroy());
    }
    return _results;
  };

  return Results;

})(Backbone.View);

module.exports = Results;



},{"./index.jade":34,"./result":35,"./sort":37,"hibb-pagination":10}],34:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (config, resultsPerPage, showMetadata, undefined) {
buf.push("<header><h3 class=\"numfound\"></h3><nav><ul><li class=\"results-per-page\"><select name=\"results-per-page\">");
// iterate [10, 25, 50, 100, 250, 500, 1000]
;(function(){
  var $$obj = [10, 25, 50, 100, 250, 500, 1000];
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var count = $$obj[$index];

buf.push("<option" + (jade.attr("value", count, true, false)) + (jade.attr("selected", count===resultsPerPage, true, false)) + ">" + (jade.escape(null == (jade_interp = count + " " + config.get('termPlural')) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var count = $$obj[$index];

buf.push("<option" + (jade.attr("value", count, true, false)) + (jade.attr("selected", count===resultsPerPage, true, false)) + ">" + (jade.escape(null == (jade_interp = count + " " + config.get('termPlural')) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li>");
if ( showMetadata)
{
buf.push("<li class=\"show-metadata\"><input id=\"o45hes3\" type=\"checkbox\" checked=\"checked\"/><label for=\"o45hes3\">Show metadata</label></li>");
}
buf.push("</ul></nav><div class=\"pagination\"></div></header><div class=\"pages\"></div>");}.call(this,"config" in locals_for_with?locals_for_with.config:typeof config!=="undefined"?config:undefined,"resultsPerPage" in locals_for_with?locals_for_with.resultsPerPage:typeof resultsPerPage!=="undefined"?resultsPerPage:undefined,"showMetadata" in locals_for_with?locals_for_with.showMetadata:typeof showMetadata!=="undefined"?showMetadata:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":11}],35:[function(_dereq_,module,exports){
var Backbone, Result, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

tpl = _dereq_('./result.jade');


/*
@class Result
@extends Backbone.View
 */

Result = (function(_super) {
  __extends(Result, _super);

  function Result() {
    return Result.__super__.constructor.apply(this, arguments);
  }

  Result.prototype.className = 'result';

  Result.prototype.tagName = 'li';


  /*
  	@param {object} [options={}]
  	@prop {object} options.data - The data of the result.
  	@prop {boolean} [options.fulltext=false] - Is the result coming from a full text search?
  	@constructs
   */

  Result.prototype.initialize = function(options) {
    var _base;
    this.options = options != null ? options : {};
    if ((_base = this.options).fulltext == null) {
      _base.fulltext = false;
    }
    if (this.options.fulltext) {
      this.$el.addClass('fulltext');
    } else {
      this.$el.addClass('no-fulltext');
    }
    return this.render();
  };

  Result.prototype.render = function() {
    var count, found, rtpl, term, _ref;
    found = [];
    _ref = this.options.data.terms;
    for (term in _ref) {
      if (!__hasProp.call(_ref, term)) continue;
      count = _ref[term];
      found.push("" + count + "x " + term);
    }
    if (this.options.config.get('templates').hasOwnProperty('result')) {
      tpl = this.options.config.get('templates').result;
    }
    rtpl = tpl({
      data: this.options.data,
      fulltext: this.options.fulltext,
      found: found.join(', ')
    });
    this.$el.html(rtpl);
    return this;
  };

  Result.prototype.events = function() {
    return {
      'click': '_handleClick',
      'click li[data-layer]': '_handleLayerClick'
    };
  };

  Result.prototype._handleClick = function(ev) {
    return this.trigger('click', this.options.data);
  };

  Result.prototype._handleLayerClick = function(ev) {
    var layer;
    ev.stopPropagation();
    layer = ev.currentTarget.getAttribute('data-layer');
    return this.trigger('layer:click', layer, this.options.data);
  };

  Result.prototype.destroy = function() {
    return this.remove();
  };

  return Result;

})(Backbone.View);

module.exports = Result;


/* TEMPLATE FOR CUSTOM RESULT

class Result extends Backbone.View

	className: 'result'

	tagName: 'li'

	initialize: (@options={}) ->
		@options.fulltext ?= false
		if @options.fulltext then @$el.addClass 'fulltext' else @$el.addClass 'no-fulltext'

		@render()

	render: ->
		found = []
		found.push "#{count}x #{term}" for own term, count of @options.data.terms

		data = _.extend @options,
			data: @options.data
			found: found.join(', ')

		rtpl = tpl data
		@$el.html rtpl

		@

	events: ->
		'click': '_handleClick'

	_handleClick: (ev) ->
		@trigger 'click', @options.data

	destroy: ->
		@remove()

/TEMPLATE
 */



},{"./result.jade":36}],36:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (data, found, fulltext, undefined) {
data.metadata = typeof data.metadata !== 'undefined' ? data.metadata : [];
buf.push("<div class=\"title\">" + (jade.escape(null == (jade_interp = data.name) ? "" : jade_interp)) + "</div><div class=\"metadata\"><ul>");
// iterate data.metadata
;(function(){
  var $$obj = data.metadata;
  if ('number' == typeof $$obj.length) {

    for (var key = 0, $$l = $$obj.length; key < $$l; key++) {
      var value = $$obj[key];

buf.push("<li><span class=\"key\">" + (jade.escape(null == (jade_interp = key+': ') ? "" : jade_interp)) + "</span><span class=\"value\">" + (jade.escape(null == (jade_interp = value) ? "" : jade_interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var key in $$obj) {
      $$l++;      var value = $$obj[key];

buf.push("<li><span class=\"key\">" + (jade.escape(null == (jade_interp = key+': ') ? "" : jade_interp)) + "</span><span class=\"value\">" + (jade.escape(null == (jade_interp = value) ? "" : jade_interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul></div>");
if ( fulltext)
{
buf.push("<div class=\"found\">" + (jade.escape(null == (jade_interp = found) ? "" : jade_interp)) + "</div><div class=\"keywords\"><ul>");
if ( data._kwic != null)
{
// iterate data._kwic
;(function(){
  var $$obj = data._kwic;
  if ('number' == typeof $$obj.length) {

    for (var layer = 0, $$l = $$obj.length; layer < $$l; layer++) {
      var kwic = $$obj[layer];

buf.push("<li" + (jade.attr("data-layer", layer, true, false)) + "><label>" + (jade.escape(null == (jade_interp = layer) ? "" : jade_interp)) + "</label><ul class=\"kwic\">");
// iterate kwic
;(function(){
  var $$obj = kwic;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var row = $$obj[$index];

buf.push("<li>" + (null == (jade_interp = row) ? "" : jade_interp) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var row = $$obj[$index];

buf.push("<li>" + (null == (jade_interp = row) ? "" : jade_interp) + "</li>");
    }

  }
}).call(this);

buf.push("</ul></li>");
    }

  } else {
    var $$l = 0;
    for (var layer in $$obj) {
      $$l++;      var kwic = $$obj[layer];

buf.push("<li" + (jade.attr("data-layer", layer, true, false)) + "><label>" + (jade.escape(null == (jade_interp = layer) ? "" : jade_interp)) + "</label><ul class=\"kwic\">");
// iterate kwic
;(function(){
  var $$obj = kwic;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var row = $$obj[$index];

buf.push("<li>" + (null == (jade_interp = row) ? "" : jade_interp) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var row = $$obj[$index];

buf.push("<li>" + (null == (jade_interp = row) ? "" : jade_interp) + "</li>");
    }

  }
}).call(this);

buf.push("</ul></li>");
    }

  }
}).call(this);

}
buf.push("</ul></div>");
}}.call(this,"data" in locals_for_with?locals_for_with.data:typeof data!=="undefined"?data:undefined,"found" in locals_for_with?locals_for_with.found:typeof found!=="undefined"?found:undefined,"fulltext" in locals_for_with?locals_for_with.fulltext:typeof fulltext!=="undefined"?fulltext:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":11}],37:[function(_dereq_,module,exports){
var $, Backbone, SortLevels, el, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

$ = _dereq_('jquery');

el = _dereq_('funcky.el').el;

tpl = _dereq_('./sort.jade');

SortLevels = (function(_super) {
  __extends(SortLevels, _super);

  function SortLevels() {
    return SortLevels.__super__.constructor.apply(this, arguments);
  }

  SortLevels.prototype.tagName = 'li';

  SortLevels.prototype.className = 'sort-levels';


  /*
  	@param {object} this.options
  	@param {Backbone.Model} this.options.config
   */

  SortLevels.prototype.initialize = function(options) {
    this.options = options != null ? options : {};
    this.render();
    this.listenTo(this.options.config, 'change:entryMetadataFields', this.render);
    return this.listenTo(this.options.config, 'change:levels', (function(_this) {
      return function(model, sortLevels) {
        var level, sortParameters, _i, _len;
        sortParameters = [];
        for (_i = 0, _len = sortLevels.length; _i < _len; _i++) {
          level = sortLevels[_i];
          sortParameters.push({
            fieldname: level,
            direction: 'asc'
          });
        }
        _this.trigger('change', sortParameters);
        return _this.render();
      };
    })(this));
  };

  SortLevels.prototype.render = function() {
    var leave, levels, rtpl;
    rtpl = tpl({
      levels: this.options.config.get('levels'),
      entryMetadataFields: this.options.config.get('entryMetadataFields')
    });
    this.$el.html(rtpl);
    levels = this.$('div.levels');
    leave = function(ev) {
      if (!(el(levels[0]).hasDescendant(ev.target) || levels[0] === ev.target)) {
        return levels.hide();
      }
    };
    this.onMouseleave = leave.bind(this);
    return levels.on('mouseleave', this.onMouseleave);
  };

  SortLevels.prototype.events = function() {
    return {
      'click button.toggle': 'toggleLevels',
      'click li.search button': 'saveLevels',
      'change div.levels select': 'changeLevels',
      'click div.levels i.fa': 'changeAlphaSort'
    };
  };

  SortLevels.prototype.toggleLevels = function(ev) {
    return this.$('div.levels').toggle();
  };

  SortLevels.prototype.hideLevels = function() {
    return this.$('div.levels').hide();
  };

  SortLevels.prototype.changeLevels = function(ev) {
    var $target, i, select, target, _i, _j, _len, _len1, _ref, _ref1, _results;
    this.$('div.levels').addClass('show-save-button');
    target = ev.currentTarget;
    _ref = this.el.querySelectorAll('div.levels select');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      select = _ref[_i];
      if (select.name !== target.name && select.value === target.value) {
        select.selectedIndex = 0;
      }
    }
    _ref1 = this.el.querySelectorAll('div.levels i.fa');
    _results = [];
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      i = _ref1[_j];
      $target = this.$(i);
      $target.addClass('fa-sort-alpha-asc');
      _results.push($target.removeClass('fa-sort-alpha-desc'));
    }
    return _results;
  };

  SortLevels.prototype.changeAlphaSort = function(ev) {
    var $target;
    this.$('div.levels').addClass('show-save-button');
    $target = this.$(ev.currentTarget);
    $target.toggleClass('fa-sort-alpha-asc');
    return $target.toggleClass('fa-sort-alpha-desc');
  };

  SortLevels.prototype.saveLevels = function() {
    var li, select, sortParameter, sortParameters, _i, _len, _ref;
    sortParameters = [];
    _ref = this.el.querySelectorAll('div.levels li[name]');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      li = _ref[_i];
      select = li.querySelector('select');
      sortParameter = {};
      sortParameter.fieldname = select.options[select.selectedIndex].value;
      sortParameter.direction = $(li).find('i.fa').hasClass('fa-sort-alpha-asc') ? 'asc' : 'desc';
      sortParameters.push(sortParameter);
    }
    this.hideLevels();
    return this.trigger('change', sortParameters);
  };

  SortLevels.prototype.destroy = function() {
    this.$('div.levels').off('mouseleave', this.onMouseleave);
    return this.remove();
  };

  return SortLevels;

})(Backbone.View);

module.exports = SortLevels;



},{"./sort.jade":38,"funcky.el":7}],38:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (entryMetadataFields, levels, undefined) {
buf.push("<button class=\"toggle\">Sort<i class=\"fa fa-caret-down\"></i></button><div class=\"levels\"><ul>");
// iterate [1, 2, 3]
;(function(){
  var $$obj = [1, 2, 3];
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var i = $$obj[$index];

buf.push("<li" + (jade.attr("name", 'level'+i, true, false)) + "><label>" + (jade.escape(null == (jade_interp = 'Level '+i) ? "" : jade_interp)) + "</label><select" + (jade.attr("name", 'level'+i, true, false)) + "><option></option>");
// iterate entryMetadataFields
;(function(){
  var $$obj = entryMetadataFields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field==levels[i-1], true, false)) + ">" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field==levels[i-1], true, false)) + ">" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select><i class=\"fa fa-sort-alpha-asc\"></i></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var i = $$obj[$index];

buf.push("<li" + (jade.attr("name", 'level'+i, true, false)) + "><label>" + (jade.escape(null == (jade_interp = 'Level '+i) ? "" : jade_interp)) + "</label><select" + (jade.attr("name", 'level'+i, true, false)) + "><option></option>");
// iterate entryMetadataFields
;(function(){
  var $$obj = entryMetadataFields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field==levels[i-1], true, false)) + ">" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field==levels[i-1], true, false)) + ">" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select><i class=\"fa fa-sort-alpha-asc\"></i></li>");
    }

  }
}).call(this);

buf.push("<li class=\"search\">&nbsp;<button>Change levels</button></li></ul></div>");}.call(this,"entryMetadataFields" in locals_for_with?locals_for_with.entryMetadataFields:typeof entryMetadataFields!=="undefined"?entryMetadataFields:undefined,"levels" in locals_for_with?locals_for_with.levels:typeof levels!=="undefined"?levels:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":11}],39:[function(_dereq_,module,exports){
var Backbone, Models, TextSearch, funcky, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = _dereq_('backbone');

_ = _dereq_('underscore');

Models = {
  Search: _dereq_('../models/search')
};

tpl = _dereq_('../../jade/text-search.jade');

funcky = _dereq_('funcky.util');

TextSearch = (function(_super) {
  __extends(TextSearch, _super);

  function TextSearch() {
    return TextSearch.__super__.constructor.apply(this, arguments);
  }

  TextSearch.prototype.className = 'text-search';

  TextSearch.prototype.initialize = function(options) {
    this.options = options;
    return this.setModel();
  };

  TextSearch.prototype._addFullTextSearchParameters = function() {
    var ftsp, param, params, _i, _len;
    ftsp = this.options.config.get('textSearchOptions').fullTextSearchParameters;
    if (ftsp != null) {
      params = [];
      for (_i = 0, _len = ftsp.length; _i < _len; _i++) {
        param = ftsp[_i];
        params.push({
          name: param,
          term: "*"
        });
      }
      return this.model.set({
        fullTextSearchParameters: params
      });
    }
  };

  TextSearch.prototype.setModel = function() {
    var attrs, textSearchOptions;
    if (this.model != null) {
      this.stopListening(this.model);
    }
    textSearchOptions = this.options.config.get('textSearchOptions');
    attrs = _.clone(textSearchOptions);
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
    this.model = new Models.Search(attrs);
    this._addFullTextSearchParameters();
    return this.listenTo(this.options.config, "change:textSearchOptions", (function(_this) {
      return function() {
        _this._addFullTextSearchParameters();
        return _this.render();
      };
    })(this));
  };

  TextSearch.prototype.render = function() {
    if (this.options.config.get('templates').hasOwnProperty('text-search')) {
      tpl = this.options.config.get('templates')['text-search'];
    }
    this.$el.html(tpl({
      model: this.model,
      config: this.options.config,
      generateId: funcky.generateID
    }));
    return this;
  };

  TextSearch.prototype.events = function() {
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
  };

  TextSearch.prototype.onKeyUp = function(ev) {
    var clone, field, _i, _len;
    if (ev.keyCode === 13) {
      ev.preventDefault();
      return this.search(ev);
    }
    if (this.model.has('term')) {
      if (this.model.get('term') !== ev.currentTarget.value) {
        this.model.set({
          term: ev.currentTarget.value
        });
      }
    } else {
      clone = _.clone(this.model.get('fullTextSearchParameters'));
      for (_i = 0, _len = clone.length; _i < _len; _i++) {
        field = clone[_i];
        field.term = ev.currentTarget.value;
      }
      this.model.set({
        fullTextSearchParameters: clone
      });
    }
    return this.updateQueryModel();
  };

  TextSearch.prototype.checkboxChanged = function(ev) {
    var attr, cb, checkedArray, dataAttr, dataAttrArray, _i, _j, _len, _len1, _ref, _ref1;
    dataAttr = ev.currentTarget.getAttribute('data-attr');
    dataAttrArray = ev.currentTarget.getAttribute('data-attr-array');
    if (attr = dataAttr) {
      if (attr === 'searchInTranscriptions') {
        this.$('ul.textlayers').toggle(ev.currentTarget.checked);
      }
      this.model.set(attr, ev.currentTarget.checked);
    } else if (dataAttrArray === 'fullTextSearchParameters') {
      checkedArray = [];
      _ref = this.el.querySelectorAll('[data-attr-array="fullTextSearchParameters"]');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cb = _ref[_i];
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
      _ref1 = this.el.querySelectorAll("[data-attr-array=\"" + dataAttrArray + "\"]");
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        cb = _ref1[_j];
        if (cb.checked) {
          checkedArray.push(cb.getAttribute('data-value'));
        }
      }
      this.model.set(dataAttrArray, checkedArray);
    }
    return this.updateQueryModel();
  };

  TextSearch.prototype.search = function(ev) {
    ev.preventDefault();
    return this.trigger('search');
  };

  TextSearch.prototype.updateQueryModel = function() {
    return this.trigger('change', this.model.attributes);
  };

  TextSearch.prototype.reset = function() {
    this.setModel();
    return this.render();
  };

  TextSearch.prototype.destroy = function() {
    return this.remove();
  };

  return TextSearch;

})(Backbone.View);

module.exports = TextSearch;



},{"../../jade/text-search.jade":47,"../models/search":22,"funcky.util":9}],40:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (options, ucfirst, undefined) {
buf.push("<ul>");
// iterate options
;(function(){
  var $$obj = options;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var option = $$obj[$index];

buf.push("<li><div class=\"row span6\"><div class=\"cell span5\"><i" + (jade.attr("data-value", option.name, true, false)) + (jade.cls([option.checked?'fa fa-check-square-o':'fa fa-square-o'], [true])) + "></i><label" + (jade.attr("data-value", option.name, true, false)) + ">" + (jade.escape(null == (jade_interp = ucfirst(option.name)) ? "" : jade_interp)) + "</label></div><div class=\"cell span1 alignright\"><div class=\"count\">" + (jade.escape(null == (jade_interp = option.count) ? "" : jade_interp)) + "</div></div></div></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var option = $$obj[$index];

buf.push("<li><div class=\"row span6\"><div class=\"cell span5\"><i" + (jade.attr("data-value", option.name, true, false)) + (jade.cls([option.checked?'fa fa-check-square-o':'fa fa-square-o'], [true])) + "></i><label" + (jade.attr("data-value", option.name, true, false)) + ">" + (jade.escape(null == (jade_interp = ucfirst(option.name)) ? "" : jade_interp)) + "</label></div><div class=\"cell span1 alignright\"><div class=\"count\">" + (jade.escape(null == (jade_interp = option.count) ? "" : jade_interp)) + "</div></div></div></li>");
    }

  }
}).call(this);

buf.push("</ul>");}.call(this,"options" in locals_for_with?locals_for_with.options:typeof options!=="undefined"?options:undefined,"ucfirst" in locals_for_with?locals_for_with.ucfirst:typeof ucfirst!=="undefined"?ucfirst:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":11}],41:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (name, options, title, undefined) {
buf.push("<header><h3" + (jade.attr("data-name", name, true, false)) + ">" + (jade.escape(null == (jade_interp = title) ? "" : jade_interp)) + "</h3></header><div class=\"body\"><label>From:</label><select>");
// iterate options
;(function(){
  var $$obj = options;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var option = $$obj[$index];

buf.push("<option>" + (jade.escape(null == (jade_interp = option) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var option = $$obj[$index];

buf.push("<option>" + (jade.escape(null == (jade_interp = option) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select><label>To:</label><select>");
// iterate options.reverse()
;(function(){
  var $$obj = options.reverse();
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var option = $$obj[$index];

buf.push("<option>" + (jade.escape(null == (jade_interp = option) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var option = $$obj[$index];

buf.push("<option>" + (jade.escape(null == (jade_interp = option) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></div>");}.call(this,"name" in locals_for_with?locals_for_with.name:typeof name!=="undefined"?name:undefined,"options" in locals_for_with?locals_for_with.options:typeof options!=="undefined"?options:undefined,"title" in locals_for_with?locals_for_with.title:typeof title!=="undefined"?title:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":11}],42:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<ul></ul>");;return buf.join("");
};
},{"jade/runtime":11}],43:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<input type=\"checkbox\" name=\"all\"/><input type=\"text\" name=\"filter\"/><small class=\"optioncount\"></small>");;return buf.join("");
};
},{"jade/runtime":11}],44:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (option) {
buf.push("<li" + (jade.attr("data-count", option.get('count'), true, false)) + (jade.attr("data-value", option.id, true, false)) + (jade.cls([option.get('checked')?'checked':null], [true])) + "><i" + (jade.attr("data-value", option.id, true, false)) + " class=\"unchecked fa fa-square-o\"></i><i" + (jade.attr("data-value", option.id, true, false)) + " class=\"checked fa fa-check-square-o\"></i><label" + (jade.attr("data-value", option.id, true, false)) + ">" + (null == (jade_interp = option.id === ':empty' ? '<em>(empty)</em>' : option.id) ? "" : jade_interp) + "</label><div class=\"count\">" + (jade.escape(null == (jade_interp = option.get('count') === 0 ? option.get('total') : option.get('count')) ? "" : jade_interp)) + "</div></li>");}.call(this,"option" in locals_for_with?locals_for_with.option:typeof option!=="undefined"?option:undefined));;return buf.join("");
};
},{"jade/runtime":11}],45:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (config, model, options) {
options = model.get('options')
buf.push("<div class=\"placeholder\"><header><h3>" + (jade.escape(null == (jade_interp = model.get('title')) ? "" : jade_interp)) + "</h3><div class=\"menu\">");
if ( options != null && options.length != null && options.length > 9)
{
buf.push("<i" + (jade.attr("title", config.get('labels').filterOptions, true, false)) + " class=\"filter fa fa-filter\"></i><i" + (jade.attr("title", config.get('labels').sortAlphabetically, true, false)) + " class=\"alpha fa fa-sort-alpha-asc\"></i><i" + (jade.attr("title", config.get('labels').sortNumerically, true, false)) + " class=\"amount active fa fa-sort-amount-desc\"></i>");
}
buf.push("</div><div class=\"options\"></div></header><div class=\"body\"></div></div>");}.call(this,"config" in locals_for_with?locals_for_with.config:typeof config!=="undefined"?config:undefined,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined,"options" in locals_for_with?locals_for_with.options:typeof options!=="undefined"?options:undefined));;return buf.join("");
};
},{"jade/runtime":11}],46:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<div class=\"overlay\"><div><i class=\"fa fa-spinner fa-spin fa-2x\"></i></div></div><div class=\"faceted-search\"><div class=\"text-search-placeholder\"></div><ul class=\"facets-menu\"><li class=\"reset\"><button><i class=\"fa fa-refresh\"></i><span>New search</span></button></li><li class=\"switch\"><button><i class=\"fa fa-angle-double-up\"></i><i class=\"fa fa-angle-double-down\"></i><span class=\"simple\">Simple search</span><span class=\"advanced\">Advanced search</span></button></li><li class=\"collapse-expand\"><button><i class=\"fa fa-compress\"></i><span>Collapse filters</span></button></li></ul><div class=\"facets-placeholder\"></div></div><div class=\"results\"></div>");;return buf.join("");
};
},{"jade/runtime":11}],47:[function(_dereq_,module,exports){
var jade = _dereq_("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (config, generateId, id, model, undefined) {
buf.push("<div class=\"placeholder\"><div class=\"body\"><div class=\"search-input\"><input type=\"text\" name=\"search\"/><i class=\"fa fa-search\"></i></div><div class=\"menu\"><i class=\"fa fa-times\"></i><div class=\"close\"></div><ul class=\"options\">");
if ( config.get('textSearchOptions').caseSensitive)
{
id = generateId()
buf.push("<li class=\"option case-sensitive\"><input" + (jade.attr("id", id, true, false)) + " type=\"checkbox\" data-attr=\"caseSensitive\"/><label" + (jade.attr("for", id, true, false)) + ">Match case</label></li>");
}
if ( config.get('textSearchOptions').fuzzy)
{
id = generateId()
buf.push("<li class=\"option fuzzy\"><input" + (jade.attr("id", id, true, false)) + " type=\"checkbox\" data-attr=\"fuzzy\"/><label" + (jade.attr("for", id, true, false)) + ">Fuzzy</label></li>");
}
if ( model.has('searchInAnnotations') || model.has('searchInTranscriptions'))
{
buf.push("<li class=\"option search-annotations\"><h4>Search in:</h4><ul class=\"searchins\">");
if ( model.has('searchInTranscriptions'))
{
id = generateId()
buf.push("<li class=\"searchin\"><input" + (jade.attr("id", id, true, false)) + " type=\"checkbox\" data-attr=\"searchInTranscriptions\"" + (jade.attr("checked", model.get('searchInTranscriptions'), true, false)) + "/><label" + (jade.attr("for", id, true, false)) + ">Transcriptions</label></li>");
}
if ( model.has('searchInAnnotations'))
{
id = generateId()
buf.push("<li class=\"searchin\"><input" + (jade.attr("id", id, true, false)) + " type=\"checkbox\" data-attr=\"searchInAnnotations\"" + (jade.attr("checked", model.get('searchInAnnotations'), true, false)) + "/><label" + (jade.attr("for", id, true, false)) + ">Annotations</label></li>");
}
buf.push("</ul></li>");
}
if ( model.has('textLayers') && model.get('textLayers').length > 1)
{
buf.push("<li class=\"option search-textlayers\"><h4>Textlayers:</h4><ul class=\"textlayers\">");
// iterate model.get('textLayers')
;(function(){
  var $$obj = model.get('textLayers');
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var textLayer = $$obj[$index];

buf.push("<li class=\"textlayer\"><input" + (jade.attr("id", 'cb_textlayer'+textLayer, true, false)) + " type=\"checkbox\" data-attr-array=\"textLayers\"" + (jade.attr("data-value", textLayer, true, false)) + " checked=\"checked\"/><label" + (jade.attr("for", 'cb_textlayer'+textLayer, true, false)) + ">" + (jade.escape(null == (jade_interp = textLayer) ? "" : jade_interp)) + "</label></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var textLayer = $$obj[$index];

buf.push("<li class=\"textlayer\"><input" + (jade.attr("id", 'cb_textlayer'+textLayer, true, false)) + " type=\"checkbox\" data-attr-array=\"textLayers\"" + (jade.attr("data-value", textLayer, true, false)) + " checked=\"checked\"/><label" + (jade.attr("for", 'cb_textlayer'+textLayer, true, false)) + ">" + (jade.escape(null == (jade_interp = textLayer) ? "" : jade_interp)) + "</label></li>");
    }

  }
}).call(this);

buf.push("</ul></li>");
}
var fields = config.get('textSearchOptions').fullTextSearchParameters;
if ( fields != null && fields.length > 1)
{
buf.push("<li class=\"option fields\"><h4>" + (jade.escape(null == (jade_interp = config.get('labels').fullTextSearchParameters) ? "" : jade_interp)) + "</h4><ul class=\"fields\">");
// iterate fields
;(function(){
  var $$obj = fields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var field = $$obj[$index];

id = generateId()
buf.push("<li><input type=\"checkbox\" checked=\"checked\"" + (jade.attr("name", field, true, false)) + (jade.attr("id", id, true, false)) + " data-attr-array=\"fullTextSearchParameters\"" + (jade.attr("data-value", field, true, false)) + "/><label" + (jade.attr("for", id, true, false)) + ">" + (jade.escape(null == (jade_interp = config.get('facetTitleMap')[field]) ? "" : jade_interp)) + "</label></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var field = $$obj[$index];

id = generateId()
buf.push("<li><input type=\"checkbox\" checked=\"checked\"" + (jade.attr("name", field, true, false)) + (jade.attr("id", id, true, false)) + " data-attr-array=\"fullTextSearchParameters\"" + (jade.attr("data-value", field, true, false)) + "/><label" + (jade.attr("for", id, true, false)) + ">" + (jade.escape(null == (jade_interp = config.get('facetTitleMap')[field]) ? "" : jade_interp)) + "</label></li>");
    }

  }
}).call(this);

buf.push("</ul></li>");
}
buf.push("</ul></div></div></div>");}.call(this,"config" in locals_for_with?locals_for_with.config:typeof config!=="undefined"?config:undefined,"generateId" in locals_for_with?locals_for_with.generateId:typeof generateId!=="undefined"?generateId:undefined,"id" in locals_for_with?locals_for_with.id:typeof id!=="undefined"?id:undefined,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":11}]},{},[15])
(15)
});
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],36:[function(require,module,exports){
(function (global){
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jade = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return (Array.isArray(val) ? val.map(joinClasses) :
    (val && typeof val === 'object') ? Object.keys(val).filter(function (key) { return val[key]; }) :
    [val]).filter(nulls).join(' ');
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};


exports.style = function (val) {
  if (val && typeof val === 'object') {
    return Object.keys(val).map(function (style) {
      return style + ':' + val[style];
    }).join(';');
  } else {
    return val;
  }
};
/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if (key === 'style') {
    val = exports.style(val);
  }
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    if (JSON.stringify(val).indexOf('&') !== -1) {
      console.warn('Since Jade 2.0.0, ampersands (`&`) in data attributes ' +
                   'will be escaped to `&amp;`');
    };
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will eliminate the double quotes around dates in ' +
                   'ISO form after 2.0.0');
    }
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will stringify dates in ISO form after 2.0.0');
    }
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will stringify dates in ISO form after 2.0.0');
    }
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

var jade_encode_html_rules = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
};
var jade_match_html = /[&<>"]/g;

function jade_encode_char(c) {
  return jade_encode_html_rules[c] || c;
}

exports.escape = jade_escape;
function jade_escape(html){
  var result = String(html).replace(jade_match_html, jade_encode_char);
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str = str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

exports.DebugItem = function DebugItem(lineno, filename) {
  this.lineno = lineno;
  this.filename = filename;
}

},{"fs":2}],2:[function(require,module,exports){

},{}]},{},[1])(1)
});
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"fs":1}],37:[function(require,module,exports){
//  Underscore.string
//  (c) 2010 Esa-Matti Suuronen <esa-matti aet suuronen dot org>
//  Underscore.string is freely distributable under the terms of the MIT license.
//  Documentation: https://github.com/epeli/underscore.string
//  Some code is borrowed from MooTools and Alexandru Marasteanu.
//  Version '2.3.2'

!function(root, String){
  'use strict';

  // Defining helper functions.

  var nativeTrim = String.prototype.trim;
  var nativeTrimRight = String.prototype.trimRight;
  var nativeTrimLeft = String.prototype.trimLeft;

  var parseNumber = function(source) { return source * 1 || 0; };

  var strRepeat = function(str, qty){
    if (qty < 1) return '';
    var result = '';
    while (qty > 0) {
      if (qty & 1) result += str;
      qty >>= 1, str += str;
    }
    return result;
  };

  var slice = [].slice;

  var defaultToWhiteSpace = function(characters) {
    if (characters == null)
      return '\\s';
    else if (characters.source)
      return characters.source;
    else
      return '[' + _s.escapeRegExp(characters) + ']';
  };

  // Helper for toBoolean
  function boolMatch(s, matchers) {
    var i, matcher, down = s.toLowerCase();
    matchers = [].concat(matchers);
    for (i = 0; i < matchers.length; i += 1) {
      matcher = matchers[i];
      if (!matcher) continue;
      if (matcher.test && matcher.test(s)) return true;
      if (matcher.toLowerCase() === down) return true;
    }
  }

  var escapeChars = {
    lt: '<',
    gt: '>',
    quot: '"',
    amp: '&',
    apos: "'"
  };

  var reversedEscapeChars = {};
  for(var key in escapeChars) reversedEscapeChars[escapeChars[key]] = key;
  reversedEscapeChars["'"] = '#39';

  // sprintf() for JavaScript 0.7-beta1
  // http://www.diveintojavascript.com/projects/javascript-sprintf
  //
  // Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
  // All rights reserved.

  var sprintf = (function() {
    function get_type(variable) {
      return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
    }

    var str_repeat = strRepeat;

    var str_format = function() {
      if (!str_format.cache.hasOwnProperty(arguments[0])) {
        str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
      }
      return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
    };

    str_format.format = function(parse_tree, argv) {
      var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
      for (i = 0; i < tree_length; i++) {
        node_type = get_type(parse_tree[i]);
        if (node_type === 'string') {
          output.push(parse_tree[i]);
        }
        else if (node_type === 'array') {
          match = parse_tree[i]; // convenience purposes only
          if (match[2]) { // keyword argument
            arg = argv[cursor];
            for (k = 0; k < match[2].length; k++) {
              if (!arg.hasOwnProperty(match[2][k])) {
                throw new Error(sprintf('[_.sprintf] property "%s" does not exist', match[2][k]));
              }
              arg = arg[match[2][k]];
            }
          } else if (match[1]) { // positional argument (explicit)
            arg = argv[match[1]];
          }
          else { // positional argument (implicit)
            arg = argv[cursor++];
          }

          if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
            throw new Error(sprintf('[_.sprintf] expecting number but found %s', get_type(arg)));
          }
          switch (match[8]) {
            case 'b': arg = arg.toString(2); break;
            case 'c': arg = String.fromCharCode(arg); break;
            case 'd': arg = parseInt(arg, 10); break;
            case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
            case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
            case 'o': arg = arg.toString(8); break;
            case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
            case 'u': arg = Math.abs(arg); break;
            case 'x': arg = arg.toString(16); break;
            case 'X': arg = arg.toString(16).toUpperCase(); break;
          }
          arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
          pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
          pad_length = match[6] - String(arg).length;
          pad = match[6] ? str_repeat(pad_character, pad_length) : '';
          output.push(match[5] ? arg + pad : pad + arg);
        }
      }
      return output.join('');
    };

    str_format.cache = {};

    str_format.parse = function(fmt) {
      var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
      while (_fmt) {
        if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
          parse_tree.push(match[0]);
        }
        else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
          parse_tree.push('%');
        }
        else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
          if (match[2]) {
            arg_names |= 1;
            var field_list = [], replacement_field = match[2], field_match = [];
            if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
              field_list.push(field_match[1]);
              while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
                if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else {
                  throw new Error('[_.sprintf] huh?');
                }
              }
            }
            else {
              throw new Error('[_.sprintf] huh?');
            }
            match[2] = field_list;
          }
          else {
            arg_names |= 2;
          }
          if (arg_names === 3) {
            throw new Error('[_.sprintf] mixing positional and named placeholders is not (yet) supported');
          }
          parse_tree.push(match);
        }
        else {
          throw new Error('[_.sprintf] huh?');
        }
        _fmt = _fmt.substring(match[0].length);
      }
      return parse_tree;
    };

    return str_format;
  })();



  // Defining underscore.string

  var _s = {

    VERSION: '2.3.0',

    isBlank: function(str){
      if (str == null) str = '';
      return (/^\s*$/).test(str);
    },

    stripTags: function(str){
      if (str == null) return '';
      return String(str).replace(/<\/?[^>]+>/g, '');
    },

    capitalize : function(str){
      str = str == null ? '' : String(str);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    chop: function(str, step){
      if (str == null) return [];
      str = String(str);
      step = ~~step;
      return step > 0 ? str.match(new RegExp('.{1,' + step + '}', 'g')) : [str];
    },

    clean: function(str){
      return _s.strip(str).replace(/\s+/g, ' ');
    },

    count: function(str, substr){
      if (str == null || substr == null) return 0;

      str = String(str);
      substr = String(substr);

      var count = 0,
        pos = 0,
        length = substr.length;

      while (true) {
        pos = str.indexOf(substr, pos);
        if (pos === -1) break;
        count++;
        pos += length;
      }

      return count;
    },

    chars: function(str) {
      if (str == null) return [];
      return String(str).split('');
    },

    swapCase: function(str) {
      if (str == null) return '';
      return String(str).replace(/\S/g, function(c){
        return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
      });
    },

    escapeHTML: function(str) {
      if (str == null) return '';
      return String(str).replace(/[&<>"']/g, function(m){ return '&' + reversedEscapeChars[m] + ';'; });
    },

    unescapeHTML: function(str) {
      if (str == null) return '';
      return String(str).replace(/\&([^;]+);/g, function(entity, entityCode){
        var match;

        if (entityCode in escapeChars) {
          return escapeChars[entityCode];
        } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
          return String.fromCharCode(parseInt(match[1], 16));
        } else if (match = entityCode.match(/^#(\d+)$/)) {
          return String.fromCharCode(~~match[1]);
        } else {
          return entity;
        }
      });
    },

    escapeRegExp: function(str){
      if (str == null) return '';
      return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
    },

    splice: function(str, i, howmany, substr){
      var arr = _s.chars(str);
      arr.splice(~~i, ~~howmany, substr);
      return arr.join('');
    },

    insert: function(str, i, substr){
      return _s.splice(str, i, 0, substr);
    },

    include: function(str, needle){
      if (needle === '') return true;
      if (str == null) return false;
      return String(str).indexOf(needle) !== -1;
    },

    join: function() {
      var args = slice.call(arguments),
        separator = args.shift();

      if (separator == null) separator = '';

      return args.join(separator);
    },

    lines: function(str) {
      if (str == null) return [];
      return String(str).split("\n");
    },

    reverse: function(str){
      return _s.chars(str).reverse().join('');
    },

    startsWith: function(str, starts){
      if (starts === '') return true;
      if (str == null || starts == null) return false;
      str = String(str); starts = String(starts);
      return str.length >= starts.length && str.slice(0, starts.length) === starts;
    },

    endsWith: function(str, ends){
      if (ends === '') return true;
      if (str == null || ends == null) return false;
      str = String(str); ends = String(ends);
      return str.length >= ends.length && str.slice(str.length - ends.length) === ends;
    },

    succ: function(str){
      if (str == null) return '';
      str = String(str);
      return str.slice(0, -1) + String.fromCharCode(str.charCodeAt(str.length-1) + 1);
    },

    titleize: function(str){
      if (str == null) return '';
      str  = String(str).toLowerCase();
      return str.replace(/(?:^|\s|-)\S/g, function(c){ return c.toUpperCase(); });
    },

    camelize: function(str){
      return _s.trim(str).replace(/[-_\s]+(.)?/g, function(match, c){ return c ? c.toUpperCase() : ""; });
    },

    underscored: function(str){
      return _s.trim(str).replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
    },

    dasherize: function(str){
      return _s.trim(str).replace(/([A-Z])/g, '-$1').replace(/[-_\s]+/g, '-').toLowerCase();
    },

    classify: function(str){
      return _s.titleize(String(str).replace(/[\W_]/g, ' ')).replace(/\s/g, '');
    },

    humanize: function(str){
      return _s.capitalize(_s.underscored(str).replace(/_id$/,'').replace(/_/g, ' '));
    },

    trim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrim) return nativeTrim.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp('\^' + characters + '+|' + characters + '+$', 'g'), '');
    },

    ltrim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrimLeft) return nativeTrimLeft.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp('^' + characters + '+'), '');
    },

    rtrim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrimRight) return nativeTrimRight.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp(characters + '+$'), '');
    },

    truncate: function(str, length, truncateStr){
      if (str == null) return '';
      str = String(str); truncateStr = truncateStr || '...';
      length = ~~length;
      return str.length > length ? str.slice(0, length) + truncateStr : str;
    },

    /**
     * _s.prune: a more elegant version of truncate
     * prune extra chars, never leaving a half-chopped word.
     * @author github.com/rwz
     */
    prune: function(str, length, pruneStr){
      if (str == null) return '';

      str = String(str); length = ~~length;
      pruneStr = pruneStr != null ? String(pruneStr) : '...';

      if (str.length <= length) return str;

      var tmpl = function(c){ return c.toUpperCase() !== c.toLowerCase() ? 'A' : ' '; },
        template = str.slice(0, length+1).replace(/.(?=\W*\w*$)/g, tmpl); // 'Hello, world' -> 'HellAA AAAAA'

      if (template.slice(template.length-2).match(/\w\w/))
        template = template.replace(/\s*\S+$/, '');
      else
        template = _s.rtrim(template.slice(0, template.length-1));

      return (template+pruneStr).length > str.length ? str : str.slice(0, template.length)+pruneStr;
    },

    words: function(str, delimiter) {
      if (_s.isBlank(str)) return [];
      return _s.trim(str, delimiter).split(delimiter || /\s+/);
    },

    pad: function(str, length, padStr, type) {
      str = str == null ? '' : String(str);
      length = ~~length;

      var padlen  = 0;

      if (!padStr)
        padStr = ' ';
      else if (padStr.length > 1)
        padStr = padStr.charAt(0);

      switch(type) {
        case 'right':
          padlen = length - str.length;
          return str + strRepeat(padStr, padlen);
        case 'both':
          padlen = length - str.length;
          return strRepeat(padStr, Math.ceil(padlen/2)) + str
                  + strRepeat(padStr, Math.floor(padlen/2));
        default: // 'left'
          padlen = length - str.length;
          return strRepeat(padStr, padlen) + str;
        }
    },

    lpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr);
    },

    rpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr, 'right');
    },

    lrpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr, 'both');
    },

    sprintf: sprintf,

    vsprintf: function(fmt, argv){
      argv.unshift(fmt);
      return sprintf.apply(null, argv);
    },

    toNumber: function(str, decimals) {
      if (!str) return 0;
      str = _s.trim(str);
      if (!str.match(/^-?\d+(?:\.\d+)?$/)) return NaN;
      return parseNumber(parseNumber(str).toFixed(~~decimals));
    },

    numberFormat : function(number, dec, dsep, tsep) {
      if (isNaN(number) || number == null) return '';

      number = number.toFixed(~~dec);
      tsep = typeof tsep == 'string' ? tsep : ',';

      var parts = number.split('.'), fnums = parts[0],
        decimals = parts[1] ? (dsep || '.') + parts[1] : '';

      return fnums.replace(/(\d)(?=(?:\d{3})+$)/g, '$1' + tsep) + decimals;
    },

    strRight: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.indexOf(sep);
      return ~pos ? str.slice(pos+sep.length, str.length) : str;
    },

    strRightBack: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.lastIndexOf(sep);
      return ~pos ? str.slice(pos+sep.length, str.length) : str;
    },

    strLeft: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.indexOf(sep);
      return ~pos ? str.slice(0, pos) : str;
    },

    strLeftBack: function(str, sep){
      if (str == null) return '';
      str += ''; sep = sep != null ? ''+sep : sep;
      var pos = str.lastIndexOf(sep);
      return ~pos ? str.slice(0, pos) : str;
    },

    toSentence: function(array, separator, lastSeparator, serial) {
      separator = separator || ', ';
      lastSeparator = lastSeparator || ' and ';
      var a = array.slice(), lastMember = a.pop();

      if (array.length > 2 && serial) lastSeparator = _s.rtrim(separator) + lastSeparator;

      return a.length ? a.join(separator) + lastSeparator + lastMember : lastMember;
    },

    toSentenceSerial: function() {
      var args = slice.call(arguments);
      args[3] = true;
      return _s.toSentence.apply(_s, args);
    },

    slugify: function(str) {
      if (str == null) return '';

      var from  = "ąàáäâãåæăćęèéëêìíïîłńòóöôõøśșțùúüûñçżź",
          to    = "aaaaaaaaaceeeeeiiiilnoooooosstuuuunczz",
          regex = new RegExp(defaultToWhiteSpace(from), 'g');

      str = String(str).toLowerCase().replace(regex, function(c){
        var index = from.indexOf(c);
        return to.charAt(index) || '-';
      });

      return _s.dasherize(str.replace(/[^\w\s-]/g, ''));
    },

    surround: function(str, wrapper) {
      return [wrapper, str, wrapper].join('');
    },

    quote: function(str, quoteChar) {
      return _s.surround(str, quoteChar || '"');
    },

    unquote: function(str, quoteChar) {
      quoteChar = quoteChar || '"';
      if (str[0] === quoteChar && str[str.length-1] === quoteChar)
        return str.slice(1,str.length-1);
      else return str;
    },

    exports: function() {
      var result = {};

      for (var prop in this) {
        if (!this.hasOwnProperty(prop) || prop.match(/^(?:include|contains|reverse)$/)) continue;
        result[prop] = this[prop];
      }

      return result;
    },

    repeat: function(str, qty, separator){
      if (str == null) return '';

      qty = ~~qty;

      // using faster implementation if separator is not needed;
      if (separator == null) return strRepeat(String(str), qty);

      // this one is about 300x slower in Google Chrome
      for (var repeat = []; qty > 0; repeat[--qty] = str) {}
      return repeat.join(separator);
    },

    naturalCmp: function(str1, str2){
      if (str1 == str2) return 0;
      if (!str1) return -1;
      if (!str2) return 1;

      var cmpRegex = /(\.\d+)|(\d+)|(\D+)/g,
        tokens1 = String(str1).toLowerCase().match(cmpRegex),
        tokens2 = String(str2).toLowerCase().match(cmpRegex),
        count = Math.min(tokens1.length, tokens2.length);

      for(var i = 0; i < count; i++) {
        var a = tokens1[i], b = tokens2[i];

        if (a !== b){
          var num1 = parseInt(a, 10);
          if (!isNaN(num1)){
            var num2 = parseInt(b, 10);
            if (!isNaN(num2) && num1 - num2)
              return num1 - num2;
          }
          return a < b ? -1 : 1;
        }
      }

      if (tokens1.length === tokens2.length)
        return tokens1.length - tokens2.length;

      return str1 < str2 ? -1 : 1;
    },

    levenshtein: function(str1, str2) {
      if (str1 == null && str2 == null) return 0;
      if (str1 == null) return String(str2).length;
      if (str2 == null) return String(str1).length;

      str1 = String(str1); str2 = String(str2);

      var current = [], prev, value;

      for (var i = 0; i <= str2.length; i++)
        for (var j = 0; j <= str1.length; j++) {
          if (i && j)
            if (str1.charAt(j - 1) === str2.charAt(i - 1))
              value = prev;
            else
              value = Math.min(current[j], current[j - 1], prev) + 1;
          else
            value = i + j;

          prev = current[j];
          current[j] = value;
        }

      return current.pop();
    },

    toBoolean: function(str, trueValues, falseValues) {
      if (typeof str === "number") str = "" + str;
      if (typeof str !== "string") return !!str;
      str = _s.trim(str);
      if (boolMatch(str, trueValues || ["true", "1"])) return true;
      if (boolMatch(str, falseValues || ["false", "0"])) return false;
    }
  };

  // Aliases

  _s.strip    = _s.trim;
  _s.lstrip   = _s.ltrim;
  _s.rstrip   = _s.rtrim;
  _s.center   = _s.lrpad;
  _s.rjust    = _s.lpad;
  _s.ljust    = _s.rpad;
  _s.contains = _s.include;
  _s.q        = _s.quote;
  _s.toBool   = _s.toBoolean;

  // Exporting

  // CommonJS module is defined
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports)
      module.exports = _s;

    exports._s = _s;
  }

  // Register as a named module with AMD.
  if (typeof define === 'function' && define.amd)
    define('underscore.string', [], function(){ return _s; });


  // Integrate with Underscore.js if defined
  // or create our own underscore object.
  root._ = root._ || {};
  root._.string = root._.str = _s;
}(this, String);

},{}],38:[function(require,module,exports){
module.exports={
  "name": "huygens-elaborate-work-environment",
  "version": "1.2.1",
  "author": {
    "name": "Gijsjan Brouwer",
    "email": "gijsjan.brouwer@huygens.knaw.nl"
  },
  "main": "app/index.js",
  "repository": {
    "type": "git",
    "url": ""
  },
  "scripts": {
    "build": "gulp build",
    "compile": "gulp compile",
    "start": "gulp",
    "test": "nightwatch"
  },
  "devDependencies": {
    "async": "^0.9.0",
    "backbone": "^1.0.0",
    "browser-sync": "^1.3.2",
    "browserify": "^3.28.2",
    "coffee-script": "^1.7.1",
    "coffeeify": "^0.6.0",
    "connect-modrewrite": "^0.7.7",
    "envify": "^1.2.1",
    "font-awesome": "*",
    "gulp": "^3.6.2",
    "gulp-clean": "^0.2.4",
    "gulp-coffee": "^1.4.3",
    "gulp-concat": "^2.1.7",
    "gulp-connect": "^2.0.6",
    "gulp-jade": "^0.5.0",
    "gulp-minify-css": "^0.3.7",
    "gulp-preprocess": "^1.1.1",
    "gulp-rename": "^1.0.0",
    "gulp-stylus": "^1.3.0",
    "gulp-uglify": "^0.2.1",
    "gulp-util": "^2.2.20",
    "hilib": "git+https://github.com/HuygensING/hilib.git#v0.0.7",
    "huygens-faceted-search": "git+https://github.com/HuygensING/faceted-search.git#v2.3.1",
    "jade": "^1.5.0",
    "jadeify": "^2.1.1",
    "jquery": "~2.1.0",
    "markdown": "~0.5.0",
    "nib": "^1.0.2",
    "nightwatch": "^0.4.17",
    "rimraf": "^2.2.8",
    "rsyncwrapper": "^0.4.0",
    "stylus": "^0.45.1",
    "underscore": "^1.6.0",
    "underscore.string": "~2.3.3",
    "vinyl-source-stream": "^0.1.1",
    "watchify": "^0.6.4"
  }
}

},{}],39:[function(require,module,exports){
var $, Backbone, Views, history, mainRouter, projects;

Backbone = require('backbone');

$ = require('jquery');

Backbone.$ = $;

history = require('hilib/src/managers/history');

mainRouter = require('./routers/main');

projects = require('./collections/projects');

Views = {
  Header: require('./views/ui/header')
};


/* DEBUG */

Backbone.on('authorized', function() {
  return console.log('[debug] authorized');
});

Backbone.on('unauthorized', function() {
  return console.log('[debug] unauthorized');
});


/* /DEBUG */

module.exports = function() {
  Backbone.history.start({
    pushState: true
  });
  mainRouter.init();
  return $(document).on('click', 'a:not([data-bypass])', function(e) {
    var href;
    href = $(this).attr('href');
    if (href != null) {
      e.preventDefault();
      return Backbone.history.navigate(href, {
        'trigger': true
      });
    }
  });
};


},{"./collections/projects":46,"./routers/main":69,"./views/ui/header":94,"hilib/src/managers/history":5}],40:[function(require,module,exports){
var Annotations, Base, Models, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../models/config');

Base = require('./base');

Models = {
  Annotation: require('../models/annotation')
};

Annotations = (function(_super) {
  __extends(Annotations, _super);

  function Annotations() {
    return Annotations.__super__.constructor.apply(this, arguments);
  }

  Annotations.prototype.model = Models.Annotation;

  Annotations.prototype.initialize = function(models, options) {
    return this.projectId = options.projectId, this.entryId = options.entryId, this.transcriptionId = options.transcriptionId, options;
  };

  Annotations.prototype.url = function() {
    return "" + (config.get('restUrl')) + "projects/" + this.projectId + "/entries/" + this.entryId + "/transcriptions/" + this.transcriptionId + "/annotations";
  };

  return Annotations;

})(Base);

module.exports = Annotations;


},{"../models/annotation":52,"../models/config":54,"./base":41}],41:[function(require,module,exports){
var Backbone, Base, Pubsub, token, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

token = require('hilib/src/managers/token');

Pubsub = require('hilib/src/mixins/pubsub');

Base = (function(_super) {
  __extends(Base, _super);

  function Base() {
    return Base.__super__.constructor.apply(this, arguments);
  }

  Base.prototype.token = null;

  Base.prototype.initialize = function() {
    return _.extend(this, Pubsub);
  };

  Base.prototype.sync = function(method, model, options) {
    options.beforeSend = (function(_this) {
      return function(xhr) {
        return xhr.setRequestHeader('Authorization', "" + (token.getType()) + " " + (token.get()));
      };
    })(this);
    return Base.__super__.sync.call(this, method, model, options);
  };

  Base.prototype.removeById = function(id) {
    var model;
    model = this.get(id);
    return this.remove(model);
  };

  return Base;

})(Backbone.Collection);

module.exports = Base;


},{"hilib/src/managers/token":7,"hilib/src/mixins/pubsub":14}],42:[function(require,module,exports){
var Base, Entries, Models, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../models/config');

Base = require('./base');

Models = {
  Entry: require('../models/entry')
};

Entries = (function(_super) {
  __extends(Entries, _super);

  function Entries() {
    return Entries.__super__.constructor.apply(this, arguments);
  }

  Entries.prototype.model = Models.Entry;

  Entries.prototype.initialize = function(models, options) {
    Entries.__super__.initialize.apply(this, arguments);
    this.projectId = options.projectId;
    this.current = null;
    return this.changed = [];
  };

  Entries.prototype.url = function() {
    return "" + (config.get('restUrl')) + "projects/" + this.projectId + "/entries";
  };

  Entries.prototype.setCurrent = function(modelID) {
    var model;
    model = this.get(modelID);
    this.trigger('current:change', model);
    return this.current = model;
  };

  Entries.prototype.previous = function() {
    var model, previousIndex;
    previousIndex = this.indexOf(this.current) - 1;
    model = this.at(previousIndex);
    return this.setCurrent(model);
  };

  Entries.prototype.next = function() {
    var model, nextIndex;
    nextIndex = this.indexOf(this.current) + 1;
    model = this.at(nextIndex);
    return this.setCurrent(model);
  };

  return Entries;

})(Base);

module.exports = Entries;


},{"../models/config":54,"../models/entry":56,"./base":41}],43:[function(require,module,exports){
var Base, Facsimiles, Models, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../models/config');

Base = require('./base');

Models = {
  Facsimile: require('../models/facsimile')
};

Facsimiles = (function(_super) {
  __extends(Facsimiles, _super);

  function Facsimiles() {
    return Facsimiles.__super__.constructor.apply(this, arguments);
  }

  Facsimiles.prototype.model = Models.Facsimile;

  Facsimiles.prototype.initialize = function(models, options) {
    this.projectId = options.projectId;
    this.entryId = options.entryId;
    return this.on('remove', (function(_this) {
      return function(model) {
        return model.destroy();
      };
    })(this));
  };

  Facsimiles.prototype.url = function() {
    return "" + (config.get('restUrl')) + "projects/" + this.projectId + "/entries/" + this.entryId + "/facsimiles";
  };

  Facsimiles.prototype.setCurrent = function(model) {
    if ((model == null) || model !== this.current) {
      if (model != null) {
        this.current = model;
      } else {
        this.current = this.at(0);
      }
      this.trigger('current:change', this.current);
    }
    return this.current;
  };

  return Facsimiles;

})(Base);

module.exports = Facsimiles;


},{"../models/config":54,"../models/facsimile":58,"./base":41}],44:[function(require,module,exports){
var AnnotationTypes, Base, Models, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../../models/config');

Base = require('../base');

Models = {
  AnnotationType: require('../../models/project/annotationtype')
};

AnnotationTypes = (function(_super) {
  __extends(AnnotationTypes, _super);

  function AnnotationTypes() {
    return AnnotationTypes.__super__.constructor.apply(this, arguments);
  }

  AnnotationTypes.prototype.model = Models.AnnotationType;

  AnnotationTypes.prototype.url = function() {
    return config.get('restUrl') + "annotationtypes";
  };

  AnnotationTypes.prototype.comparator = function(annotationType) {
    return annotationType.get('title').toLowerCase();
  };

  return AnnotationTypes;

})(Base);

module.exports = AnnotationTypes;


},{"../../models/config":54,"../../models/project/annotationtype":59,"../base":41}],45:[function(require,module,exports){
var ProjectHistory, ajax, config;

config = require('../../models/config');

ajax = require('hilib/src/managers/ajax');

ProjectHistory = (function() {
  ProjectHistory.prototype.fetch = function(done) {
    var jqXHR;
    jqXHR = ajax.get({
      url: this.url
    });
    jqXHR.done((function(_this) {
      return function(response) {
        return done(response);
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function(response) {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  function ProjectHistory(projectID) {
    this.url = "" + (config.get('restUrl')) + "projects/" + projectID + "/logentries";
  }

  return ProjectHistory;

})();

module.exports = ProjectHistory;


},{"../../models/config":54,"hilib/src/managers/ajax":3}],46:[function(require,module,exports){
var Backbone, Base, Models, Projects, config, history, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

config = require('../models/config');

history = require('hilib/src/managers/history');

Base = require('./base');

Models = {
  Project: require('../models/project/main')
};

Projects = (function(_super) {
  __extends(Projects, _super);

  function Projects() {
    return Projects.__super__.constructor.apply(this, arguments);
  }

  Projects.prototype.model = Models.Project;

  Projects.prototype.url = config.get('restUrl') + 'projects';

  Projects.prototype.initialize = function() {
    Projects.__super__.initialize.apply(this, arguments);
    return this.on('sync', this.setCurrent, this);
  };

  Projects.prototype.fetch = function(options) {
    if (options == null) {
      options = {};
    }
    if (!options.error) {
      options.error = (function(_this) {
        return function(collection, response, options) {
          if (response.status === 401) {
            sessionStorage.clear();
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this);
    }
    return Projects.__super__.fetch.call(this, options);
  };

  Projects.prototype.getCurrent = function(cb) {
    if (this.current != null) {
      return cb(this.current);
    } else {
      return this.once('current:change', (function(_this) {
        return function() {
          return cb(_this.current);
        };
      })(this));
    }
  };

  Projects.prototype.setCurrent = function(id) {
    var fragmentPart;
    if (id instanceof Backbone.Model) {
      id = id.id;
    }
    fragmentPart = history.last() != null ? history.last().split('/') : [];
    if (_.isNumber(id)) {
      this.current = this.get(id);
    } else if (fragmentPart[1] === 'projects') {
      this.current = this.find(function(p) {
        return p.get('name') === fragmentPart[2];
      });
    } else {
      this.current = this.first();
    }
    if (this.current == null) {
      return this.trigger('current:change', this.current);
    }
    this.current.load((function(_this) {
      return function() {
        config.set('entryTermSingular', _this.current.get('settings').get('entry.term_singular'));
        config.set('entryTermPlural', _this.current.get('settings').get('entry.term_plural'));
        return _this.trigger('current:change', _this.current);
      };
    })(this));
    return this.current;
  };

  return Projects;

})(Base);

module.exports = new Projects();


},{"../models/config":54,"../models/project/main":60,"./base":41,"hilib/src/managers/history":5}],47:[function(require,module,exports){
var Base, Models, StringFn, Transcriptions, config, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

config = require('../models/config');

Base = require('./base');

StringFn = require('hilib/src/utils/string');

Models = {
  Transcription: require('../models/transcription')
};

Transcriptions = (function(_super) {
  __extends(Transcriptions, _super);

  function Transcriptions() {
    return Transcriptions.__super__.constructor.apply(this, arguments);
  }

  Transcriptions.prototype.model = Models.Transcription;

  Transcriptions.prototype.initialize = function(models, options) {
    this.projectId = options.projectId;
    this.entryId = options.entryId;
    return this.on('remove', (function(_this) {
      return function(model) {
        return model.destroy();
      };
    })(this));
  };

  Transcriptions.prototype.url = function() {
    return config.get('restUrl') + ("projects/" + this.projectId + "/entries/" + this.entryId + "/transcriptions");
  };

  Transcriptions.prototype.getCurrent = function(cb) {
    if (this.current != null) {
      return cb(this.current);
    } else {
      return this.once('current:change', (function(_this) {
        return function() {
          return cb(_this.current);
        };
      })(this));
    }
  };

  Transcriptions.prototype.setCurrent = function(model) {
    var transcriptionName;
    if ((model == null) || model !== this.current) {
      if (_.isString(model)) {
        transcriptionName = model;
        this.current = this.find((function(_this) {
          return function(model) {
            return StringFn.slugify(model.get('textLayer')) === StringFn.slugify(transcriptionName);
          };
        })(this));
      } else {
        if (model != null) {
          this.current = model;
        } else {
          this.current = this.first();
        }
      }
      this.trigger('current:change', this.current);
    }
    return this.current;
  };

  return Transcriptions;

})(Base);

module.exports = Transcriptions;


},{"../models/config":54,"../models/transcription":65,"./base":41,"hilib/src/utils/string":19}],48:[function(require,module,exports){
var Collections, User, Users, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../models/config');

User = require('../models/user');

Collections = {
  Base: require('./base')
};

Users = (function(_super) {
  __extends(Users, _super);

  function Users() {
    return Users.__super__.constructor.apply(this, arguments);
  }

  Users.prototype.model = User;

  Users.prototype.url = function() {
    return "" + (config.get('restUrl')) + "users";
  };

  Users.prototype.comparator = function(user) {
    var title;
    title = user.get('title');
    if (title != null) {
      return title.toLowerCase();
    } else {
      return '';
    }
  };

  return Users;

})(Collections.Base);

module.exports = Users;


},{"../models/config":54,"../models/user":66,"./base":41}],49:[function(require,module,exports){
module.exports = {
  restUrl: 'http://demo7.huygens.knaw.nl/elab4testBE/'
};


},{}],50:[function(require,module,exports){
var EntryMetadata, ajax, config, token;

config = require('./models/config');

token = require('hilib/src/managers/token');

ajax = require('hilib/src/managers/ajax');

EntryMetadata = (function() {
  var url;

  url = null;

  function EntryMetadata(projectID) {
    url = "" + (config.get('restUrl')) + "projects/" + projectID + "/entrymetadatafields";
  }

  EntryMetadata.prototype.fetch = function(cb) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.get({
      url: url
    });
    return jqXHR.done(function(data) {
      return cb(data);
    });
  };

  EntryMetadata.prototype.save = function(newValues, options) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.put({
      url: url,
      dataType: 'text',
      data: JSON.stringify(newValues)
    });
    jqXHR.done((function(_this) {
      return function() {
        if (options.success != null) {
          return options.success(arguments);
        }
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function() {
        if (options.error != null) {
          return options.error(arguments);
        }
      };
    })(this));
  };

  return EntryMetadata;

})();

module.exports = EntryMetadata;


},{"./models/config":54,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7}],51:[function(require,module,exports){
var $, app;

$ = require('jquery');

app = require('./app');

$(function() {
  return app();
});


},{"./app":39}],52:[function(require,module,exports){
var Annotation, Backbone, Models, ajax, changedSinceLastSave, config, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

ajax = require('hilib/src/managers/ajax');

_ = require('underscore');

changedSinceLastSave = require('hilib/src/mixins/model.changedsincelastsave');

config = require('./config');

Models = {
  Base: require('./base')
};

Annotation = (function(_super) {
  __extends(Annotation, _super);

  function Annotation() {
    return Annotation.__super__.constructor.apply(this, arguments);
  }

  Annotation.prototype.urlRoot = function() {
    return "" + (config.get('restUrl')) + "projects/" + this.collection.projectId + "/entries/" + this.collection.entryId + "/transcriptions/" + this.collection.transcriptionId + "/annotations";
  };

  Annotation.prototype.defaults = function() {
    return {
      annotationMetadataItems: [],
      annotationNo: 'newannotation',
      annotationType: null,
      body: '',
      createdOn: '',
      creator: null,
      modifiedOn: '',
      modifier: null,
      metadata: {}
    };
  };

  Annotation.prototype.initialize = function() {
    Annotation.__super__.initialize.apply(this, arguments);
    _.extend(this, changedSinceLastSave(['body']));
    return this.initChangedSinceLastSave();
  };

  Annotation.prototype.parse = function(attrs) {
    var item, key, metadataItem, value, _i, _len, _ref;
    if (attrs != null) {
      attrs.metadata = {};
      _ref = attrs.annotationType.metadataItems;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        metadataItem = _ref[_i];
        key = metadataItem.name;
        item = _.find(attrs.annotationMetadataItems, function(item) {
          return item.annotationTypeMetadataItem.name === key;
        });
        value = item != null ? item.data : '';
        attrs.metadata[key] = value;
      }
      return attrs;
    }
  };

  Annotation.prototype.set = function(attrs, options) {
    var attr;
    if (_.isString(attrs) && attrs.substr(0, 9) === 'metadata.') {
      attr = attrs.substr(9);
      if (attr === 'type') {
        if (attr === 'type') {
          return this.trigger('change:metadata:type', parseInt(options, 10));
        }
      } else {
        return this.attributes['metadata'][attr] = options;
      }
    } else {
      return Annotation.__super__.set.apply(this, arguments);
    }
  };

  Annotation.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      jqXHR = ajax.post({
        url: this.url(),
        data: JSON.stringify({
          body: this.get('body'),
          typeId: this.get('annotationType').id,
          metadata: this.get('metadata')
        }),
        dataType: 'text'
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var xhr;
          if (jqXHR.status === 201) {
            xhr = ajax.get({
              url: jqXHR.getResponseHeader('Location')
            });
            xhr.done(function(data, textStatus, jqXHR) {
              return options.success(data);
            });
            return xhr.fail(function() {
              return console.log(arguments);
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else if (method === 'update') {
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify({
          body: this.get('body'),
          typeId: this.get('annotationType').id,
          metadata: this.get('metadata')
        })
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return options.success(response);
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return Annotation.__super__.sync.apply(this, arguments);
    }
  };

  Annotation.prototype.updateFromClone = function(clone) {
    this.set('annotationType', clone.get('annotationType'));
    return this.set('metadata', clone.get('metadata'));
  };

  return Annotation;

})(Models.Base);

module.exports = Annotation;


},{"./base":53,"./config":54,"hilib/src/managers/ajax":3,"hilib/src/mixins/model.changedsincelastsave":12}],53:[function(require,module,exports){
var Backbone, Base, Pubsub, token, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

token = require('hilib/src/managers/token');

Pubsub = require('hilib/src/mixins/pubsub');

Base = (function(_super) {
  __extends(Base, _super);

  function Base() {
    return Base.__super__.constructor.apply(this, arguments);
  }

  Base.prototype.initialize = function() {
    return _.extend(this, Pubsub);
  };

  Base.prototype.sync = function(method, model, options) {
    options.beforeSend = (function(_this) {
      return function(xhr) {
        return xhr.setRequestHeader('Authorization', "" + (token.getType()) + " " + (token.get()));
      };
    })(this);
    return Base.__super__.sync.call(this, method, model, options);
  };

  return Base;

})(Backbone.Model);

module.exports = Base;


},{"hilib/src/managers/token":7,"hilib/src/mixins/pubsub":14}],54:[function(require,module,exports){
var Backbone, Config, basePath, envConfig, us, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

us = require('underscore.string');

_ = require('underscore');

basePath = window.BASE_URL;

if (basePath === '/') {
  basePath = '';
}

envConfig = require('../config/env');

Config = (function(_super) {
  __extends(Config, _super);

  function Config() {
    return Config.__super__.constructor.apply(this, arguments);
  }

  Config.prototype.url = function() {
    return "" + basePath + "/data/config.json";
  };

  Config.prototype.defaults = function() {
    return _.extend(envConfig, {
      basePath: basePath,
      appRootElement: '#app',
      entryTermSingular: 'entry',
      entryTermPlural: 'entries',
      searchPath: "api/search",
      resultRows: 25,
      annotationsIndexPath: "" + basePath + "/data/annotation_index.json",
      roles: {
        'READER': 10,
        'USER': 20,
        'PROJECTLEADER': 30,
        'ADMIN': 40
      },
      activeTextLayerId: null,
      activeTextLayerIsAnnotationLayer: null
    });
  };

  Config.prototype.parse = function(data) {
    var entry, textlayer, tls, _i, _j, _len, _len1, _ref, _ref1;
    _ref = data.entries;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      entry = _ref[_i];
      entry._id = +entry.datafile.replace('.json', '');
      entry.thumbnails = data.thumbnails[entry._id];
    }
    tls = [];
    _ref1 = data.textLayers;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      textlayer = _ref1[_j];
      tls.push({
        id: textlayer
      });
    }
    data.textlayers = tls;
    return data;
  };

  Config.prototype.set = function(attrs, options) {
    var sanitizeTextLayer;
    sanitizeTextLayer = (function(_this) {
      return function(textLayer) {
        var splitLayer;
        splitLayer = textLayer.split(' ');
        if (splitLayer[splitLayer.length - 1] === 'annotations') {
          splitLayer.pop();
          textLayer = splitLayer.join(' ');
          _this.set('activeTextLayerIsAnnotationLayer', true);
        } else {
          _this.set('activeTextLayerIsAnnotationLayer', false);
        }
        return us.slugify(textLayer);
      };
    })(this);
    if (attrs === 'activeTextLayerId' && (options != null)) {
      options = sanitizeTextLayer(options);
    } else if (attrs.hasOwnProperty('activeTextLayerId' && (attrs.activeTextLayerId != null))) {
      attrs.activeTextLayerId = sanitizeTextLayer(attrs[activeTextLayerId]);
    }
    return Config.__super__.set.apply(this, arguments);
  };

  Config.prototype.slugToLayer = function(slug) {
    var layer, _i, _len, _ref;
    _ref = this.get('textLayers') || [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      layer = _ref[_i];
      if (slug === us.slugify(layer)) {
        return layer;
      }
    }
  };

  return Config;

})(Backbone.Model);

module.exports = new Config;


},{"../config/env":49,"underscore.string":37}],55:[function(require,module,exports){
var $, Backbone, Collections, CurrentUser, Models, ajax, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

config = require('./config');

token = require('hilib/src/managers/token');

$ = require('jquery');

ajax = require('hilib/src/managers/ajax');

Models = {
  Base: require('./base')
};

Collections = {
  Base: require('../collections/base')
};

CurrentUser = (function(_super) {
  __extends(CurrentUser, _super);

  function CurrentUser() {
    return CurrentUser.__super__.constructor.apply(this, arguments);
  }


  /*
  	@return {object} defaults
  	@prop {string} role - READER, USER, PROJECTLEADER, ADMIN
  	@prop {number} defaults.roleNo - 10: reader, 20: user, 30: projectleader, 40: admin
   */

  CurrentUser.prototype.defaults = function() {
    return {
      username: '',
      title: '',
      email: '',
      firstName: '',
      lastName: '',
      role: '',
      roleString: '',
      roleNo: '',
      loggedIn: false
    };
  };

  CurrentUser.prototype.initialize = function() {
    return this.loggedIn = false;
  };

  CurrentUser.prototype.parse = function(attrs) {
    if (attrs.title == null) {
      attrs.title = attrs.username;
    }
    attrs.roleNo = config.get('roles')[attrs.role];
    return attrs;
  };

  CurrentUser.prototype.authorized = function() {};

  CurrentUser.prototype.unauthorized = function() {};

  CurrentUser.prototype.navigateToLogin = function() {};

  CurrentUser.prototype.authorize = function(args) {
    this.authorized = args.authorized, this.unauthorized = args.unauthorized, this.navigateToLogin = args.navigateToLogin;
    if (token.get()) {
      return this.fetchUserAttrs({
        done: (function(_this) {
          return function() {
            _this.authorized();
            return _this.loggedIn = true;
          };
        })(this)
      });
    } else {
      return this.navigateToLogin();
    }
  };

  CurrentUser.prototype.login = function(username, password) {
    this.set('username', username);
    return this.fetchUserAttrs({
      username: username,
      password: password,
      done: (function(_this) {
        return function() {
          sessionStorage.setItem('huygens_user', JSON.stringify(_this.attributes));
          _this.authorized();
          return _this.loggedIn = true;
        };
      })(this)
    });
  };

  CurrentUser.prototype.hsidLogin = function(hsid) {
    return this.fetchUserAttrs({
      hsid: hsid,
      done: (function(_this) {
        return function() {
          sessionStorage.setItem('huygens_user', JSON.stringify(_this.attributes));
          _this.authorized();
          return _this.loggedIn = true;
        };
      })(this)
    });
  };

  CurrentUser.prototype.logout = function(args) {
    var jqXHR;
    jqXHR = ajax.post({
      url: config.get('restUrl') + ("sessions/" + (token.get()) + "/logout"),
      dataType: 'text',
      contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
    }, {
      token: false
    });
    jqXHR.done(function() {
      this.loggedIn = false;
      sessionStorage.clear();
      return location.reload();
    });
    return jqXHR.fail(function() {
      return console.error('Logout failed');
    });
  };

  CurrentUser.prototype.fetchUserAttrs = function(args) {
    var done, hsid, jqXHR, password, postData, userAttrs, username;
    username = args.username, password = args.password, hsid = args.hsid, done = args.done;
    if (userAttrs = sessionStorage.getItem('huygens_user')) {
      this.set(JSON.parse(userAttrs));
      return done();
    } else {
      if (hsid != null) {
        postData = {
          hsid: hsid
        };
      } else if ((username != null) && (password != null)) {
        postData = {
          username: username,
          password: password
        };
      } else {
        return this.unauthorized();
      }
      jqXHR = $.ajax({
        type: 'post',
        url: config.get('restUrl') + 'sessions/login',
        data: postData
      });
      jqXHR.done((function(_this) {
        return function(data) {
          var type;
          data.user = _this.parse(data.user);
          if (hsid != null) {
            type = 'Federated';
          }
          token.set(data.token, type);
          _this.set(data.user);
          return done();
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function() {
          return _this.unauthorized();
        };
      })(this));
    }
  };

  CurrentUser.prototype.resetPassword = function(cb) {
    var jqXHR;
    jqXHR = ajax.post({
      url: "/users/passwordresetrequest"
    });
    jqXHR.done((function(_this) {
      return function() {
        console.log(arguments);
        return cb();
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function() {
        return console.log(arguments);
      };
    })(this));
  };

  return CurrentUser;

})(Backbone.Model);

module.exports = new CurrentUser();


},{"../collections/base":41,"./base":53,"./config":54,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7}],56:[function(require,module,exports){
var Collections, Entry, Models, ajax, config, syncOverride, token, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

config = require('./config');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

syncOverride = require('hilib/src/mixins/model.sync');

Models = {
  Base: require('./base'),
  Settings: require('./entry.settings')
};

Collections = {
  Transcriptions: require('../collections/transcriptions'),
  Facsimiles: require('../collections/facsimiles')
};

Entry = (function(_super) {
  __extends(Entry, _super);

  function Entry() {
    return Entry.__super__.constructor.apply(this, arguments);
  }

  Entry.prototype.urlRoot = function() {
    return "" + (config.get('restUrl')) + "projects/" + this.project.id + "/entries";
  };

  Entry.prototype.defaults = function() {
    return {
      name: '',
      publishable: false,
      shortName: '',
      terms: null
    };
  };

  Entry.prototype.initialize = function() {
    Entry.__super__.initialize.apply(this, arguments);
    return _.extend(this, syncOverride);
  };

  Entry.prototype.set = function(attrs, options) {
    var settings;
    settings = this.get('settings');
    if ((settings != null) && (settings.get(attrs) != null)) {
      settings.set(attrs, options);
      return this.trigger('change');
    } else {
      return Entry.__super__.set.apply(this, arguments);
    }
  };

  Entry.prototype.clone = function() {
    var newObj;
    newObj = new this.constructor({
      name: this.get('name'),
      publishable: this.get('publishable'),
      shortName: this.get('shortName'),
      modifier: this.get('modifier'),
      modifiedOn: this.get('modifiedOn')
    });
    newObj.set('settings', new Models.Settings(this.get('settings').toJSON(), {
      projectId: this.project.id,
      entryId: this.id
    }));
    return newObj;
  };

  Entry.prototype.updateFromClone = function(clone) {
    this.set('name', clone.get('name'));
    this.set('publishable', clone.get('publishable'));
    this.set('shortName', clone.get('shortName'));
    return this.get('settings').set(clone.get('settings').toJSON());
  };

  Entry.prototype.fetchTranscriptions = function(currentTranscriptionName, done) {
    var jqXHR, transcriptions;
    transcriptions = new Collections.Transcriptions([], {
      projectId: this.project.id,
      entryId: this.id
    });
    jqXHR = transcriptions.fetch();
    return jqXHR.done((function(_this) {
      return function() {
        _this.set('transcriptions', transcriptions);
        return done(transcriptions.setCurrent(currentTranscriptionName));
      };
    })(this));
  };

  Entry.prototype.fetchFacsimiles = function(done) {
    var facsimiles, jqXHR;
    facsimiles = new Collections.Facsimiles([], {
      projectId: this.project.id,
      entryId: this.id
    });
    jqXHR = facsimiles.fetch();
    return jqXHR.done((function(_this) {
      return function() {
        _this.set('facsimiles', facsimiles);
        return done(facsimiles.setCurrent());
      };
    })(this));
  };

  Entry.prototype.fetchSettings = function(done) {
    var jqXHR, settings;
    settings = new Models.Settings([], {
      projectId: this.project.id,
      entryId: this.id
    });
    jqXHR = settings.fetch();
    return jqXHR.done((function(_this) {
      return function() {
        _this.set('settings', settings);
        return done();
      };
    })(this));
  };

  Entry.prototype.setPrevNext = function(done) {
    var ids, index;
    if (this.project.resultSet == null) {
      return done();
    }
    ids = this.project.resultSet.get('ids');
    index = ids.indexOf('' + this.id);
    this.prevID = ids[index - 1];
    this.nextID = ids[index + 1];
    return done();
  };

  Entry.prototype.fetchPrevNext = function(done) {
    var jqXHR;
    jqXHR = ajax.get({
      url: this.url() + '/prevnext'
    });
    return jqXHR.done((function(_this) {
      return function(response) {
        _this.nextID = response.next;
        _this.prevID = response.prev;
        return done();
      };
    })(this));
  };

  Entry.prototype.sync = function(method, model, options) {
    var data, jqXHR;
    data = JSON.stringify({
      name: this.get('name'),
      publishable: this.get('publishable'),
      shortName: this.get('shortName')
    });
    if (method === 'create') {
      jqXHR = ajax.post({
        url: this.url(),
        data: data,
        dataType: 'text'
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var xhr;
          if (jqXHR.status === 201) {
            xhr = ajax.get({
              url: jqXHR.getResponseHeader('Location')
            });
            xhr.done(function(data, textStatus, jqXHR) {
              return options.success(data);
            });
            return xhr.fail(function(response) {
              if (response.status === 401) {
                return Backbone.history.navigate('login', {
                  trigger: true
                });
              }
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else if (method === 'update') {
      jqXHR = ajax.put({
        url: this.url(),
        data: data
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return options.success(response);
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return Entry.__super__.sync.apply(this, arguments);
    }
  };

  return Entry;

})(Models.Base);

module.exports = Entry;


},{"../collections/facsimiles":43,"../collections/transcriptions":47,"./base":53,"./config":54,"./entry.settings":57,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7,"hilib/src/mixins/model.sync":13}],57:[function(require,module,exports){
var Backbone, EntrySettings, Models, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

config = require('./config');

Models = {
  Base: require('./base')
};

EntrySettings = (function(_super) {
  __extends(EntrySettings, _super);

  function EntrySettings() {
    return EntrySettings.__super__.constructor.apply(this, arguments);
  }

  EntrySettings.prototype.initialize = function(models, options) {
    this.projectId = options.projectId;
    this.entryId = options.entryId;
    return this.once('sync', (function(_this) {
      return function() {
        return _this.on('change', function() {
          return Backbone.trigger('change:entry-metadata');
        });
      };
    })(this));
  };

  EntrySettings.prototype.url = function() {
    return config.get('restUrl') + ("projects/" + this.projectId + "/entries/" + this.entryId + "/settings");
  };

  EntrySettings.prototype.sync = function(method, model, options) {
    if (method === 'create') {
      method = 'update';
    }
    return EntrySettings.__super__.sync.apply(this, arguments);
  };

  return EntrySettings;

})(Models.Base);

module.exports = EntrySettings;


},{"./base":53,"./config":54}],58:[function(require,module,exports){
var Facsimile, Models, ajax, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Models = {
  Base: require('./base')
};

Facsimile = (function(_super) {
  __extends(Facsimile, _super);

  function Facsimile() {
    return Facsimile.__super__.constructor.apply(this, arguments);
  }

  Facsimile.prototype.defaults = function() {
    return {
      name: '',
      filename: '',
      zoomableUrl: ''
    };
  };

  Facsimile.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify({
          name: model.get('name'),
          filename: model.get('filename'),
          zoomableUrl: model.get('zoomableUrl')
        })
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var url, xhr;
          if (jqXHR.status === 201) {
            url = jqXHR.getResponseHeader('Location');
            xhr = ajax.get({
              url: url
            });
            return xhr.done(function(data, textStatus, jqXHR) {
              _this.trigger('sync');
              return options.success(data);
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return Facsimile.__super__.sync.apply(this, arguments);
    }
  };

  return Facsimile;

})(Models.Base);

module.exports = Facsimile;


},{"./base":53,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7}],59:[function(require,module,exports){
var AnnotationType, Models, ajax, config, syncOverride, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

config = require('../config');

ajax = require('hilib/src/managers/ajax');

syncOverride = require('hilib/src/mixins/model.sync');

Models = {
  Base: require('../base')
};

AnnotationType = (function(_super) {
  __extends(AnnotationType, _super);

  function AnnotationType() {
    return AnnotationType.__super__.constructor.apply(this, arguments);
  }

  AnnotationType.prototype.urlRoot = function() {
    return config.get('restUrl') + "annotationtypes";
  };

  AnnotationType.prototype.defaults = function() {
    return {
      creator: null,
      modifier: null,
      name: '',
      description: '',
      annotationTypeMetadataItems: [],
      createdOn: '',
      modifiedOn: ''
    };
  };

  AnnotationType.prototype.initialize = function() {
    AnnotationType.__super__.initialize.apply(this, arguments);
    return _.extend(this, syncOverride);
  };

  AnnotationType.prototype.parse = function(attrs) {
    attrs.title = attrs.name;
    return attrs;
  };

  AnnotationType.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify({
          name: model.get('name'),
          description: model.get('description')
        })
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var xhr;
          if (jqXHR.status === 201) {
            xhr = ajax.get({
              url: jqXHR.getResponseHeader('Location')
            });
            return xhr.done(function(data, textStatus, jqXHR) {
              return options.success(data);
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else if (method === 'update') {
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify({
          name: model.get('name'),
          description: model.get('description')
        })
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return _this.trigger('sync');
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return AnnotationType.__super__.sync.apply(this, arguments);
    }
  };

  return AnnotationType;

})(Models.Base);

module.exports = AnnotationType;


},{"../base":53,"../config":54,"hilib/src/managers/ajax":3,"hilib/src/mixins/model.sync":13}],60:[function(require,module,exports){
var Async, Backbone, Collections, EntryMetadata, Fn, Models, Project, ProjectAnnotationTypeIDs, ProjectUserIDs, ajax, config, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

Fn = require('hilib/src/utils/general');

ajax = require('hilib/src/managers/ajax');

Async = require('hilib/src/managers/async');

config = require('../config');

Models = {
  Base: require('../base'),
  Settings: require('./settings')
};

EntryMetadata = require('../../entry.metadata');

ProjectUserIDs = require('../../project.user.ids');

ProjectAnnotationTypeIDs = require('../../project.annotationtype.ids');

Collections = {
  Entries: require('../../collections/entries'),
  AnnotationTypes: require('../../collections/project/annotationtypes'),
  Users: require('../../collections/users')
};

Project = (function(_super) {
  __extends(Project, _super);

  function Project() {
    return Project.__super__.constructor.apply(this, arguments);
  }

  Project.prototype.defaults = function() {
    return {
      annotationtypes: null,
      createdOn: '',
      creator: null,
      entries: null,
      entrymetadatafields: null,
      level1: '',
      level2: '',
      level3: '',
      modifiedOn: '',
      modifier: null,
      name: '',
      projectLeaderId: null,
      settings: null,
      textLayers: [],
      title: '',
      userIDs: []
    };
  };

  Project.prototype.parse = function(attrs) {
    attrs.entries = new Collections.Entries([], {
      projectId: attrs.id
    });
    return attrs;
  };

  Project.prototype.addAnnotationType = function(annotationType, done) {
    var ids;
    ids = this.get('annotationtypeIDs');
    ids.push(annotationType.id);
    return this.projectAnnotationTypeIDs.save(ids, {
      success: (function(_this) {
        return function() {
          _this.allannotationtypes.add(annotationType);
          return done();
        };
      })(this)
    });
  };

  Project.prototype.removeAnnotationType = function(id, done) {
    return this.projectAnnotationTypeIDs.save(Fn.removeFromArray(this.get('annotationtypeIDs'), id), {
      success: (function(_this) {
        return function() {
          _this.allannotationtypes.remove(id);
          return done();
        };
      })(this)
    });
  };

  Project.prototype.addUser = function(user, done) {
    var userIDs;
    userIDs = this.get('userIDs');
    userIDs.push(user.id);
    return this.projectUserIDs.save(userIDs, {
      success: (function(_this) {
        return function() {
          _this.allusers.add(user);
          return done();
        };
      })(this)
    });
  };

  Project.prototype.removeUser = function(id, done) {
    return this.projectUserIDs.save(Fn.removeFromArray(this.get('userIDs'), id), {
      success: (function(_this) {
        return function() {
          _this.get('members').removeById(id);
          return done();
        };
      })(this)
    });
  };

  Project.prototype.load = function(cb) {
    var async, settings;
    if (this.get('annotationtypes') === null && this.get('entrymetadatafields') === null && this.get('userIDs').length === 0) {
      async = new Async(['annotationtypes', 'users', 'entrymetadatafields', 'settings']);
      async.on('ready', (function(_this) {
        return function(data) {
          return cb();
        };
      })(this));
      new Collections.AnnotationTypes().fetch({
        success: (function(_this) {
          return function(collection, response, options) {
            _this.allannotationtypes = collection;
            _this.projectAnnotationTypeIDs = new ProjectAnnotationTypeIDs(_this.id);
            return _this.projectAnnotationTypeIDs.fetch(function(data) {
              _this.set('annotationtypeIDs', data);
              _this.set('annotationtypes', new Collections.AnnotationTypes(collection.filter(function(model) {
                return data.indexOf(model.id) > -1;
              })));
              return async.called('annotationtypes');
            });
          };
        })(this)
      });
      new Collections.Users().fetch({
        success: (function(_this) {
          return function(collection) {
            _this.allusers = collection;
            _this.projectUserIDs = new ProjectUserIDs(_this.id);
            return _this.projectUserIDs.fetch(function(data) {
              _this.set('userIDs', data);
              _this.set('members', new Collections.Users(collection.filter(function(model) {
                return data.indexOf(model.id) > -1;
              })));
              return async.called('users');
            });
          };
        })(this),
        error: (function(_this) {
          return function(model, response) {
            if (response.status === 401) {
              return Backbone.history.navigate('login', {
                trigger: true
              });
            }
          };
        })(this)
      });
      new EntryMetadata(this.id).fetch((function(_this) {
        return function(data) {
          _this.set('entrymetadatafields', data);
          return async.called('entrymetadatafields');
        };
      })(this));
      settings = new Models.Settings(null, {
        projectID: this.id
      });
      return settings.fetch({
        success: (function(_this) {
          return function(model) {
            _this.set('settings', model);
            return async.called('settings');
          };
        })(this),
        error: (function(_this) {
          return function(model, response) {
            if (response.status === 401) {
              return Backbone.history.navigate('login', {
                trigger: true
              });
            }
          };
        })(this)
      });
    } else {
      return cb();
    }
  };

  Project.prototype.fetchEntrymetadatafields = function(cb) {
    var jqXHR;
    jqXHR = ajax.get({
      url: config.get('restUrl') + ("projects/" + this.id + "/entrymetadatafields"),
      dataType: 'text'
    });
    jqXHR.done((function(_this) {
      return function(response) {
        _this.set('entrymetadatafields', response);
        return cb();
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function(response) {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  Project.prototype.publishDraft = function(cb) {
    var jqXHR;
    jqXHR = ajax.post({
      url: config.get('restUrl') + ("projects/" + this.id + "/draft"),
      dataType: 'text'
    });
    jqXHR.done((function(_this) {
      return function() {
        var locationUrl;
        locationUrl = jqXHR.getResponseHeader('Location');
        localStorage.setItem('publishDraftLocation', locationUrl);
        return _this.pollDraft(locationUrl, cb);
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function(response) {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  Project.prototype.pollDraft = function(url, done) {
    return ajax.poll({
      url: url,
      testFn: (function(_this) {
        return function(data) {
          if (data != null) {
            return data.done;
          }
        };
      })(this),
      done: (function(_this) {
        return function(data, textStatus, jqXHR) {
          localStorage.removeItem('publishDraftLocation');
          if (data.fail) {
            localStorage.setItem("publicationErrors", JSON.stringify(data.errors));
            _this.publish("message", "Error(s) publishing, see <a href=\"/publication-errors\">error page</a>");
          } else {
            _this.publish('message', "Publication <a href='" + data.url + "' target='_blank' data-bypass>ready</a>.");
          }
          return done();
        };
      })(this)
    });
  };

  Project.prototype.saveTextlayers = function(done) {
    var jqXHR;
    jqXHR = ajax.put({
      url: config.get('restUrl') + ("projects/" + this.id + "/textlayers"),
      data: JSON.stringify(this.get('textLayers'))
    });
    jqXHR.done((function(_this) {
      return function() {
        return done();
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function(response) {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  Project.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      jqXHR = ajax.post({
        url: this.url(),
        data: JSON.stringify({
          title: this.get('title'),
          type: this.get('type')
        }),
        dataType: 'text'
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var xhr;
          if (jqXHR.status === 201) {
            xhr = ajax.get({
              url: jqXHR.getResponseHeader('Location')
            });
            xhr.done(function(data, textStatus, jqXHR) {
              return options.success(data);
            });
            return xhr.fail(function() {
              return console.log(arguments);
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return Project.__super__.sync.apply(this, arguments);
    }
  };

  return Project;

})(Models.Base);

module.exports = Project;


},{"../../collections/entries":42,"../../collections/project/annotationtypes":44,"../../collections/users":48,"../../entry.metadata":50,"../../project.annotationtype.ids":67,"../../project.user.ids":68,"../base":53,"../config":54,"./settings":61,"hilib/src/managers/ajax":3,"hilib/src/managers/async":4,"hilib/src/utils/general":17}],61:[function(require,module,exports){
var Backbone, Models, ProjectSettings, ajax, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

config = require('../config');

ajax = require('hilib/src/managers/ajax');

Models = {
  Base: require('../base')
};

ProjectSettings = (function(_super) {
  __extends(ProjectSettings, _super);

  function ProjectSettings() {
    return ProjectSettings.__super__.constructor.apply(this, arguments);
  }

  ProjectSettings.prototype.validation = {
    name: {
      'min-length': 3,
      'max-length': 40,
      pattern: 'slug'
    }
  };

  ProjectSettings.prototype.parse = function(attrs) {
    if (attrs != null) {
      if (attrs.hasOwnProperty('wordwrap')) {
        attrs.wordwrap = attrs.wordwrap === "true";
      }
      if (attrs.hasOwnProperty('results-per-page')) {
        attrs['results-per-page'] = +attrs['results-per-page'];
      }
    }
    return attrs;
  };

  ProjectSettings.prototype.set = function(attrs, options) {
    if (attrs === 'results-per-page') {
      options = +options;
    } else if (attrs.hasOwnProperty('results-per-page')) {
      attrs['results-per-page'] = +attrs['results-per-page'];
    }
    return ProjectSettings.__super__.set.apply(this, arguments);
  };

  ProjectSettings.prototype.defaults = function() {
    return {
      'Project leader': '',
      'Project title': '',
      'projectType': '',
      'publicationURL': '',
      'Release date': '',
      'Start date': '',
      'Version': '',
      'entry.term_singular': 'entry',
      'entry.term_plural': 'entries',
      'text.font': '',
      'name': '',
      'wordwrap': false,
      'results-per-page': 10
    };
  };

  ProjectSettings.prototype.url = function() {
    return "" + (config.get('restUrl')) + "projects/" + this.options.projectId + "/settings";
  };

  ProjectSettings.prototype.initialize = function(attrs, options) {
    this.options = options;
    ProjectSettings.__super__.initialize.apply(this, arguments);
    this.options.projectId = this.options.projectID;
    return this.projectID = this.options.projectID;
  };

  ProjectSettings.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify(this)
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return options.success(response);
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return ProjectSettings.__super__.sync.call(this, method, model, options);
    }
  };

  return ProjectSettings;

})(Models.Base);

module.exports = ProjectSettings;


},{"../base":53,"../config":54,"hilib/src/managers/ajax":3}],62:[function(require,module,exports){
var Backbone, Base, ProjectStatistics, ajax, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

config = require('../config');

ajax = require('hilib/src/managers/ajax');

Base = require('../base');

ProjectStatistics = (function(_super) {
  __extends(ProjectStatistics, _super);

  function ProjectStatistics() {
    return ProjectStatistics.__super__.constructor.apply(this, arguments);
  }

  ProjectStatistics.prototype.url = function() {
    return "" + (config.get('restUrl')) + "projects/" + this.projectID + "/statistics";
  };

  ProjectStatistics.prototype.initialize = function(attrs, options) {
    ProjectStatistics.__super__.initialize.apply(this, arguments);
    return this.projectID = options.projectID;
  };

  ProjectStatistics.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'read') {
      jqXHR = ajax.get({
        url: this.url()
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return options.success(response);
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return ProjectStatistics.__super__.sync.call(this, method, model, options);
    }
  };

  return ProjectStatistics;

})(Base);

module.exports = ProjectStatistics;


},{"../base":53,"../config":54,"hilib/src/managers/ajax":3}],63:[function(require,module,exports){
var Models, ResetPassword, ajax, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('./config');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Models = {
  Base: require('./base')
};

ResetPassword = (function(_super) {
  __extends(ResetPassword, _super);

  function ResetPassword() {
    return ResetPassword.__super__.constructor.apply(this, arguments);
  }

  ResetPassword.prototype.validation = {
    email: {
      required: true,
      pattern: 'email'
    }
  };

  ResetPassword.prototype.defaults = function() {
    return {
      email: ''
    };
  };

  ResetPassword.prototype.resetPassword = function() {
    return ajax.post({
      url: "" + (config.get('restUrl')) + "sessions/passwordresetrequest",
      dataType: 'text',
      data: this.get('email')
    });
  };

  return ResetPassword;

})(Models.Base);

module.exports = ResetPassword;


},{"./base":53,"./config":54,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7}],64:[function(require,module,exports){
var Backbone, SetNewPassword, ajax, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

config = require('./config');

ajax = require('hilib/src/managers/ajax');

SetNewPassword = (function(_super) {
  __extends(SetNewPassword, _super);

  function SetNewPassword() {
    return SetNewPassword.__super__.constructor.apply(this, arguments);
  }

  SetNewPassword.prototype.validation = {
    password1: {
      required: true,
      'min-length': 6
    },
    password2: {
      required: true,
      'min-length': 6,
      equal: 'password1'
    }
  };

  SetNewPassword.prototype.defaults = function() {
    return {
      password1: '',
      password2: '',
      emailaddress: '',
      token: ''
    };
  };

  SetNewPassword.prototype.setNewPassword = function(cb) {
    var data, jqXHR;
    data = {
      emailAddress: this.get('emailaddress'),
      token: this.get('token'),
      newPassword: this.get('password2')
    };
    jqXHR = ajax.post({
      url: "" + (config.get('restUrl')) + "sessions/passwordreset",
      dataType: 'text',
      data: JSON.stringify(data)
    });
    return jqXHR.done((function(_this) {
      return function() {
        return cb();
      };
    })(this));
  };

  return SetNewPassword;

})(Backbone.Model);

module.exports = SetNewPassword;


},{"./config":54,"hilib/src/managers/ajax":3}],65:[function(require,module,exports){
var $, Backbone, Collections, Models, Transcription, ajax, changedSinceLastSave, token, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

$ = require('jquery');

_ = require('underscore');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

changedSinceLastSave = require('hilib/src/mixins/model.changedsincelastsave');

Models = {
  Base: require('./base')
};

Collections = {
  Annotations: require('../collections/annotations')
};

Transcription = (function(_super) {
  __extends(Transcription, _super);

  function Transcription() {
    return Transcription.__super__.constructor.apply(this, arguments);
  }

  Transcription.prototype.defaults = function() {
    return {
      annotations: null,
      textLayer: '',
      title: '',
      body: ''
    };
  };

  Transcription.prototype.initialize = function() {
    Transcription.__super__.initialize.apply(this, arguments);
    _.extend(this, changedSinceLastSave(['body']));
    return this.initChangedSinceLastSave();
  };

  Transcription.prototype.set = function(attrs, options) {
    if (attrs === 'body') {
      options = options.replace(/<div><br><\/div>/g, '<br>');
      options = options.replace(/<div>(.*?)<\/div>/g, (function(_this) {
        return function(match, p1, offset, string) {
          return '<br>' + p1;
        };
      })(this));
      options.trim();
    }
    return Transcription.__super__.set.apply(this, arguments);
  };

  Transcription.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify({
          textLayer: model.get('textLayer'),
          body: model.get('body')
        })
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var url, xhr;
          if (jqXHR.status === 201) {
            url = jqXHR.getResponseHeader('Location');
            xhr = ajax.get({
              url: url
            });
            return xhr.done(function(data, textStatus, jqXHR) {
              _this.trigger('sync');
              return options.success(data);
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else if (method === 'update') {
      ajax.token = token.get();
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify({
          body: model.get('body')
        })
      });
      jqXHR.done((function(_this) {
        return function(response) {
          _this.trigger('sync');
          return options.success(response);
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return Transcription.__super__.sync.apply(this, arguments);
    }
  };

  Transcription.prototype.getAnnotations = function(cb) {
    var annotations, jqXHR;
    if (cb == null) {
      cb = function() {};
    }
    if (this.get('annotations') != null) {
      return cb(this.get('annotations'));
    } else {
      annotations = new Collections.Annotations([], {
        transcriptionId: this.id,
        entryId: this.collection.entryId,
        projectId: this.collection.projectId
      });
      jqXHR = annotations.fetch({
        success: (function(_this) {
          return function(collection) {
            _this.set('annotations', collection);
            _this.listenTo(collection, 'add', _this.addAnnotation);
            _this.listenTo(collection, 'remove', _this.removeAnnotation);
            return cb(collection);
          };
        })(this)
      });
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    }
  };

  Transcription.prototype.addAnnotation = function(model) {
    var $body;
    if (model.get('annotationNo') == null) {
      console.error('No annotationNo given!', model.get('annotationNo'));
      return false;
    }
    $body = $("<div>" + (this.get('body')) + "</div>");
    $body.find('[data-id="newannotation"]').attr('data-id', model.get('annotationNo'));
    return this.resetAnnotationOrder($body);
  };

  Transcription.prototype.removeAnnotation = function(model) {
    var jqXHR;
    jqXHR = model.destroy();
    jqXHR.done((function(_this) {
      return function() {
        var $body;
        $body = $("<div>" + (_this.get('body')) + "</div>");
        $body.find("[data-id='" + (model.get('annotationNo')) + "']").remove();
        return _this.resetAnnotationOrder($body, false);
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function(response) {
        _this.get('annotations').add(model);
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  Transcription.prototype.resetAnnotationOrder = function($body, add) {
    var jqXHR;
    if (add == null) {
      add = true;
    }
    $body.find('sup[data-marker="end"]').each((function(_this) {
      return function(index, sup) {
        return sup.innerHTML = index + 1;
      };
    })(this));
    this.set('body', $body.html());
    jqXHR = this.save(null, {
      success: (function(_this) {
        return function() {
          var message;
          message = add ? "New annotation added." : "Annotation removed.";
          return _this.publish('message', message);
        };
      })(this)
    });
    return jqXHR.fail((function(_this) {
      return function(response) {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  return Transcription;

})(Models.Base);

module.exports = Transcription;


},{"../collections/annotations":40,"./base":53,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7,"hilib/src/mixins/model.changedsincelastsave":12}],66:[function(require,module,exports){
var Models, User, ajax, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('./config');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Models = {
  Base: require('./base')
};

User = (function(_super) {
  __extends(User, _super);

  function User() {
    return User.__super__.constructor.apply(this, arguments);
  }

  User.prototype.urlRoot = function() {
    return "" + (config.get('restUrl')) + "users";
  };

  User.prototype.validation = {
    username: {
      required: true,
      'min-length': 2
    },
    password: {
      required: true,
      'min-length': 6
    },
    email: {
      required: true,
      pattern: 'email'
    },
    firstName: {
      pattern: 'string'
    },
    lastName: {
      pattern: 'string'
    }
  };

  User.prototype.defaults = function() {
    return {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'USER',
      password: ''
    };
  };

  User.prototype.getShortName = function() {
    var name;
    name = this.get('lastName');
    if (name == null) {
      name = this.get('firstName');
    }
    if (name == null) {
      name = 'user';
    }
    return name;
  };

  User.prototype.parse = function(attr) {
    attr.title = attr.title + ' (' + attr.username + ')';
    return attr;
  };

  User.prototype.sync = function(method, model, options) {
    var data, jqXHR;
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify(model.toJSON())
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var url, xhr;
          if (jqXHR.status === 201) {
            url = jqXHR.getResponseHeader('Location');
            xhr = ajax.get({
              url: url
            });
            return xhr.done(function(data, textStatus, jqXHR) {
              _this.trigger('sync');
              return options.success(data);
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          options.error(response);
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else if (method === 'update') {
      data = model.clone().toJSON();
      delete data.title;
      delete data.roleString;
      delete data.loggedIn;
      ajax.token = token.get();
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify(data)
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return _this.trigger('sync');
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          options.error(response);
          return jqXHR.fail(function(response) {
            if (response.status === 401) {
              return Backbone.history.navigate('login', {
                trigger: true
              });
            }
          });
        };
      })(this));
    } else {
      return User.__super__.sync.apply(this, arguments);
    }
  };

  User.prototype.resetPassword = function() {
    return console.log('reset', config.get('restUrl'));
  };

  return User;

})(Models.Base);

module.exports = User;


},{"./base":53,"./config":54,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7}],67:[function(require,module,exports){
var AnnotationTypeIDs, ajax, config, token;

config = require('./models/config');

token = require('hilib/src/managers/token');

ajax = require('hilib/src/managers/ajax');

AnnotationTypeIDs = (function() {
  var url;

  url = null;

  function AnnotationTypeIDs(projectID) {
    url = "" + (config.get('restUrl')) + "projects/" + projectID + "/annotationtypes";
  }

  AnnotationTypeIDs.prototype.fetch = function(cb) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.get({
      url: url
    });
    return jqXHR.done(function(data) {
      return cb(data);
    });
  };

  AnnotationTypeIDs.prototype.save = function(newValues, options) {
    var jqXHR;
    if (options == null) {
      options = {};
    }
    ajax.token = token.get();
    jqXHR = ajax.put({
      url: url,
      data: JSON.stringify(newValues)
    });
    return jqXHR.done((function(_this) {
      return function() {
        if (options.success != null) {
          return options.success();
        }
      };
    })(this));
  };

  return AnnotationTypeIDs;

})();

module.exports = AnnotationTypeIDs;


},{"./models/config":54,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7}],68:[function(require,module,exports){
var ProjectUserIDs, ajax, config, token;

config = require('./models/config');

token = require('hilib/src/managers/token');

ajax = require('hilib/src/managers/ajax');

ProjectUserIDs = (function() {
  var url;

  url = null;

  function ProjectUserIDs(projectID) {
    url = "" + (config.get('restUrl')) + "projects/" + projectID + "/projectusers";
  }

  ProjectUserIDs.prototype.fetch = function(cb) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.get({
      url: url
    });
    return jqXHR.done(function(data) {
      return cb(data);
    });
  };

  ProjectUserIDs.prototype.save = function(newValues, options) {
    var jqXHR;
    if (options == null) {
      options = {};
    }
    ajax.token = token.get();
    jqXHR = ajax.put({
      url: url,
      data: JSON.stringify(newValues)
    });
    return jqXHR.done((function(_this) {
      return function() {
        if (options.success != null) {
          return options.success();
        }
      };
    })(this));
  };

  return ProjectUserIDs;

})();

module.exports = ProjectUserIDs;


},{"./models/config":54,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7}],69:[function(require,module,exports){
var $, Backbone, Collections, Fn, MainRouter, Pubsub, ViewManager, Views, currentUser, history, viewManager, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

$ = require('jquery');

viewManager = require('hilib/src/managers/view2');

history = require('hilib/src/managers/history');

Pubsub = require('hilib/src/mixins/pubsub');

Fn = require('hilib/src/utils/general');

currentUser = require('../models/currentUser');

Collections = {
  projects: require('../collections/projects')
};

Views = {
  Login: require('../views/login'),
  SetNewPassword: require('../views/set-new-password'),
  NoProject: require('../views/no-project'),
  Search: require('../views/project/search'),
  EditMetadata: require('../views/project/search/edit-metadata'),
  ProjectSettings: require('../views/project/settings/main'),
  ProjectHistory: require('../views/project/history'),
  Statistics: require('../views/project/statistics'),
  Entry: require('../views/entry/main'),
  Header: require('../views/ui/header')
};

ViewManager = require('../util/view-manager');

viewManager = new ViewManager();

MainRouter = (function(_super) {
  __extends(MainRouter, _super);

  function MainRouter() {
    return MainRouter.__super__.constructor.apply(this, arguments);
  }

  MainRouter.prototype.initialize = function() {
    _.extend(this, Pubsub);
    this.on('route', (function(_this) {
      return function() {
        return history.update();
      };
    })(this));
    return this.on('route:search', (function(_this) {
      return function() {
        return Backbone.trigger('router:search');
      };
    })(this));
  };

  MainRouter.prototype.init = function() {
    if (Backbone.history.fragment === 'resetpassword') {
      return;
    }
    return currentUser.authorize({
      authorized: (function(_this) {
        return function() {
          Collections.projects.fetch();
          return Collections.projects.getCurrent(function(project) {
            var header, url, _ref;
            _this.project = project;
            if (_this.project == null) {
              return _this.navigate('noproject', {
                trigger: true
              });
            }
            _this.listenTo(_this.project.get('settings'), 'settings:saved', function(model, changed) {
              if (changed != null ? changed.hasOwnProperty('results-per-page') : void 0) {
                return viewManager.removeFromCache("search-" + (_this.project.get('name')));
              }
            });
            document.title = "eLaborate - " + (_this.project.get('title'));
            url = (_ref = history.last()) != null ? _ref : 'projects/' + _this.project.get('name');
            _this.navigate(url, {
              trigger: true
            });
            header = new Views.Header({
              project: _this.project
            });
            $('#container').prepend(header.el);
            return _this.listenTo(Collections.projects, 'current:change', function(project) {
              _this.project = project;
              document.title = "eLaborate - " + (_this.project.get('title'));
              return _this.navigate("projects/" + (_this.project.get('name')), {
                trigger: true
              });
            });
          });
        };
      })(this),
      unauthorized: (function(_this) {
        return function() {
          return _this.publish('login:failed');
        };
      })(this),
      navigateToLogin: (function(_this) {
        return function() {
          return _this.navigate('login', {
            trigger: true
          });
        };
      })(this)
    });
  };

  MainRouter.prototype.routes = {
    '': 'search',
    'login': 'login',
    'noproject': 'noproject',
    'resetpassword': 'setNewPassword',
    'projects/:name': 'search',
    'projects/:name/edit-metadata': 'editMetadata',
    'projects/:name/settings/:tab': 'projectSettings',
    'projects/:name/settings': 'projectSettings',
    'projects/:name/history': 'projectHistory',
    'projects/:name/statistics': 'statistics',
    'projects/:name/entries/:id': 'entry',
    'projects/:name/entries/:id/transcriptions/:name': 'entry',
    'projects/:name/entries/:id/transcriptions/:name/annotations/:id': 'entry',
    'publication-errors': 'publicationErrors'
  };

  MainRouter.prototype.publicationErrors = function() {
    var PublicationErrors;
    PublicationErrors = (function(_super1) {
      __extends(PublicationErrors, _super1);

      function PublicationErrors() {
        return PublicationErrors.__super__.constructor.apply(this, arguments);
      }

      PublicationErrors.prototype.className = 'publication-errors';

      PublicationErrors.prototype.initialize = function() {
        return this.render();
      };

      PublicationErrors.prototype.render = function() {
        var div, error, errors, h2, li, ol, _i, _len;
        errors = JSON.parse(localStorage.getItem("publicationErrors"));
        ol = document.createElement("ol");
        for (_i = 0, _len = errors.length; _i < _len; _i++) {
          error = errors[_i];
          li = document.createElement("li");
          li.innerHTML = error;
          ol.appendChild(li);
        }
        h2 = document.createElement("h2");
        h2.innerHTML = "Publication errors";
        div = document.createElement("div");
        div.appendChild(h2);
        div.appendChild(ol);
        return this.$el.html(div);
      };

      PublicationErrors.prototype.destroy = function() {
        return this.remove();
      };

      return PublicationErrors;

    })(Backbone.View);
    return viewManager.show(PublicationErrors);
  };

  MainRouter.prototype.login = function() {
    if (currentUser.loggedIn) {
      return currentUser.logout();
    }
    return viewManager.show(Views.Login);
  };

  MainRouter.prototype.noproject = function() {
    var view;
    if (currentUser.loggedIn) {
      view = new Views.NoProject();
      $('div#main').append(view.el);
      currentUser.loggedIn = false;
      return sessionStorage.clear();
    } else {
      return this.login();
    }
  };

  MainRouter.prototype.setNewPassword = function() {
    var view;
    this.login();
    view = new Views.SetNewPassword();
    return $('div#main').append(view.el);
  };

  MainRouter.prototype.search = function(projectName) {
    return viewManager.show(Views.Search, {
      projectName: projectName
    }, {
      cache: "search-" + projectName
    });
  };

  MainRouter.prototype.editMetadata = function(projectName) {
    return viewManager.show(Views.EditMetadata, {
      projectName: projectName
    });
  };

  MainRouter.prototype.projectSettings = function(projectName, tab) {
    return viewManager.show(Views.ProjectSettings, {
      projectName: projectName,
      tabName: tab
    });
  };

  MainRouter.prototype.projectHistory = function(projectName) {
    return viewManager.show(Views.ProjectHistory, {
      projectName: projectName,
      cache: false
    });
  };

  MainRouter.prototype.statistics = function(projectName) {
    return viewManager.show(Views.Statistics, {
      projectName: projectName,
      cache: false
    });
  };

  MainRouter.prototype.entry = function(projectName, entryID, transcriptionName, annotationID) {
    var attrs, changedIndex;
    attrs = {
      projectName: projectName,
      entryId: entryID,
      transcriptionName: transcriptionName,
      annotationID: annotationID
    };
    if (this.project != null) {
      changedIndex = this.project.get('entries').changed.indexOf(+entryID);
    }
    if (changedIndex > -1) {
      this.project.get('entries').changed.splice(changedIndex, 1);
      attrs.cache = false;
    }
    return viewManager.show(Views.Entry, attrs);
  };

  return MainRouter;

})(Backbone.Router);

module.exports = new MainRouter();


},{"../collections/projects":46,"../models/currentUser":55,"../util/view-manager":70,"../views/entry/main":73,"../views/login":79,"../views/no-project":80,"../views/project/history":81,"../views/project/search":84,"../views/project/search/edit-metadata":82,"../views/project/settings/main":89,"../views/project/statistics":92,"../views/set-new-password":93,"../views/ui/header":94,"hilib/src/managers/history":5,"hilib/src/managers/view2":8,"hilib/src/mixins/pubsub":14,"hilib/src/utils/general":17}],70:[function(require,module,exports){
var $, ViewManager;

$ = require('jquery');

ViewManager = (function() {
  function ViewManager() {
    this._currentView = null;
    this._cache = {};
  }

  ViewManager.prototype.show = function(View, viewOptions, options) {
    var cachedView, key, view, _ref;
    if (options == null) {
      options = {};
    }
    if (this._currentView != null) {
      this._currentView.destroy();
      this._currentView = null;
    }
    _ref = this._cache;
    for (key in _ref) {
      cachedView = _ref[key];
      cachedView.$el.hide();
    }
    if (options.cache != null) {
      if (this._cache[options.cache] == null) {
        this._cache[options.cache] = new View(viewOptions);
        $('div#container').append(this._cache[options.cache].el);
      }
      return this._cache[options.cache].$el.show();
    } else {
      this._currentView = new View(viewOptions);
      view = this._currentView.el;
      return $('div#main').html(view);
    }
  };

  ViewManager.prototype.removeFromCache = function(key) {
    return delete this._cache[key];
  };

  return ViewManager;

})();

module.exports = ViewManager;


},{}],71:[function(require,module,exports){
var AnnotationEditor, Backbone, Collections, Views, tpl, viewManager,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

viewManager = require('hilib/src/managers/view2');

Collections = {
  projects: require('../../../collections/projects')
};

Views = {
  Base: require('hilib/src/views/base'),
  SuperTinyEditor: require('hilib/src/views/supertinyeditor/supertinyeditor'),
  Modal: require('hilib/src/views/modal'),
  Form: require('hilib/src/views/form/main')
};

tpl = require('../../../../jade/entry/annotation.metadata.jade');

AnnotationEditor = (function(_super) {
  __extends(AnnotationEditor, _super);

  function AnnotationEditor() {
    return AnnotationEditor.__super__.constructor.apply(this, arguments);
  }

  AnnotationEditor.prototype.className = '';

  AnnotationEditor.prototype.initialize = function(options) {
    this.options = options;
    AnnotationEditor.__super__.initialize.apply(this, arguments);
    return Collections.projects.getCurrent((function(_this) {
      return function(project) {
        _this.project = project;
        return _this.render();
      };
    })(this));
  };

  AnnotationEditor.prototype.render = function() {
    this.subviews.editor = new Views.SuperTinyEditor({
      cssFile: '/css/main.css',
      controls: ['b_save', 'b_cancel', 'b_metadata', 'n', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'removeFormat', '|', 'diacritics', '|', 'undo', 'redo'],
      height: this.options.height,
      html: this.model.get('body'),
      htmlAttribute: 'body',
      model: this.model,
      width: this.options.width,
      wrap: true
    });
    this.$el.html(this.subviews.editor.el);
    this.listenTo(this.subviews.editor, 'button:save', this.save);
    this.listenTo(this.subviews.editor, 'button:cancel', (function(_this) {
      return function() {
        return _this.trigger('cancel');
      };
    })(this));
    this.listenTo(this.subviews.editor, 'button:metadata', this.editMetadata);
    this.show();
    return this;
  };

  AnnotationEditor.prototype.events = function() {};

  AnnotationEditor.prototype.show = function(annotation) {
    if (this.visible()) {
      this.hide();
    }
    if (annotation != null) {
      this.model = annotation;
      this.subviews.editor.setModel(this.model);
    }
    this.subviews.editor.$('.ste-header:nth-child(2)').addClass('annotationtext').html(this.model.get('annotatedText'));
    this.setURLPath(this.model.id);
    return this.el.style.display = 'block';
  };

  AnnotationEditor.prototype.hide = function() {
    this.el.style.display = 'none';
    return this.trigger('hide', this.model.get('annotationNo'));
  };

  AnnotationEditor.prototype.visible = function() {
    return this.el.style.display === 'block';
  };

  AnnotationEditor.prototype.setURLPath = function(id) {
    var fragment, index;
    index = Backbone.history.fragment.indexOf('/annotations/');
    fragment = index !== -1 ? Backbone.history.fragment.substr(0, index) : Backbone.history.fragment;
    if (id != null) {
      fragment = fragment + '/annotations/' + id;
    }
    return Backbone.history.navigate(fragment, {
      replace: true
    });
  };

  AnnotationEditor.prototype.save = function(done) {
    if (done == null) {
      done = function() {};
    }
    if (this.model.isNew()) {
      return this.model.save([], {
        success: (function(_this) {
          return function(model) {
            _this.setURLPath(model.id);
            _this.publish('message', "Annotation " + (_this.model.get('annotationNo')) + " saved.");
            _this.trigger('newannotation:saved', model);
            return done();
          };
        })(this),
        error: (function(_this) {
          return function(model, xhr, options) {
            return console.error('Saving annotation failed!', model, xhr, options);
          };
        })(this)
      });
    } else {
      return this.model.save([], {
        success: (function(_this) {
          return function(model) {
            _this.setURLPath(model.id);
            _this.publish('message', "Annotation " + (_this.model.get('annotationNo')) + " saved.");
            return done();
          };
        })(this)
      });
    }
  };

  AnnotationEditor.prototype.editMetadata = function() {
    if (this.subviews.annotationMetadata != null) {
      this.subviews.annotationMetadata.destroy();
    }
    this.subviews.annotationMetadata = new Views.Form({
      tpl: tpl,
      model: this.model.clone(),
      collection: this.project.get('annotationtypes')
    });
    this.subviews.annotationMetadata.model.on('change:metadata:type', (function(_this) {
      return function(annotationTypeID) {
        _this.subviews.annotationMetadata.model.set('metadata', {});
        _this.subviews.annotationMetadata.model.set('annotationType', _this.project.get('annotationtypes').get(annotationTypeID).attributes);
        return _this.subviews.annotationMetadata.render();
      };
    })(this));
    if (this.subviews.modal != null) {
      this.subviews.modal.destroy();
    }
    this.subviews.modal = new Views.Modal({
      title: "Edit annotation metadata",
      html: this.subviews.annotationMetadata.el,
      submitValue: 'Save metadata',
      width: '300px'
    });
    return this.subviews.modal.on('submit', (function(_this) {
      return function() {
        _this.model.updateFromClone(_this.subviews.annotationMetadata.model);
        return _this.save(function() {
          _this.publish('message', "Saved metadata for annotation: " + (_this.model.get('annotationNo')) + ".");
          return _this.subviews.modal.close();
        });
      };
    })(this));
  };

  return AnnotationEditor;

})(Views.Base);

module.exports = AnnotationEditor;


},{"../../../../jade/entry/annotation.metadata.jade":95,"../../../collections/projects":46,"hilib/src/managers/view2":8,"hilib/src/views/base":20,"hilib/src/views/form/main":25,"hilib/src/views/modal":30,"hilib/src/views/supertinyeditor/supertinyeditor":34}],72:[function(require,module,exports){
var Backbone, LayerEditor, StringFn, Views, pkg, viewManager,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

viewManager = require('hilib/src/managers/view2');

StringFn = require('hilib/src/utils/string');

Views = {
  Base: require('hilib/src/views/base'),
  SuperTinyEditor: require('hilib/src/views/supertinyeditor/supertinyeditor'),
  Modal: require('hilib/src/views/modal')
};

pkg = require('../../../../../package.json');

LayerEditor = (function(_super) {
  __extends(LayerEditor, _super);

  function LayerEditor() {
    return LayerEditor.__super__.constructor.apply(this, arguments);
  }

  LayerEditor.prototype.className = '';

  LayerEditor.prototype.initialize = function(options) {
    this.options = options;
    LayerEditor.__super__.initialize.apply(this, arguments);
    return this.render();
  };

  LayerEditor.prototype.render = function() {
    this.subviews.editor = new Views.SuperTinyEditor({
      controls: ['b_save', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'removeFormat', '|', 'diacritics', '|', 'undo', 'redo', '|', 'wordwrap'],
      cssFile: "/css/main-" + pkg.version + ".css",
      height: this.options.height,
      html: this.model.get('body'),
      htmlAttribute: 'body',
      model: this.model,
      width: this.options.width,
      wrap: this.options.wordwrap
    });
    this.$el.html(this.subviews.editor.el);
    this.listenTo(this.subviews.editor, 'control:wordwrap', (function(_this) {
      return function(wrap) {
        return _this.trigger('wrap', wrap);
      };
    })(this));
    this.listenTo(this.subviews.editor, 'button:save', (function(_this) {
      return function() {
        return _this.model.save(null, {
          success: function() {
            return _this.publish('message', "" + (_this.model.get('textLayer')) + " layer saved.");
          }
        });
      };
    })(this));
    this.show();
    return this;
  };

  LayerEditor.prototype.events = function() {};

  LayerEditor.prototype.show = function(textLayer) {
    if (this.visible()) {
      this.hide();
    }
    if (textLayer != null) {
      this.model = textLayer;
      this.subviews.editor.setModel(this.model);
    }
    this.setURLPath();
    return this.el.style.display = 'block';
  };

  LayerEditor.prototype.hide = function() {
    return this.el.style.display = 'none';
  };

  LayerEditor.prototype.visible = function() {
    return this.el.style.display === 'block';
  };

  LayerEditor.prototype.setURLPath = function() {
    var index, newFragment, newTextLayer, oldFragment, oldTextLayer;
    oldFragment = Backbone.history.fragment;
    index = oldFragment.indexOf('/transcriptions/');
    newFragment = index !== -1 ? oldFragment.substr(0, index) : oldFragment;
    oldTextLayer = oldFragment.substr(index);
    oldTextLayer = oldTextLayer.replace('/transcriptions/', '');
    index = oldTextLayer.indexOf('/');
    if (index !== -1) {
      oldTextLayer = oldTextLayer.substr(0, index);
    }
    newTextLayer = StringFn.slugify(this.model.get('textLayer'));
    newFragment = newFragment + '/transcriptions/' + newTextLayer;
    return Backbone.history.navigate(newFragment, {
      replace: true
    });
  };

  LayerEditor.prototype.remove = function() {
    this.subviews.editor.remove();
    return LayerEditor.__super__.remove.apply(this, arguments);
  };

  return LayerEditor;

})(Views.Base);

module.exports = LayerEditor;


},{"../../../../../package.json":38,"hilib/src/managers/view2":8,"hilib/src/utils/string":19,"hilib/src/views/base":20,"hilib/src/views/modal":30,"hilib/src/views/supertinyeditor/supertinyeditor":34}],73:[function(require,module,exports){
var $, Async, Backbone, Collections, Entry, Fn, Models, StringFn, Views, config, dom, tpl, viewManager,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

$ = require('jquery');

Fn = require('hilib/src/utils/general');

dom = require('hilib/src/utils/dom');

viewManager = require('hilib/src/managers/view2');

StringFn = require('hilib/src/utils/string');

require('hilib/src/utils/jquery.mixin');

Async = require('hilib/src/managers/async');

config = require('../../models/config');

Models = {
  Entry: require('../../models/entry'),
  currentUser: require('../../models/currentUser')
};

Collections = {
  projects: require('../../collections/projects')
};

Views = {
  Base: require('hilib/src/views/base'),
  Submenu: require('./main.submenu'),
  Preview: require('./preview/main'),
  EditFacsimiles: require('./subsubmenu/facsimiles.edit'),
  Modal: require('hilib/src/views/modal'),
  AnnotationEditor: require('./editors/annotation'),
  LayerEditor: require('./editors/layer')
};

tpl = require('../../../jade/entry/main.jade');

Entry = (function(_super) {
  __extends(Entry, _super);

  function Entry() {
    return Entry.__super__.constructor.apply(this, arguments);
  }

  Entry.prototype.className = 'entry';

  Entry.prototype.initialize = function(options) {
    var async;
    this.options = options;
    Entry.__super__.initialize.apply(this, arguments);
    async = new Async(['transcriptions', 'facsimiles', 'settings']);
    this.listenToOnce(async, 'ready', (function(_this) {
      return function() {
        return _this.render();
      };
    })(this));
    return Collections.projects.getCurrent((function(_this) {
      return function(project) {
        var jqXHR;
        _this.project = project;
        _this.entry = _this.project.get('entries').get(_this.options.entryId);
        if (_this.entry == null) {
          _this.entry = new Models.Entry({
            id: _this.options.entryId,
            projectID: _this.project.id
          });
          _this.project.get('entries').add(_this.entry);
        }
        _this.entry.project = _this.project;
        jqXHR = _this.entry.fetch({
          success: function(model, response, options) {
            _this.entry.fetchTranscriptions(_this.options.transcriptionName, function(currentTranscription) {
              _this.currentTranscription = currentTranscription;
              return async.called('transcriptions');
            });
            _this.entry.fetchFacsimiles(function() {
              return async.called('facsimiles');
            });
            return _this.entry.fetchSettings(function() {
              return async.called('settings');
            });
          }
        });
        return jqXHR.fail(function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        });
      };
    })(this));
  };

  Entry.prototype.render = function() {
    var rtpl, transcription;
    rtpl = tpl({
      entry: this.entry,
      user: Models.currentUser
    });
    this.$el.html(rtpl);
    this.subviews.submenu = new Views.Submenu({
      entry: this.entry,
      user: Models.currentUser,
      project: this.project
    });
    this.$el.prepend(this.subviews.submenu.el);
    this.renderEditFacsimilesMenu();
    if (config.get('entry-left-preview') != null) {
      transcription = this.entry.get('transcriptions').findWhere({
        'textLayer': config.get('entry-left-preview')
      });
      this.showLeftTranscription(transcription.id);
    } else {
      this.renderFacsimile();
    }
    this.renderTranscriptionEditor();
    this.addListeners();
    return this.currentTranscription.getAnnotations((function(_this) {
      return function(annotations) {
        var annotation;
        if (_this.options.annotationID != null) {
          annotation = annotations.get(_this.options.annotationID);
          _this.subviews.preview.setAnnotatedText(annotation);
          return _this.renderAnnotationEditor(annotation);
        }
      };
    })(this));
  };

  Entry.prototype.renderEditFacsimilesMenu = function() {
    this.subviews.editFacsimiles = new Views.EditFacsimiles({
      collection: this.entry.get('facsimiles')
    });
    return this.$('.subsubmenu .editfacsimiles').replaceWith(this.subviews.editFacsimiles.el);
  };

  Entry.prototype.renderFacsimile = function() {
    var $iframe, url;
    this.el.querySelector('.left-pane iframe').style.display = 'block';
    this.el.querySelector('.left-pane .preview-placeholder').style.display = 'none';
    $iframe = this.$('.left-pane iframe');
    $iframe.attr('src', '');
    if (this.entry.get('facsimiles').current != null) {
      url = this.entry.get('facsimiles').current.get('zoomableUrl');
      $iframe.attr('src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.1/viewer.html?rft_id=' + url);
      return $iframe.height(document.documentElement.clientHeight - 89);
    }
  };

  Entry.prototype.renderPreview = function() {
    if (this.subviews.preview != null) {
      return this.subviews.preview.setModel(this.entry);
    } else {
      this.subviews.preview = new Views.Preview({
        model: this.entry,
        wordwrap: this.project.get('settings').get('wordwrap')
      });
      return this.$('.right-pane .preview-placeholder').append(this.subviews.preview.el);
    }
  };

  Entry.prototype.renderTranscriptionEditor = function() {
    this.renderPreview();
    this.subviews.submenu.render();
    if (!this.subviews.layerEditor) {
      this.subviews.layerEditor = new Views.LayerEditor({
        model: this.currentTranscription,
        height: this.subviews.preview.$el.innerHeight(),
        width: this.subviews.preview.$el.outerWidth(),
        wordwrap: this.project.get('settings').get('wordwrap')
      });
      this.$('.transcription-placeholder').html(this.subviews.layerEditor.el);
    } else {
      this.subviews.layerEditor.show(this.currentTranscription);
    }
    if (this.subviews.annotationEditor != null) {
      return this.subviews.annotationEditor.hide();
    }
  };

  Entry.prototype.renderAnnotationEditor = function(model) {
    var showAnnotationEditor;
    showAnnotationEditor = (function(_this) {
      return function() {
        if (!_this.subviews.annotationEditor) {
          _this.subviews.annotationEditor = new Views.AnnotationEditor({
            model: model,
            height: _this.subviews.preview.$el.innerHeight() - 31,
            width: _this.subviews.preview.$el.outerWidth()
          });
          _this.$('.annotation-placeholder').html(_this.subviews.annotationEditor.el);
          _this.listenTo(_this.subviews.annotationEditor, 'cancel', function() {
            return _this.showUnsavedChangesModal({
              model: _this.subviews.annotationEditor.model,
              html: "<p>There are unsaved changes in annotation: " + (_this.subviews.annotationEditor.model.get('annotationNo')) + ".<p>",
              done: function() {
                _this.subviews.preview.removeNewAnnotationTags();
                return _this.renderTranscriptionEditor();
              }
            });
          });
          _this.listenTo(_this.subviews.annotationEditor, 'newannotation:saved', function(annotation) {
            _this.currentTranscription.get('annotations').add(annotation);
            return _this.subviews.preview.highlightAnnotation(annotation.get('annotationNo'));
          });
          _this.listenTo(_this.subviews.annotationEditor, 'hide', function(annotationNo) {
            return _this.subviews.preview.unhighlightAnnotation(annotationNo);
          });
        } else {
          _this.subviews.annotationEditor.show(model);
        }
        _this.subviews.preview.highlightAnnotation(model.get('annotationNo'));
        return _this.subviews.layerEditor.hide();
      };
    })(this);
    return this.showUnsavedChangesModal({
      model: this.subviews.layerEditor.model,
      html: "<p>There are unsaved changes in the " + (this.subviews.layerEditor.model.get('textLayer')) + " layer.</p>",
      done: showAnnotationEditor
    });
  };

  Entry.prototype.events = function() {
    return {
      'click li[data-key="layer"]': 'changeTranscription',
      'click .left-menu ul.textlayers li[data-key="transcription"]': 'showLeftTranscription',
      'click .middle-menu ul.textlayers li[data-key="transcription"]': 'changeTranscription',
      'click .menu li.subsub': function(ev) {
        return this.subviews.editFacsimiles.$el.slideToggle('fast');
      }
    };
  };

  Entry.prototype.showLeftTranscription = function(ev) {
    var transcription, transcriptionID;
    this.$('.left-pane iframe').hide();
    this.$('.left-pane .preview-placeholder').show();
    transcriptionID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
    transcription = this.entry.get('transcriptions').get(transcriptionID);
    config.set('entry-left-preview', transcription.get('textLayer'));
    if (this.subviews.leftPreview != null) {
      this.subviews.leftPreview.destroy();
    }
    this.subviews.leftPreview = new Views.Preview({
      model: this.entry,
      textLayer: transcription,
      wordwrap: true
    });
    this.$('.left-pane .preview-placeholder').html(this.subviews.leftPreview.el);
    this.$('.left-menu .facsimiles li.active').removeClass('active');
    this.$('.left-menu .textlayers li.active').removeClass('active');
    this.$('.left-menu .textlayers li[data-value="' + transcriptionID + '"]').addClass('active');
    return this.entry.get('facsimiles').current = null;
  };

  Entry.prototype.showUnsavedChangesModal = function(args) {
    var done, html, model;
    model = args.model, html = args.html, done = args.done;
    if (model.changedSinceLastSave != null) {
      if (this.subviews.modal != null) {
        this.subviews.modal.destroy();
      }
      this.subviews.modal = new Views.Modal({
        title: "Unsaved changes",
        html: html,
        submitValue: 'Discard changes',
        width: '320px'
      });
      return this.subviews.modal.on('submit', (function(_this) {
        return function() {
          model.cancelChanges();
          _this.subviews.modal.close();
          return done();
        };
      })(this));
    } else {
      return done();
    }
  };

  Entry.prototype.changeTranscription = function(ev) {
    var showTranscription;
    ev.stopPropagation();
    showTranscription = (function(_this) {
      return function() {
        var newTranscription, transcriptionID;
        transcriptionID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
        newTranscription = _this.entry.get('transcriptions').get(transcriptionID);
        if (newTranscription !== _this.currentTranscription) {
          return _this.entry.get('transcriptions').setCurrent(newTranscription);
        } else if (!_this.subviews.layerEditor.visible()) {
          return _this.entry.get('transcriptions').trigger('current:change', _this.currentTranscription);
        }
      };
    })(this);
    if ((this.subviews.annotationEditor != null) && this.subviews.annotationEditor.visible()) {
      return this.showUnsavedChangesModal({
        model: this.subviews.annotationEditor.model,
        html: "<p>There are unsaved changes in annotation: " + (this.subviews.annotationEditor.model.get('annotationNo')) + ".</p>",
        done: showTranscription
      });
    } else {
      return this.showUnsavedChangesModal({
        model: this.subviews.layerEditor.model,
        html: "<p>There are unsaved changes in the " + (this.subviews.layerEditor.model.get('textLayer')) + " layer.</p>",
        done: showTranscription
      });
    }
  };

  Entry.prototype.addListeners = function() {
    this.listenTo(this.subviews.preview, 'editAnnotation', this.renderAnnotationEditor);
    this.listenTo(this.subviews.preview, 'annotation:removed', this.renderTranscriptionEditor);
    this.listenTo(this.subviews.preview, 'scrolled', (function(_this) {
      return function(percentages) {
        return _this.subviews.layerEditor.subviews.editor.setScrollPercentage(percentages);
      };
    })(this));
    this.listenTo(this.subviews.layerEditor.subviews.editor, 'scrolled', (function(_this) {
      return function(percentages) {
        return _this.subviews.preview.setScroll(percentages);
      };
    })(this));
    this.listenTo(this.subviews.layerEditor, 'wrap', (function(_this) {
      return function(wrap) {
        return _this.subviews.preview.toggleWrap(wrap);
      };
    })(this));
    this.listenTo(this.entry.get('facsimiles'), 'current:change', (function(_this) {
      return function(current) {
        return _this.renderFacsimile();
      };
    })(this));
    this.listenTo(this.entry.get('facsimiles'), 'add', this.addFacsimile);
    this.listenTo(this.entry.get('facsimiles'), 'remove', this.removeFacsimile);
    this.listenTo(this.entry.get('transcriptions'), 'current:change', (function(_this) {
      return function(current) {
        _this.currentTranscription = current;
        return _this.currentTranscription.getAnnotations(function(annotations) {
          return _this.renderTranscriptionEditor();
        });
      };
    })(this));
    this.listenTo(this.entry.get('transcriptions'), 'add', this.addTranscription);
    this.listenTo(this.entry.get('transcriptions'), 'remove', this.removeTranscription);
    return window.addEventListener('resize', (function(_this) {
      return function(ev) {
        return Fn.timeoutWithReset(600, function() {
          _this.renderFacsimile();
          _this.subviews.preview.resize();
          _this.subviews.layerEditor.subviews.editor.setIframeHeight(_this.subviews.preview.$el.innerHeight());
          _this.subviews.layerEditor.subviews.editor.setIframeWidth(_this.subviews.preview.$el.outerWidth());
          if (_this.subviews.annotationEditor != null) {
            _this.subviews.annotationEditor.subviews.editor.setIframeHeight(_this.subviews.preview.$el.innerHeight());
            return _this.subviews.annotationEditor.subviews.editor.setIframeWidth(_this.subviews.preview.$el.outerWidth());
          }
        });
      };
    })(this));
  };

  Entry.prototype.addFacsimile = function(facsimile, collection) {
    var li;
    this.$('li[data-key="facsimiles"] span').html("(" + collection.length + ")");
    li = $("<li data-key='facsimile' data-value='" + facsimile.id + "'>" + (facsimile.get('name')) + "</li>");
    this.$('.submenu .facsimiles').append(li);
    this.subviews.submenu.changeFacsimile(facsimile.id);
    this.subviews.editFacsimiles.$el.slideToggle('fast');
    return this.publish('message', "Added facsimile: \"" + (facsimile.get('name')) + "\".");
  };

  Entry.prototype.removeFacsimile = function(facsimile, collection) {
    if (this.entry.get('facsimiles').current === facsimile) {
      this.entry.get('facsimiles').setCurrent();
    }
    this.$('li[data-key="facsimiles"] span').html("(" + collection.length + ")");
    this.$('.submenu .facsimiles [data-value="' + facsimile.id + '"]').remove();
    return this.publish('message', "Removed facsimile: \"" + (facsimile.get('name')) + "\".");
  };

  Entry.prototype.removeTranscription = function(transcription) {
    this.$('.submenu .textlayers [data-value="' + transcription.id + '"]').remove();
    return this.publish('message', "Removed text layer: \"" + (transcription.get('textLayer')) + "\".");
  };

  Entry.prototype.addTranscription = function(transcription) {
    var li;
    li = $("<li data-key='transcription' data-value='" + transcription.id + "'>" + (transcription.get('textLayer')) + " layer</li>");
    this.$('.submenu .textlayers').append(li);
    this.changeTranscription(transcription.id);
    this.subviews.editFacsimiles.$el.slideToggle('fast');
    return this.publish('message', "Added text layer: \"" + (transcription.get('textLayer')) + "\".");
  };

  return Entry;

})(Views.Base);

module.exports = Entry;


},{"../../../jade/entry/main.jade":96,"../../collections/projects":46,"../../models/config":54,"../../models/currentUser":55,"../../models/entry":56,"./editors/annotation":71,"./editors/layer":72,"./main.submenu":74,"./preview/main":77,"./subsubmenu/facsimiles.edit":78,"hilib/src/managers/async":4,"hilib/src/managers/view2":8,"hilib/src/utils/dom":16,"hilib/src/utils/general":17,"hilib/src/utils/jquery.mixin":18,"hilib/src/utils/string":19,"hilib/src/views/base":20,"hilib/src/views/modal":30}],74:[function(require,module,exports){
var $, Async, Backbone, Base, EntrySubmenu, Fn, StringFn, Views, config, metadataTpl, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

$ = require('jquery');

Fn = require('hilib/src/utils/general');

StringFn = require('hilib/src/utils/string');

Async = require('hilib/src/managers/async');

config = require('../../models/config');

Base = require('hilib/src/views/base');

tpl = require('../../../jade/entry/main.submenu.jade');

metadataTpl = require('../../../jade/entry/metadata.jade');

Views = {
  Form: require('hilib/src/views/form/main'),
  Modal: require('hilib/src/views/modal')
};

EntrySubmenu = (function(_super) {
  __extends(EntrySubmenu, _super);

  function EntrySubmenu() {
    return EntrySubmenu.__super__.constructor.apply(this, arguments);
  }

  EntrySubmenu.prototype.className = 'submenu';

  EntrySubmenu.prototype.initialize = function(options) {
    var _ref;
    this.options = options;
    EntrySubmenu.__super__.initialize.apply(this, arguments);
    return _ref = this.options, this.entry = _ref.entry, this.user = _ref.user, this.project = _ref.project, _ref;
  };

  EntrySubmenu.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      entry: this.entry,
      user: this.user
    });
    this.$el.html(rtpl);
    this.entry.setPrevNext((function(_this) {
      return function() {
        return _this.activatePrevNext();
      };
    })(this));
    return this;
  };

  EntrySubmenu.prototype.events = function() {
    return {
      'click .menu li.active[data-key="previous"]': '_goToPreviousEntry',
      'click .menu li.active[data-key="next"]': '_goToNextEntry',
      'click .menu li[data-key="delete"]': 'deleteEntry',
      'click .menu li[data-key="metadata"]': 'editEntryMetadata',
      'click .menu li[data-key="facsimiles"] li[data-key="facsimile"]': 'changeFacsimile'
    };
  };

  EntrySubmenu.prototype.changeFacsimile = function(ev) {
    var facsimileID, newFacsimile;
    config.set('entry-left-preview', null);
    facsimileID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
    this.$('.left-menu .facsimiles li.active').removeClass('active');
    this.$('.left-menu .textlayers li.active').removeClass('active');
    this.$('.left-menu .facsimiles li[data-value="' + facsimileID + '"]').addClass('active');
    newFacsimile = this.entry.get('facsimiles').get(facsimileID);
    if (newFacsimile != null) {
      return this.entry.get('facsimiles').setCurrent(newFacsimile);
    }
  };

  EntrySubmenu.prototype.activatePrevNext = function() {
    if (this.entry.prevID != null) {
      this.$('li[data-key="previous"]').addClass('active');
    }
    if (this.entry.nextID != null) {
      return this.$('li[data-key="next"]').addClass('active');
    }
  };

  EntrySubmenu.prototype._goToPreviousEntry = function() {
    var projectName, transcription;
    projectName = this.entry.project.get('name');
    transcription = StringFn.slugify(this.entry.get('transcriptions').current.get('textLayer'));
    return Backbone.history.navigate("projects/" + projectName + "/entries/" + this.entry.prevID + "/transcriptions/" + transcription, {
      trigger: true
    });
  };

  EntrySubmenu.prototype._goToNextEntry = function() {
    var projectName, transcription;
    projectName = this.entry.project.get('name');
    transcription = StringFn.slugify(this.entry.get('transcriptions').current.get('textLayer'));
    return Backbone.history.navigate("projects/" + projectName + "/entries/" + this.entry.nextID + "/transcriptions/" + transcription, {
      trigger: true
    });
  };

  EntrySubmenu.prototype.deleteEntry = (function() {
    var modal;
    modal = null;
    return function(ev) {
      if (modal != null) {
        return;
      }
      modal = new Views.Modal({
        title: 'Caution!',
        html: "You are about to <b>REMOVE</b> entry: \"" + (this.entry.get('name')) + "\" <small>(id: " + this.entry.id + ")</small>.<br><br>All text and annotations will be <b>PERMANENTLY</b> removed!",
        submitValue: 'Remove entry',
        width: 'auto'
      });
      modal.on('submit', (function(_this) {
        return function() {
          var jqXHR;
          jqXHR = _this.entry.destroy();
          return jqXHR.done(function() {
            modal.close();
            _this.publish('faceted-search:refresh');
            _this.publish('message', "Removed entry " + _this.entry.id + " from project.");
            return Backbone.history.navigate("projects/" + (_this.project.get('name')), {
              trigger: true
            });
          });
        };
      })(this));
      return modal.on('close', function() {
        return modal = null;
      });
    };
  })();

  EntrySubmenu.prototype.editEntryMetadata = (function() {
    var modal;
    modal = null;
    return function(ev) {
      var entryMetadata;
      if (modal != null) {
        return;
      }
      entryMetadata = new Views.Form({
        tpl: metadataTpl,
        tplData: {
          user: this.user,
          entrymetadatafields: this.project.get('entrymetadatafields'),
          generateID: Fn.generateID
        },
        model: this.entry.clone()
      });
      modal = new Views.Modal({
        title: "Edit " + (config.get('entryTermSingular')) + " metadata",
        html: entryMetadata.el,
        submitValue: 'Save metadata',
        width: '50vw',
        customClassName: 'entry-metadata'
      });
      modal.on('submit', (function(_this) {
        return function() {
          var async;
          _this.entry.updateFromClone(entryMetadata.model);
          async = new Async(['entry', 'settings']);
          _this.listenToOnce(async, 'ready', function() {
            modal.close();
            return _this.publish('message', "Saved metadata for entry: " + (_this.entry.get('name')) + ".");
          });
          _this.entry.get('settings').save(null, {
            success: function() {
              return async.called('settings');
            }
          });
          return _this.entry.save(null, {
            success: function() {
              return async.called('entry');
            }
          });
        };
      })(this));
      modal.on('close', function() {
        modal = null;
        return $('.entry-metadata form.hilib textarea').off('keydown', this.adjustTextareaHeight);
      });
      $('.entry-metadata form.hilib textarea').each((function(_this) {
        return function(i, te) {
          return _this.adjustTextareaHeight(te);
        };
      })(this));
      return $('.entry-metadata form.hilib textarea').on('keydown', this.adjustTextareaHeight);
    };
  })();

  EntrySubmenu.prototype.adjustTextareaHeight = function(ev) {
    var target;
    target = ev.hasOwnProperty('currentTarget') ? ev.currentTarget : ev;
    target.style.height = '24px';
    return target.style.height = target.scrollHeight + 12 + 'px';
  };

  return EntrySubmenu;

})(Base);

module.exports = EntrySubmenu;


},{"../../../jade/entry/main.submenu.jade":97,"../../../jade/entry/metadata.jade":98,"../../models/config":54,"hilib/src/managers/async":4,"hilib/src/utils/general":17,"hilib/src/utils/string":19,"hilib/src/views/base":20,"hilib/src/views/form/main":25,"hilib/src/views/modal":30}],75:[function(require,module,exports){
var AddAnnotationTooltip, Annotation, BaseView, Fn, dom, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('hilib/src/utils/general');

dom = require('hilib/src/utils/dom');

BaseView = require('hilib/src/views/base');

Annotation = require('../../../models/annotation');

tpl = require('../../../../jade/entry/tooltip.add.annotation.jade');

AddAnnotationTooltip = (function(_super) {
  __extends(AddAnnotationTooltip, _super);

  function AddAnnotationTooltip() {
    return AddAnnotationTooltip.__super__.constructor.apply(this, arguments);
  }

  AddAnnotationTooltip.prototype.className = "tooltip addannotation";

  AddAnnotationTooltip.prototype.initialize = function(options) {
    var _ref;
    this.options = options;
    AddAnnotationTooltip.__super__.initialize.apply(this, arguments);
    this.container = (_ref = this.options.container) != null ? _ref : document.querySelector('body');
    return this.render();
  };

  AddAnnotationTooltip.prototype.render = function() {
    var tooltip;
    this.el.innerHTML = tpl({
      annotationTypes: this.options.annotationTypes
    });
    tooltip = tooltip = document.querySelector('.tooltip.addannotation');
    if (tooltip != null) {
      tooltip.remove();
    }
    dom(this.container).prepend(this.el);
    return this;
  };

  AddAnnotationTooltip.prototype.events = function() {
    return {
      'change select': 'selectChanged',
      'click button': 'buttonClicked'
    };
  };

  AddAnnotationTooltip.prototype.selectChanged = function(ev) {
    var index, option;
    index = ev.currentTarget.selectedIndex;
    option = ev.currentTarget.options[index];
    return this.newannotation.set('annotationType', this.options.annotationTypes.get(option.value).attributes);
  };

  AddAnnotationTooltip.prototype.buttonClicked = function(ev) {
    this.hide();
    return this.trigger('clicked', this.newannotation);
  };

  AddAnnotationTooltip.prototype.show = function(position) {
    this.newannotation = new Annotation({
      annotationType: this.options.annotationTypes.at(0)
    });
    this.setPosition(position);
    return this.el.classList.add('active');
  };

  AddAnnotationTooltip.prototype.hide = function() {
    return this.el.classList.remove('active');
  };

  AddAnnotationTooltip.prototype.setPosition = function(position) {
    var boundingBox, left, top;
    boundingBox = Fn.boundingBox(this.container);
    position.left = position.left - boundingBox.left;
    position.top = position.top - boundingBox.top;
    this.$el.removeClass('tipright tipleft tipbottom');
    left = position.left - this.$el.width() / 2;
    top = position.top + 30;
    if (left < 10) {
      left = 10;
      this.$el.addClass('tipleft');
    }
    if (boundingBox.width < (left + this.$el.width())) {
      left = boundingBox.width - this.$el.width() - 10;
      this.$el.addClass('tipright');
    }
    this.$el.css('left', left);
    return this.$el.css('top', top);
  };

  AddAnnotationTooltip.prototype.isActive = function() {
    return this.$el.css('z-index') > 0;
  };

  return AddAnnotationTooltip;

})(BaseView);

module.exports = AddAnnotationTooltip;


},{"../../../../jade/entry/tooltip.add.annotation.jade":101,"../../../models/annotation":52,"hilib/src/utils/dom":16,"hilib/src/utils/general":17,"hilib/src/views/base":20}],76:[function(require,module,exports){
var BaseView, EditAnnotationTooltip, Fn, currentUser, dom, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('hilib/src/utils/general');

dom = require('hilib/src/utils/dom');

BaseView = require('hilib/src/views/base');

currentUser = require('../../../models/currentUser');

tpl = require('../../../../jade/ui/tooltip.jade');

EditAnnotationTooltip = (function(_super) {
  __extends(EditAnnotationTooltip, _super);

  function EditAnnotationTooltip() {
    return EditAnnotationTooltip.__super__.constructor.apply(this, arguments);
  }

  EditAnnotationTooltip.prototype.className = 'tooltip editannotation';

  EditAnnotationTooltip.prototype.initialize = function(options) {
    var _ref;
    this.options = options;
    EditAnnotationTooltip.__super__.initialize.apply(this, arguments);
    this.container = (_ref = this.options.container) != null ? _ref : document.querySelector('body');
    return this.render();
  };

  EditAnnotationTooltip.prototype.render = function() {
    var tooltip;
    this.$el.html(tpl({
      interactive: this.options.interactive,
      user: currentUser
    }));
    tooltip = this.container.querySelector('.tooltip.editannotation');
    if (tooltip != null) {
      tooltip.remove();
    }
    return dom(this.container).prepend(this.el);
  };

  EditAnnotationTooltip.prototype.events = function() {
    return {
      'click .edit': 'editClicked',
      'click .delete': 'deleteClicked',
      'click': 'clicked'
    };
  };

  EditAnnotationTooltip.prototype.editClicked = function(ev) {
    return this.trigger('edit', this.model);
  };

  EditAnnotationTooltip.prototype.deleteClicked = function(ev) {
    return this.trigger('delete', this.model);
  };

  EditAnnotationTooltip.prototype.clicked = function(ev) {
    return this.hide();
  };

  EditAnnotationTooltip.prototype.show = function(args) {
    var $el, contentId;
    $el = args.$el, this.model = args.model;
    this.pointedEl = $el[0];
    this.el.style.left = 0;
    this.el.style.top = 0;
    this.el.querySelector('.tooltip-body').innerHTML = '';
    this.el.querySelector('.annotation-type').innerHTML = '';
    contentId = (this.model != null) && (this.model.get('annotationNo') != null) ? this.model.get('annotationNo') : -1;
    if (contentId === +this.el.getAttribute('data-id')) {
      this.hide();
      return false;
    }
    this.el.setAttribute('data-id', contentId);
    if (this.model != null) {
      this.$el.removeClass('newannotation');
      this.el.querySelector('.tooltip-body').innerHTML = this.model.get('body');
      if (this.model.get('annotationType').name != null) {
        this.el.querySelector('.annotation-type').innerHTML = this.model.get('annotationType').name;
      }
    } else {
      this.$el.addClass('newannotation');
    }
    if (this.options.container != null) {
      this.setRelativePosition(dom(this.pointedEl).position(this.options.container));
    } else {
      this.setAbsolutePosition($el.offset());
    }
    return this.el.classList.add('active');
  };

  EditAnnotationTooltip.prototype.hide = function() {
    this.el.removeAttribute('data-id');
    return this.el.classList.remove('active');
  };

  EditAnnotationTooltip.prototype.setRelativePosition = function(position) {
    var boundingBox, left, newTop, scrollBottomPos, tooltipBottomPos, top;
    boundingBox = Fn.boundingBox(this.container);
    this.$el.removeClass('tipright tipleft tipbottom');
    left = (this.pointedEl.offsetWidth / 2) + position.left - (this.$el.width() / 2);
    top = position.top + 30;
    if (left < 10) {
      left = 10;
      this.$el.addClass('tipleft');
    }
    if (boundingBox.width < (left + this.$el.width())) {
      left = boundingBox.width - this.$el.width() - 10;
      this.$el.addClass('tipright');
    }
    tooltipBottomPos = top + this.$el.height();
    scrollBottomPos = this.container.scrollTop + this.container.clientHeight;
    if (tooltipBottomPos > scrollBottomPos) {
      newTop = top - 48 - this.$el.height();
      if (newTop > 0) {
        top = newTop;
        this.$el.addClass('tipbottom');
      }
    }
    this.$el.css('left', left);
    return this.$el.css('top', top);
  };

  EditAnnotationTooltip.prototype.setAbsolutePosition = function(position) {
    var boundingBox, left, top;
    console.error('Don"t use! This has to be fixed!');
    boundingBox = Fn.boundingBox(this.container);
    this.$el.removeClass('tipright tipleft tipbottom');
    left = position.left - this.$el.width() / 2;
    top = position.top + 30;
    if (boundingBox.left > left) {
      left = boundingBox.left + 10;
      this.$el.addClass('tipleft');
    }
    if (boundingBox.right < (left + this.$el.width())) {
      left = boundingBox.right - this.$el.width() - 10;
      this.$el.addClass('tipright');
    }
    if (boundingBox.bottom < top + this.$el.height()) {
      top = top - 60 - this.$el.height();
      this.$el.addClass('tipbottom');
    }
    this.$el.css('left', left);
    return this.$el.css('top', top);
  };

  EditAnnotationTooltip.prototype.isActive = function() {
    return this.$el.css('z-index') > 0;
  };

  return EditAnnotationTooltip;

})(BaseView);

module.exports = EditAnnotationTooltip;


},{"../../../../jade/ui/tooltip.jade":120,"../../../models/currentUser":55,"hilib/src/utils/dom":16,"hilib/src/utils/general":17,"hilib/src/views/base":20}],77:[function(require,module,exports){
var $, EntryPreview, Fn, Views, config, currentUser, dom, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

$ = require('jquery');

_ = require('underscore');

Fn = require('hilib/src/utils/general');

dom = require('hilib/src/utils/dom');

config = require('../../../models/config');

Views = {
  Base: require('hilib/src/views/base'),
  AddAnnotationTooltip: require('./annotation.add.tooltip'),
  EditAnnotationTooltip: require('./annotation.edit.tooltip')
};

currentUser = require('../../../models/currentUser');

tpl = require('../../../../jade/entry/preview.jade');

EntryPreview = (function(_super) {
  __extends(EntryPreview, _super);

  function EntryPreview() {
    return EntryPreview.__super__.constructor.apply(this, arguments);
  }

  EntryPreview.prototype.className = 'preview';

  EntryPreview.prototype.initialize = function(options) {
    var _base;
    this.options = options;
    EntryPreview.__super__.initialize.apply(this, arguments);
    this.autoscroll = false;
    this.highlighter = Fn.highlighter();
    this.interactive = this.options.textLayer != null ? false : true;
    if (this.options.textLayer != null) {
      this.transcription = this.options.textLayer;
      this.addListeners();
      this.render();
    } else {
      this.model.get('transcriptions').getCurrent((function(_this) {
        return function(transcription) {
          _this.transcription = transcription;
          _this.addListeners();
          return _this.render();
        };
      })(this));
    }
    if ((_base = this.options).wordwrap == null) {
      _base.wordwrap = false;
    }
    if (this.options.wordwrap) {
      this.toggleWrap();
    }
    return this.resize();
  };

  EntryPreview.prototype.render = function() {
    var count, data, lineCount, term, _ref, _ref1;
    data = this.transcription.toJSON();
    lineCount = ((_ref = data.body.match(/<br>/g)) != null ? _ref : []).length;
    if (data.body.substr(-4) !== '<br>') {
      lineCount++;
    }
    data.lineCount = lineCount;
    if (data.body.trim() === '') {
      data.lineCount = 0;
    }
    _ref1 = this.model.get('terms');
    for (term in _ref1) {
      if (!__hasProp.call(_ref1, term)) continue;
      count = _ref1[term];
      data.body = data.body.replace(new RegExp(term, "gi"), '<span class="highlight">$&</span>');
    }
    data.user = currentUser;
    this.el.innerHTML = tpl(data);
    this.renderTooltips();
    this.onHover();
    return this;
  };

  EntryPreview.prototype.renderTooltips = function() {
    if (this.subviews.editAnnotationTooltip != null) {
      this.subviews.editAnnotationTooltip.destroy();
    }
    this.subviews.editAnnotationTooltip = new Views.EditAnnotationTooltip({
      container: this.el.querySelector('.body-container'),
      interactive: this.interactive
    });
    if (this.interactive) {
      this.listenTo(this.subviews.editAnnotationTooltip, 'edit', (function(_this) {
        return function(model) {
          return _this.trigger('editAnnotation', model);
        };
      })(this));
      this.listenTo(this.subviews.editAnnotationTooltip, 'delete', (function(_this) {
        return function(model) {
          if (model.get('annotationNo') === 'newannotation') {
            _this.removeNewAnnotation();
          } else {
            _this.transcription.get('annotations').remove(model);
          }
          return _this.trigger('annotation:removed');
        };
      })(this));
      if (this.subviews.addAnnotationTooltip != null) {
        this.subviews.addAnnotationTooltip.destroy();
      }
      return this.subviews.addAnnotationTooltip = new Views.AddAnnotationTooltip({
        container: this.el.querySelector('.body-container'),
        annotationTypes: this.model.project.get('annotationtypes')
      });
    }
  };

  EntryPreview.prototype.events = function() {
    return {
      'click sup[data-marker="end"]': 'supClicked',
      'mousedown .body-container': 'onMousedown',
      'mouseup .body-container': 'onMouseup',
      'scroll': 'onScroll',
      'click .fa.fa-print': 'onPrint'
    };
  };

  EntryPreview.prototype.onPrint = function(ev) {
    var addAnnotations, addTranscription, h1, h2, mainDiv, pp, transcription;
    if (!this.interactive) {
      return;
    }
    addTranscription = (function(_this) {
      return function(el) {
        var clonedPreview;
        clonedPreview = el.cloneNode(true);
        clonedPreview.style.height = 'auto';
        return mainDiv.appendChild(clonedPreview);
      };
    })(this);
    addAnnotations = (function(_this) {
      return function(annotations) {
        var h2, ol, sups;
        if ((annotations != null) && annotations.length > 0) {
          ol = document.createElement('ol');
          ol.className = 'annotations';
          sups = document.querySelectorAll('sup[data-marker="end"]');
          _.each(sups, function(sup) {
            var annotation, li;
            annotation = annotations.findWhere({
              annotationNo: +sup.getAttribute('data-id')
            });
            li = document.createElement('li');
            li.innerHTML = annotation.get('body');
            return ol.appendChild(li);
          });
          h2 = document.createElement('h2');
          h2.innerHTML = 'Annotations';
          mainDiv.appendChild(h2);
          return mainDiv.appendChild(ol);
        }
      };
    })(this);
    pp = document.querySelector('#printpreview');
    if (pp != null) {
      pp.parentNode.removeChild(pp);
    }
    mainDiv = document.createElement('div');
    mainDiv.id = 'printpreview';
    h1 = document.createElement('h1');
    h1.innerHTML = 'Preview entry: ' + this.model.get('name');
    h2 = document.createElement('h2');
    h2.innerHTML = 'Project: ' + this.model.project.get('title');
    mainDiv.appendChild(h1);
    mainDiv.appendChild(h2);
    if (config.get('entry-left-preview') != null) {
      addTranscription(document.querySelector('.left-pane .preview'));
      transcription = this.model.get('transcriptions').findWhere({
        'textLayer': config.get('entry-left-preview')
      });
      addAnnotations(transcription.get('annotations'));
    }
    addTranscription(document.querySelector('.right-pane .preview'));
    addAnnotations(this.model.get('transcriptions').current.get('annotations'));
    document.body.appendChild(mainDiv);
    return window.print();
  };

  EntryPreview.prototype.onScroll = function(ev) {
    if (!this.interactive) {
      return;
    }
    if (this.autoscroll = !this.autoscroll) {
      return Fn.timeoutWithReset(200, (function(_this) {
        return function() {
          return _this.trigger('scrolled', Fn.getScrollPercentage(ev.currentTarget));
        };
      })(this));
    }
  };

  EntryPreview.prototype.supClicked = function(ev) {
    var annotation, id;
    if (this.transcription.get('annotations') == null) {
      return console.error('No annotations found!');
    }
    id = ev.currentTarget.getAttribute('data-id');
    annotation = id === 'newannotation' ? this.newAnnotation : this.transcription.get('annotations').findWhere({
      annotationNo: id >> 0
    });
    if (annotation == null) {
      return console.error('Annotation not found! ID:', id, ' Collection:', this.transcription.get('annotations'));
    }
    this.setAnnotatedText(annotation);
    return this.subviews.editAnnotationTooltip.show({
      $el: $(ev.currentTarget),
      model: annotation
    });
  };

  EntryPreview.prototype.onMousedown = function(ev) {
    var downOnAdd, downOnEdit;
    if (!this.interactive) {
      return;
    }
    downOnAdd = ev.target === this.subviews.addAnnotationTooltip.el || dom(this.subviews.addAnnotationTooltip.el).hasDescendant(ev.target);
    downOnEdit = ev.target === this.subviews.editAnnotationTooltip.el || dom(this.subviews.editAnnotationTooltip.el).hasDescendant(ev.target);
    if (!(downOnEdit || downOnAdd)) {
      this.subviews.addAnnotationTooltip.hide();
      this.subviews.editAnnotationTooltip.hide();
      return this.stopListening(this.subviews.addAnnotationTooltip);
    }
  };

  EntryPreview.prototype.onMouseup = function(ev) {
    var checkMouseup, upOnAdd, upOnEdit;
    if (!this.interactive) {
      return;
    }
    upOnAdd = ev.target === this.subviews.addAnnotationTooltip.el || dom(this.subviews.addAnnotationTooltip.el).hasDescendant(ev.target);
    upOnEdit = ev.target === this.subviews.editAnnotationTooltip.el || dom(this.subviews.editAnnotationTooltip.el).hasDescendant(ev.target);
    checkMouseup = (function(_this) {
      return function() {
        var isInsideMarker, range, sel;
        sel = document.getSelection();
        if (sel.rangeCount === 0 || ev.target.tagName === 'SUP' || ev.target.tagName === 'BUTTON') {
          _this.subviews.addAnnotationTooltip.hide();
          return false;
        }
        range = sel.getRangeAt(0);
        isInsideMarker = range.startContainer.parentNode.hasAttribute('data-marker') || range.endContainer.parentNode.hasAttribute('data-marker');
        if (!(range.collapsed || isInsideMarker || _this.$('[data-id="newannotation"]').length > 0)) {
          if (_this.transcription.changedSinceLastSave != null) {
            return _this.publish('message', "Save the " + (_this.transcription.get('textLayer')) + " layer, before adding a new annotation!");
          } else {
            _this.listenToOnce(_this.subviews.addAnnotationTooltip, 'clicked', function(model) {
              return _this.addNewAnnotation(model, range);
            });
            return _this.subviews.addAnnotationTooltip.show({
              left: ev.pageX,
              top: ev.pageY
            });
          }
        }
      };
    })(this);
    if (!(upOnAdd || upOnEdit)) {
      return setTimeout(checkMouseup, 0);
    }
  };

  EntryPreview.prototype.toggleWrap = function(wrap) {
    return this.$el.toggleClass('wrap', wrap);
  };

  EntryPreview.prototype.setScroll = function(percentages) {
    this.autoscroll = true;
    return setTimeout((function(_this) {
      return function() {
        return Fn.setScrollPercentage(_this.el, percentages);
      };
    })(this));
  };

  EntryPreview.prototype.highlightAnnotation = function(annotationNo) {
    var el, range;
    range = document.createRange();
    range.setStartAfter(this.el.querySelector('span[data-id="' + annotationNo + '"]'));
    range.setEndBefore(this.el.querySelector('sup[data-id="' + annotationNo + '"]'));
    el = document.createElement('span');
    el.className = 'hilite';
    el.setAttribute('data-highlight', '');
    el.appendChild(range.extractContents());
    return range.insertNode(el);
  };

  EntryPreview.prototype.unhighlightAnnotation = function() {
    var docFrag, el;
    el = this.el.querySelector('span[data-highlight]');
    if (el != null) {
      docFrag = document.createDocumentFragment();
      while (el.childNodes.length) {
        docFrag.appendChild(el.firstChild);
      }
      return el.parentNode.replaceChild(docFrag, el);
    }
  };

  EntryPreview.prototype.unhighlightQuery = function() {
    var docFrag, el;
    el = this.el.querySelector('span.highlight');
    if (el != null) {
      docFrag = document.createDocumentFragment();
      while (el.childNodes.length) {
        docFrag.appendChild(el.firstChild);
      }
      return el.parentNode.replaceChild(docFrag, el);
    }
  };

  EntryPreview.prototype.setAnnotatedText = function(annotation) {
    var annotationNo, endNode, range, startNode, text, treewalker;
    annotationNo = annotation.get('annotationNo');
    startNode = this.el.querySelector('span[data-id="' + annotationNo + '"]');
    endNode = this.el.querySelector('sup[data-id="' + annotationNo + '"]');
    range = document.createRange();
    range.setStartAfter(startNode);
    range.setEndBefore(endNode);
    treewalker = document.createTreeWalker(range.cloneContents(), NodeFilter.SHOW_TEXT, {
      acceptNode: (function(_this) {
        return function(node) {
          if (node.parentNode.nodeType === 1 && node.parentNode.tagName === 'SUP' && node.parentNode.hasAttribute('data-id')) {
            return NodeFilter.FILTER_SKIP;
          } else {
            return NodeFilter.FILTER_ACCEPT;
          }
        };
      })(this)
    });
    text = '';
    while (treewalker.nextNode()) {
      text += treewalker.currentNode.textContent;
    }
    return annotation.set('annotatedText', text);
  };

  EntryPreview.prototype.addNewAnnotation = function(newAnnotation, range) {
    var annotations;
    this.unhighlightAnnotation();
    this.newAnnotation = newAnnotation;
    this.addNewAnnotationTags(range);
    annotations = this.transcription.get('annotations');
    newAnnotation.urlRoot = (function(_this) {
      return function() {
        return "" + (config.get('restUrl')) + "projects/" + annotations.projectId + "/entries/" + annotations.entryId + "/transcriptions/" + annotations.transcriptionId + "/annotations";
      };
    })(this);
    this.setAnnotatedText(newAnnotation);
    return this.trigger('editAnnotation', newAnnotation);
  };

  EntryPreview.prototype.addNewAnnotationTags = function(range) {
    var span, sup;
    span = document.createElement('span');
    span.setAttribute('data-marker', 'begin');
    span.setAttribute('data-id', 'newannotation');
    range.insertNode(span);
    sup = document.createElement('sup');
    sup.setAttribute('data-marker', 'end');
    sup.setAttribute('data-id', 'newannotation');
    sup.innerHTML = 'new';
    range.collapse(false);
    range.insertNode(sup);
    return this.setTranscriptionBody();
  };

  EntryPreview.prototype.removeNewAnnotation = function() {
    this.newAnnotation = null;
    return this.removeNewAnnotationTags();
  };

  EntryPreview.prototype.removeNewAnnotationTags = function() {
    this.$('[data-id="newannotation"]').remove();
    return this.setTranscriptionBody();
  };

  EntryPreview.prototype.setTranscriptionBody = function() {
    this.unhighlightQuery();
    this.unhighlightAnnotation();
    return this.transcription.set('body', this.$('.body-container .body').html(), {
      silent: true
    });
  };

  EntryPreview.prototype.onHover = function() {
    var markers, supEnter, supLeave;
    supEnter = (function(_this) {
      return function(ev) {
        var id, startNode;
        id = ev.currentTarget.getAttribute('data-id');
        if (!(startNode = _this.el.querySelector("span[data-id='" + id + "']"))) {
          console.error('No span found');
          return false;
        }
        return _this.highlighter.on({
          startNode: startNode,
          endNode: ev.currentTarget
        });
      };
    })(this);
    supLeave = (function(_this) {
      return function(ev) {
        return _this.highlighter.off();
      };
    })(this);
    markers = this.$('sup[data-marker]');
    markers.off('mouseenter mouseleave');
    return markers.hover(supEnter, supLeave);
  };

  EntryPreview.prototype.resize = function() {
    this.$el.height(document.documentElement.clientHeight - 89 - 78);
    if (Fn.hasYScrollBar(this.el)) {
      return this.el.style.marginRight = 0;
    }
  };

  EntryPreview.prototype.setModel = function(entry) {
    this.unhighlightAnnotation();
    this.model = entry;
    this.transcription = this.model.get('transcriptions').current;
    this.addListeners();
    return this.render();
  };

  EntryPreview.prototype.addListeners = function() {
    this.listenTo(this.transcription, 'current:change', this.render);
    return this.listenTo(this.transcription, 'change:body', this.render);
  };

  return EntryPreview;

})(Views.Base);

module.exports = EntryPreview;


},{"../../../../jade/entry/preview.jade":99,"../../../models/config":54,"../../../models/currentUser":55,"./annotation.add.tooltip":75,"./annotation.edit.tooltip":76,"hilib/src/utils/dom":16,"hilib/src/utils/general":17,"hilib/src/views/base":20}],78:[function(require,module,exports){
var $, EditFacsimiles, Fn, Views, ajax, token, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

$ = require('jquery');

Fn = require('hilib/src/utils/general');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Views = {
  Base: require('hilib/src/views/base')
};

tpl = require('../../../../jade/entry/subsubmenu/facsimiles.edit.jade');

EditFacsimiles = (function(_super) {
  __extends(EditFacsimiles, _super);

  function EditFacsimiles() {
    return EditFacsimiles.__super__.constructor.apply(this, arguments);
  }

  EditFacsimiles.prototype.className = 'editfacsimiles';

  EditFacsimiles.prototype.initialize = function(options) {
    this.options = options;
    EditFacsimiles.__super__.initialize.apply(this, arguments);
    this.listenTo(this.collection, 'add', this.render);
    this.listenTo(this.collection, 'remove', this.render);
    return this.render();
  };

  EditFacsimiles.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      facsimiles: this.collection
    });
    this.$el.html(rtpl);
    return this;
  };

  EditFacsimiles.prototype.events = function() {
    return {
      'click .close-button': function(ev) {
        return this.$el.slideUp();
      },
      'click ul.facsimiles li': (function(_this) {
        return function(ev) {
          return $(ev.currentTarget).addClass('destroy');
        };
      })(this),
      'click ul.facsimiles li.destroy .orcancel': 'cancelRemove',
      'click ul.facsimiles li.destroy .name': 'destroyfacsimile',
      'keyup input[name="name"]': 'keyupName',
      'change input[type="file"]': function() {
        return this.el.querySelector('button.addfacsimile').style.display = 'block';
      },
      'click button.addfacsimile': 'addfacsimile'
    };
  };

  EditFacsimiles.prototype.close = function(ev) {
    return this.trigger('close');
  };

  EditFacsimiles.prototype.keyupName = function(ev) {
    return this.el.querySelector('form.addfile').style.display = ev.currentTarget.value.length > 0 ? 'block' : 'none';
  };

  EditFacsimiles.prototype.addfacsimile = function(ev) {
    var form, formData, jqXHR;
    ev.stopPropagation();
    ev.preventDefault();
    $(ev.currentTarget).addClass('loader');
    form = this.el.querySelector('form.addfile');
    formData = new FormData(form);
    jqXHR = ajax.post({
      url: 'https://tomcat.tiler01.huygens.knaw.nl/facsimileservice/upload',
      data: formData,
      cache: false,
      contentType: false,
      processData: false
    }, {
      token: false
    });
    return jqXHR.done((function(_this) {
      return function(response) {
        var data;
        $(ev.currentTarget).removeClass('loader');
        data = {
          name: _this.el.querySelector('input[name="name"]').value,
          filename: response[1].originalName,
          zoomableUrl: response[1].jp2url
        };
        return _this.collection.create(data, {
          wait: true
        });
      };
    })(this));
  };

  EditFacsimiles.prototype.cancelRemove = function(ev) {
    var parentLi;
    ev.stopPropagation();
    parentLi = $(ev.currentTarget).parents('li');
    return parentLi.removeClass('destroy');
  };

  EditFacsimiles.prototype.destroyfacsimile = function(ev) {
    var transcriptionID;
    transcriptionID = $(ev.currentTarget).parents('li').attr('data-id');
    return this.collection.remove(this.collection.get(transcriptionID));
  };

  return EditFacsimiles;

})(Views.Base);

module.exports = EditFacsimiles;


},{"../../../../jade/entry/subsubmenu/facsimiles.edit.jade":100,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7,"hilib/src/utils/general":17,"hilib/src/views/base":20}],79:[function(require,module,exports){
var $, Backbone, BaseView, Form, Login, Modal, ResetPassword, ajax, currentUser, history, resetPasswordTpl, token, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

$ = require('jquery');

BaseView = require('hilib/src/views/base');

currentUser = require('../models/currentUser');

ResetPassword = require('../models/reset-password');

history = require('hilib/src/managers/history');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Modal = require('hilib/src/views/modal');

Form = require('hilib/src/views/form/main');

tpl = require('../../jade/login.jade');

resetPasswordTpl = require('../../jade/reset-password.jade');

Login = (function(_super) {
  __extends(Login, _super);

  function Login() {
    return Login.__super__.constructor.apply(this, arguments);
  }

  Login.prototype.className = 'login';

  Login.prototype.initialize = function() {
    var key, param, parameters, path, value, _i, _len, _ref;
    Login.__super__.initialize.apply(this, arguments);
    path = window.location.search.substr(1);
    parameters = path.split('&');
    for (_i = 0, _len = parameters.length; _i < _len; _i++) {
      param = parameters[_i];
      _ref = param.split('='), key = _ref[0], value = _ref[1];
      if (key === 'hsid') {
        this.hsid = value;
      }
    }
    if (this.hsid != null) {
      currentUser.hsidLogin(this.hsid);
    } else {
      this.render();
    }
    return this.subscribe('login:failed', this.loginFailed);
  };

  Login.prototype.render = function() {
    this.$el.html(tpl());
    return this;
  };

  Login.prototype.events = function() {
    return {
      'keyup input': (function(_this) {
        return function() {
          return _this.$('ul.message li').slideUp();
        };
      })(this),
      'click button[name="submit"]': 'submit',
      'click button.federated-login': 'federatedLogin',
      'click li.resetpassword': 'resetPassword'
    };
  };

  Login.prototype.resetPassword = function() {
    var modal, resetPasswordForm;
    resetPasswordForm = new Form({
      saveOnSubmit: false,
      tpl: resetPasswordTpl,
      Model: ResetPassword
    });
    this.listenTo(resetPasswordForm, 'cancel', (function(_this) {
      return function() {
        return modal.close();
      };
    })(this));
    this.listenTo(resetPasswordForm, 'submit', (function(_this) {
      return function(model) {
        var jqXHR, message;
        message = $('.modal .modalbody .body li.message');
        message.hide();
        jqXHR = model.resetPassword();
        jqXHR.done(function() {
          $('.modal .modalbody .body li.input').html("<p>An email has been send to your emailaddress. Please follow the link to reset your password.</p>");
          return $('.modal .modalbody .body li.submit').css('opacity', 0);
        });
        return jqXHR.fail(function(jqXHR) {
          resetPasswordForm.reset();
          message.html(jqXHR.responseText);
          return message.show();
        });
      };
    })(this));
    return modal = new Modal({
      customClassName: 'reset-password',
      title: "Forgot your password?",
      html: resetPasswordForm.el,
      cancelAndSubmit: false,
      width: '300px'
    });
  };

  Login.prototype.submit = function(ev) {
    ev.preventDefault();
    if (this.$('#username').val() === '' || this.$('#password').val() === '') {
      this.$('ul.message li').show().html('Please enter a username and password.');
      return;
    }
    this.$('li.login button').addClass('loading');
    return currentUser.login(this.$('#username').val(), this.$('#password').val());
  };

  Login.prototype.federatedLogin = function(ev) {
    var form, hsURL, hsUrlEl, loginURL, wl;
    wl = window.location;
    hsURL = wl.origin + wl.pathname;
    loginURL = 'https://secure.huygens.knaw.nl/saml2/login';
    form = $('<form>');
    form.attr({
      method: 'POST',
      action: loginURL
    });
    hsUrlEl = $('<input>').attr({
      name: 'hsurl',
      value: hsURL,
      type: 'hidden'
    });
    form.append(hsUrlEl);
    $('body').append(form);
    return form.submit();
  };

  Login.prototype.loginFailed = function() {
    this.render();
    return this.$('ul.message li').html('Username / password combination unknown!').show();
  };

  return Login;

})(BaseView);

module.exports = Login;


},{"../../jade/login.jade":102,"../../jade/reset-password.jade":117,"../models/currentUser":55,"../models/reset-password":63,"hilib/src/managers/ajax":3,"hilib/src/managers/history":5,"hilib/src/managers/token":7,"hilib/src/views/base":20,"hilib/src/views/form/main":25,"hilib/src/views/modal":30}],80:[function(require,module,exports){
var $, Backbone, BaseView, NoProject, Views,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

$ = require('jquery');

BaseView = require('hilib/src/views/base');

Views = {
  Modal: require('hilib/src/views/modal')
};

NoProject = (function(_super) {
  __extends(NoProject, _super);

  function NoProject() {
    return NoProject.__super__.constructor.apply(this, arguments);
  }

  NoProject.prototype.className = 'no-project';

  NoProject.prototype.initialize = function() {
    return this.render();
  };

  NoProject.prototype.render = function() {
    var modal;
    return modal = new Views.Modal({
      title: 'You are not assigned to a project',
      clickOverlay: false,
      html: "Please contact an administrator.",
      cancelAndSubmit: false
    });
  };

  return NoProject;

})(Backbone.View);

module.exports = NoProject;


},{"hilib/src/views/base":20,"hilib/src/views/modal":30}],81:[function(require,module,exports){
var BaseView, Collections, ProjectHistory, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

BaseView = require('hilib/src/views/base');

Collections = {
  History: require('../../collections/project/history'),
  projects: require('../../collections/projects')
};

tpl = require('../../../jade/project/history.jade');

ProjectHistory = (function(_super) {
  __extends(ProjectHistory, _super);

  function ProjectHistory() {
    return ProjectHistory.__super__.constructor.apply(this, arguments);
  }

  ProjectHistory.prototype.className = 'projecthistory';

  ProjectHistory.prototype.initialize = function(options) {
    this.options = options;
    ProjectHistory.__super__.initialize.apply(this, arguments);
    this.index = 0;
    return Collections.projects.getCurrent((function(_this) {
      return function(project) {
        _this.project = project;
        _this.all = new Collections.History(_this.project.id);
        return _this.all.fetch(function(response) {
          _this.historyChunks = [];
          while (response.length > 0) {
            _this.historyChunks.push(response.splice(0, 500));
          }
          return _this.render();
        });
      };
    })(this));
  };

  ProjectHistory.prototype.render = function() {
    var chunk, chunks, rtpl;
    chunk = this.historyChunks[this.index];
    _.each(chunk, function(entry) {
      return entry.dateString = new Date(entry.createdOn).toDateString();
    });
    chunks = _.groupBy(chunk, 'dateString');
    rtpl = tpl({
      logEntries: chunks
    });
    this.el.innerHTML = rtpl;
    if (this.index + 1 === this.historyChunks.length) {
      this.el.querySelector('button.more').style.display = 'none';
    }
    return this;
  };

  ProjectHistory.prototype.events = function() {
    return {
      'click button.more': 'more'
    };
  };

  ProjectHistory.prototype.more = function(ev) {
    this.index++;
    return this.renderEntries();
  };

  return ProjectHistory;

})(BaseView);

module.exports = ProjectHistory;


},{"../../../jade/project/history.jade":103,"../../collections/project/history":45,"../../collections/projects":46,"hilib/src/views/base":20}],82:[function(require,module,exports){
var $, Backbone, BaseView, EditMetadata, ajax, config, projects, token, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

$ = require('jquery');

BaseView = require('hilib/src/views/base');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

config = require('../../../../models/config');

projects = require('../../../../collections/projects');

tpl = require('./index.jade');

EditMetadata = (function(_super) {
  __extends(EditMetadata, _super);

  function EditMetadata() {
    return EditMetadata.__super__.constructor.apply(this, arguments);
  }

  EditMetadata.prototype.className = 'edit-metadata';

  EditMetadata.prototype.initialize = function(options) {
    this.options = options;
    EditMetadata.__super__.initialize.apply(this, arguments);
    return projects.getCurrent((function(_this) {
      return function(project) {
        _this.project = project;
        return _this.render();
      };
    })(this));
  };

  EditMetadata.prototype.render = function() {
    this.el.innerHTML = tpl({
      entrymetadatafields: this.options.entryMetadataFields,
      resultModel: this.options.resultModel
    });
    if (this.options.isMetadataVisible) {
      this.$('input#edit-results-metadata-show-metadata').attr('checked', true);
      this.$('.results').addClass('show-metadata');
    }
    return this;
  };

  EditMetadata.prototype.events = {
    "change .results input[type=\"checkbox\"]": "updateData",
    "change .form li .publishable-checkbox-container input[type=\"checkbox\"]": "updateData",
    "change .form li input.empty[type=\"checkbox\"]": "updateData",
    "keyup .form li > label + input[type=\"text\"]": "updateData",
    "change .results .head input#edit-results-metadata-select-all": "onSelectAll",
    "change .results .head input#edit-results-metadata-show-metadata": "onShowMetadata"
  };

  EditMetadata.prototype.onSelectAll = function(ev) {
    var cb, checkboxes, _i, _len;
    checkboxes = this.$('.results li.result > input[type="checkbox"]');
    for (_i = 0, _len = checkboxes.length; _i < _len; _i++) {
      cb = checkboxes[_i];
      cb.checked = ev.currentTarget.checked;
    }
    return this.updateData();
  };

  EditMetadata.prototype.onShowMetadata = function(ev) {
    return this.$('.results').toggleClass('show-metadata');
  };

  EditMetadata.prototype.updateData = function() {
    var checkbox, input, name, _i, _j, _len, _len1, _ref, _ref1;
    this.data = {
      projectEntryIds: (function() {
        var _i, _len, _ref, _results;
        _ref = this.el.querySelectorAll('.results li input[type="checkbox"]:checked');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          checkbox = _ref[_i];
          _results.push(checkbox.id.substr("entry-".length));
        }
        return _results;
      }).call(this),
      settings: {}
    };
    _ref = this.el.querySelectorAll('input.value');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      input = _ref[_i];
      if (input.type === 'checkbox') {
        if (input.checked) {
          this.data.settings[input.name] = true;
        }
      } else {
        if (input.value.length > 0) {
          this.data.settings[input.name] = input.value;
        }
      }
    }
    _ref1 = this.el.querySelectorAll('input.empty');
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      checkbox = _ref1[_j];
      name = checkbox.getAttribute('data-name');
      input = this.el.querySelector("input[name=\"" + name + "\"]");
      if (checkbox.checked) {
        if (input.type === 'checkbox') {
          input.checked = false;
          input.setAttribute('disabled', "disabled");
          this.data.settings[name] = false;
        } else {
          input.value = "";
          input.setAttribute('placeholder', "To be emptied.");
          input.setAttribute('disabled', "disabled");
          this.data.settings[name] = "";
        }
      } else {
        if (input.value === "") {
          input.removeAttribute('placeholder');
        }
        input.removeAttribute('disabled');
      }
    }
    return this.saveButtonIsActive();
  };

  EditMetadata.prototype.saveButtonIsActive = function() {
    var eventStr, isActive;
    isActive = this.data.projectEntryIds.length > 0 && !_.isEmpty(this.data.settings);
    eventStr = isActive ? 'activate-save-button' : 'deactivate-save-button';
    return this.trigger(eventStr);
  };

  EditMetadata.prototype.save = function() {
    var jqXHR, saveButton;
    if (this.saveButtonIsActive()) {
      saveButton = $('li[data-key="save-edit-metadata"]');
      saveButton.addClass('loader');
      ajax.token = token.get();
      jqXHR = ajax.put({
        url: "" + (config.get('restUrl')) + "projects/" + this.project.id + "/multipleentrysettings",
        data: JSON.stringify(this.data),
        dataType: 'text'
      });
      jqXHR.done((function(_this) {
        return function() {
          _this.publish('message', 'Metadata of multiple entries saved.');
          saveButton.removeClass('loader');
          return _this.trigger('saved');
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    }
  };

  return EditMetadata;

})(BaseView);

module.exports = EditMetadata;


},{"../../../../collections/projects":46,"../../../../models/config":54,"./index.jade":83,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7,"hilib/src/views/base":20}],83:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (entrymetadatafields, id, resultModel, undefined) {
buf.push("<h2>Edit results metadata</h2><div class=\"form\"><h3>" + (jade.escape(null == (jade_interp = "Metadata fields") ? "" : jade_interp)) + "</h3><form><ul><li class=\"empty\">empty?</li><li class=\"publishable\"><label>Publishable</label><div class=\"publishable-checkbox-container\"><input type=\"checkbox\" name=\"Publishable\" class=\"value\"/></div><input type=\"checkbox\" data-name=\"Publishable\" class=\"empty\"/></li>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var key = 0, $$l = $$obj.length; key < $$l; key++) {
      var field = $$obj[key];

buf.push("<li> <label>" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</label><input type=\"text\"" + (jade.attr("name", field, true, false)) + " class=\"value\"/><input type=\"checkbox\"" + (jade.attr("data-name", field, true, false)) + " class=\"empty\"/></li>");
    }

  } else {
    var $$l = 0;
    for (var key in $$obj) {
      $$l++;      var field = $$obj[key];

buf.push("<li> <label>" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</label><input type=\"text\"" + (jade.attr("name", field, true, false)) + " class=\"value\"/><input type=\"checkbox\"" + (jade.attr("data-name", field, true, false)) + " class=\"empty\"/></li>");
    }

  }
}).call(this);

buf.push("</ul></form></div><div class=\"results\"><div class=\"head\"><h3><span>Entries</span><small>" + (jade.escape(null == (jade_interp = "("+resultModel.get('rows') + " of " + resultModel.get('numFound') + ")") ? "" : jade_interp)) + "</small></h3><div class=\"menu\"><div class=\"select-all\"><input id=\"edit-results-metadata-select-all\" type=\"checkbox\"/><label for=\"edit-results-metadata-select-all\">Select all</label></div><div class=\"show-metadata\"><input id=\"edit-results-metadata-show-metadata\" type=\"checkbox\"/><label for=\"edit-results-metadata-show-metadata\">Show metadata</label></div></div></div><ul>");
// iterate resultModel.get('results')
;(function(){
  var $$obj = resultModel.get('results');
  if ('number' == typeof $$obj.length) {

    for (var index = 0, $$l = $$obj.length; index < $$l; index++) {
      var result = $$obj[index];

id = "entry-" + result.id
buf.push("<li class=\"result\"><input type=\"checkbox\"" + (jade.attr("id", id, true, false)) + "/><label" + (jade.attr("for", id, true, false)) + "><span>" + (jade.escape(null == (jade_interp = result.name) ? "" : jade_interp)) + "</span><ul class=\"metadata\">");
// iterate result.metadata
;(function(){
  var $$obj = result.metadata;
  if ('number' == typeof $$obj.length) {

    for (var key = 0, $$l = $$obj.length; key < $$l; key++) {
      var value = $$obj[key];

buf.push("<li><span class=\"key\">" + (jade.escape(null == (jade_interp = key+': ') ? "" : jade_interp)) + "</span><span class=\"value\">" + (jade.escape(null == (jade_interp = value) ? "" : jade_interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var key in $$obj) {
      $$l++;      var value = $$obj[key];

buf.push("<li><span class=\"key\">" + (jade.escape(null == (jade_interp = key+': ') ? "" : jade_interp)) + "</span><span class=\"value\">" + (jade.escape(null == (jade_interp = value) ? "" : jade_interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul></label></li>");
    }

  } else {
    var $$l = 0;
    for (var index in $$obj) {
      $$l++;      var result = $$obj[index];

id = "entry-" + result.id
buf.push("<li class=\"result\"><input type=\"checkbox\"" + (jade.attr("id", id, true, false)) + "/><label" + (jade.attr("for", id, true, false)) + "><span>" + (jade.escape(null == (jade_interp = result.name) ? "" : jade_interp)) + "</span><ul class=\"metadata\">");
// iterate result.metadata
;(function(){
  var $$obj = result.metadata;
  if ('number' == typeof $$obj.length) {

    for (var key = 0, $$l = $$obj.length; key < $$l; key++) {
      var value = $$obj[key];

buf.push("<li><span class=\"key\">" + (jade.escape(null == (jade_interp = key+': ') ? "" : jade_interp)) + "</span><span class=\"value\">" + (jade.escape(null == (jade_interp = value) ? "" : jade_interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var key in $$obj) {
      $$l++;      var value = $$obj[key];

buf.push("<li><span class=\"key\">" + (jade.escape(null == (jade_interp = key+': ') ? "" : jade_interp)) + "</span><span class=\"value\">" + (jade.escape(null == (jade_interp = value) ? "" : jade_interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul></label></li>");
    }

  }
}).call(this);

buf.push("</ul></div>");}.call(this,"entrymetadatafields" in locals_for_with?locals_for_with.entrymetadatafields:typeof entrymetadatafields!=="undefined"?entrymetadatafields:undefined,"id" in locals_for_with?locals_for_with.id:typeof id!=="undefined"?id:undefined,"resultModel" in locals_for_with?locals_for_with.resultModel:typeof resultModel!=="undefined"?resultModel:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":36}],84:[function(require,module,exports){
var $, Backbone, FacetedSearch, Search, StrFn, Views, config, entryMetadataChanged, projects, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

$ = require('jquery');

StrFn = require('hilib/src/utils/string');

FacetedSearch = require('huygens-faceted-search');

config = require('../../../models/config');

projects = require('../../../collections/projects');

token = require('hilib/src/managers/token');

Views = {
  Base: require('hilib/src/views/base'),
  Submenu: require('./submenu'),
  EditMetadata: require('./edit-metadata')
};

entryMetadataChanged = false;

Search = (function(_super) {
  __extends(Search, _super);

  function Search() {
    return Search.__super__.constructor.apply(this, arguments);
  }

  Search.prototype.className = 'search';

  Search.prototype.initialize = function(options) {
    this.options = options;
    Search.__super__.initialize.apply(this, arguments);
    this.subviews = {};
    return projects.getCurrent((function(_this) {
      return function(project) {
        _this.project = project;
        _this.render();
        _this.listenTo(_this.project, 'change:entrymetadatafields', function(values) {
          return _this.subviews.fs.config.set({
            entryMetadataFields: values
          });
        });
        return _this.listenTo(_this.project, 'change:level1 change:level2 change:level3', function() {
          return _this.subviews.fs.config.set({
            levels: [_this.project.get('level1'), _this.project.get('level2'), _this.project.get('level3')]
          });
        });
      };
    })(this));
  };

  Search.prototype.render = function() {
    this.renderSubmenu();
    this.renderFacetedSearch();
    this._addListeners();
    return this;
  };

  Search.prototype.renderSubmenu = function() {
    this.subviews.submenu = new Views.Submenu();
    return this.$el.html(this.subviews.submenu.$el);
  };

  Search.prototype.renderFacetedSearch = function() {
    var div, level, levels, sortParameters;
    div = document.createElement('div');
    div.className = 'faceted-search-placeholder';
    this.$el.append(div);
    levels = [this.project.get('level1'), this.project.get('level2'), this.project.get('level3')];
    sortParameters = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = levels.length; _i < _len; _i++) {
        level = levels[_i];
        _results.push({
          fieldname: level,
          direction: 'asc'
        });
      }
      return _results;
    })();
    this.subviews.fs = new FacetedSearch({
      el: this.$('div.faceted-search-placeholder'),
      levels: levels,
      entryMetadataFields: this.project.get('entrymetadatafields'),
      textLayers: this.project.get('textLayers'),
      baseUrl: "" + (config.get('restUrl')),
      searchPath: "projects/" + this.project.id + "/search",
      results: true,
      authorizationHeaderToken: "" + (token.getType()) + " " + (token.get()),
      textSearchOptions: {
        textLayers: this.project.get('textLayers'),
        searchInAnnotations: true,
        searchInTranscriptions: true,
        term: '*:*',
        caseSensitive: true,
        fuzzy: true
      },
      queryOptions: {
        sortParameters: sortParameters,
        resultFields: levels
      },
      resultRows: this.project.get('settings').get('results-per-page')
    });
    return this.subviews.fs.search();
  };

  Search.prototype._addListeners = function() {
    this.listenTo(this.subviews.submenu, 'newsearch', (function(_this) {
      return function() {
        return _this.subviews.fs.reset();
      };
    })(this));
    this.listenTo(this.subviews.submenu, 'edit-metadata', (function(_this) {
      return function() {
        return _this._showEditMetadata();
      };
    })(this));
    this.listenTo(this.subviews.submenu, 'save-edit-metadata', (function(_this) {
      return function() {
        return _this.subviews.editMetadata.save();
      };
    })(this));
    this.listenTo(this.subviews.submenu, 'cancel-edit-metadata', (function(_this) {
      return function() {
        return _this._hideEditMetadata();
      };
    })(this));
    this.listenToOnce(this.subviews.fs, 'change:results', (function(_this) {
      return function() {
        return _this.subviews.submenu.enableEditMetadataButton();
      };
    })(this));
    this.listenTo(this.subviews.fs, 'change:results', (function(_this) {
      return function(responseModel) {
        var project;
        project = projects.current;
        project.resultSet = responseModel;
        return project.get('entries').add(responseModel.get('results'), {
          merge: true
        });
      };
    })(this));
    this.listenTo(this.subviews.fs, 'result:click', (function(_this) {
      return function(data) {
        var url;
        url = "projects/" + (_this.project.get('name')) + "/entries/" + data.id;
        return Backbone.history.navigate(url, {
          trigger: true
        });
      };
    })(this));
    return this.listenTo(this.subviews.fs, 'result:layer-click', (function(_this) {
      return function(textLayer, data) {
        var splitLayer, textLayerSlug, url;
        if (textLayer != null) {
          splitLayer = textLayer.split(' ');
          if (splitLayer[splitLayer.length - 1] === 'annotations') {
            splitLayer.pop();
            textLayer = splitLayer.join(' ');
          }
          textLayerSlug = StrFn.slugify(textLayer);
          url = "projects/" + (_this.project.get('name')) + "/entries/" + data.id;
          url += "/transcriptions/" + textLayerSlug;
          return Backbone.history.navigate(url, {
            trigger: true
          });
        }
      };
    })(this));
  };

  Search.prototype._showEditMetadata = function() {
    this.subviews.submenu.$el.addClass('submenu-edit-metadata');
    this.$('.faceted-search-placeholder').hide();
    this.subviews.editMetadata = new Views.EditMetadata({
      entryMetadataFields: this.project.get('entrymetadatafields'),
      resultModel: this.subviews.fs.searchResults.getCurrent(),
      isMetadataVisible: this.subviews.fs.results.isMetadataVisible
    });
    this.$el.append(this.subviews.editMetadata.el);
    this.listenTo(this.subviews.editMetadata, 'activate-save-button', (function(_this) {
      return function() {
        return _this.subviews.submenu.activateEditMetadataSaveButton();
      };
    })(this));
    this.listenTo(this.subviews.editMetadata, 'deactivate-save-button', (function(_this) {
      return function() {
        return _this.subviews.submenu.deactivateEditMetadataSaveButton();
      };
    })(this));
    return this.listenTo(this.subviews.editMetadata, 'saved', (function(_this) {
      return function() {
        _this._hideEditMetadata();
        return _this.subviews.fs.reset();
      };
    })(this));
  };

  Search.prototype._hideEditMetadata = function() {
    this.subviews.submenu.$el.removeClass('submenu-edit-metadata');
    this.$('.faceted-search-placeholder').show();
    this.subviews.editMetadata.destroy();
    return delete this.subviews.editMetadata;
  };

  return Search;

})(Views.Base);

module.exports = Search;


},{"../../../collections/projects":46,"../../../models/config":54,"./edit-metadata":82,"./submenu":85,"hilib/src/managers/token":7,"hilib/src/utils/string":19,"hilib/src/views/base":20,"huygens-faceted-search":35}],85:[function(require,module,exports){
var Backbone, Entry, SearchSubmenu, Views, config, currentUser, projects, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

config = require('../../../models/config');

currentUser = require('../../../models/currentUser');

projects = require('../../../collections/projects');

Entry = require('../../../models/entry');

Views = {
  Base: require('hilib/src/views/base'),
  Modal: require('hilib/src/views/modal')
};

tpl = require('./submenu.jade');

SearchSubmenu = (function(_super) {
  __extends(SearchSubmenu, _super);

  function SearchSubmenu() {
    return SearchSubmenu.__super__.constructor.apply(this, arguments);
  }

  SearchSubmenu.prototype.className = 'submenu';

  SearchSubmenu.prototype.initialize = function(options) {
    this.options = options;
    SearchSubmenu.__super__.initialize.apply(this, arguments);
    this.listenTo(config, 'change:entryTermSingular', this.render);
    return projects.getCurrent((function(_this) {
      return function(project) {
        _this.project = project;
        return _this.render();
      };
    })(this));
  };

  SearchSubmenu.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      user: currentUser,
      config: config,
      projects: projects
    });
    this.$el.html(rtpl);
    this.pollDraft();
    return this;
  };

  SearchSubmenu.prototype.enableEditMetadataButton = function() {
    return this.$('li[data-key="editmetadata"]').addClass('enabled');
  };

  SearchSubmenu.prototype.events = function() {
    return {
      'click li[data-key="newsearch"]': function() {
        return this.trigger('newsearch');
      },
      'click li[data-key="newentry"]': 'newEntry',
      'click li[data-key="save-edit-metadata"]:not(.inactive)': function(ev) {
        return this.trigger('save-edit-metadata');
      },
      'click li[data-key="cancel-edit-metadata"]': function() {
        return this.trigger('cancel-edit-metadata');
      },
      'click li[data-key="editmetadata"].enabled': function() {
        return this.trigger('edit-metadata');
      },
      'click li[data-key="delete"]': 'deleteProject',
      'click li[data-key="publish"]': 'publishDraft'
    };
  };

  SearchSubmenu.prototype.deleteProject = (function() {
    var modal;
    modal = null;
    return function(ev) {
      if (modal != null) {
        return;
      }
      modal = new Views.Modal({
        title: 'Caution!',
        html: "You are about to <b>REMOVE</b> project: \"" + (this.project.get('title')) + "\" <small>(id: " + this.project.id + ")</small>.<br><br>All " + (config.get('entryTermPlural')) + " will be <b>PERMANENTLY</b> removed!",
        submitValue: 'Remove project',
        width: 'auto'
      });
      modal.on('submit', (function(_this) {
        return function() {
          return _this.project.destroy({
            wait: true,
            success: function() {
              modal.close();
              projects.setCurrent(projects.first().id);
              return _this.publish('message', "Removed " + (_this.project.get('title')) + ".");
            }
          });
        };
      })(this));
      return modal.on('close', function() {
        return modal = null;
      });
    };
  })();

  SearchSubmenu.prototype.publishDraft = function(ev) {
    this.activatePublishDraftButton();
    return this.project.publishDraft((function(_this) {
      return function() {
        return _this.deactivatePublishDraftButton();
      };
    })(this));
  };

  SearchSubmenu.prototype.newEntry = function(ev) {
    var modal;
    modal = new Views.Modal({
      title: "Create a new " + (config.get('entryTermSingular')),
      html: '<form><ul><li><label>Name</label><input type="text" name="name" /></li></ul></form>',
      submitValue: "Create " + (config.get('entryTermSingular')),
      width: '300px'
    });
    return modal.on('submit', (function(_this) {
      return function() {
        var entry;
        modal.message('success', "Creating a new " + (config.get('entryTermSingular')) + "...");
        entry = new Entry({
          name: modal.$('input[name="name"]').val()
        });
        entry.project = _this.project;
        return entry.save([], {
          success: function(model) {
            _this.stopListening();
            _this.project.get('entries').add(model);
            modal.close();
            _this.publish('faceted-search:refresh');
            _this.publish('message', "New " + (config.get('entryTermSingular')) + " added to project.");
            return Backbone.history.navigate("projects/" + (_this.project.get('name')) + "/entries/" + entry.id, {
              trigger: true
            });
          }
        });
      };
    })(this));
  };

  SearchSubmenu.prototype.activatePublishDraftButton = function() {
    var busyText, button, span;
    busyText = 'Publishing draft';
    button = this.$('li[data-key="publish"]');
    span = button.find('span');
    if (span.html() === busyText) {
      return false;
    }
    span.html(busyText);
    return button.addClass('active');
  };

  SearchSubmenu.prototype.deactivatePublishDraftButton = function() {
    var button;
    button = this.el.querySelector('li[data-key="publish"]');
    button.innerHTML = 'Publish draft';
    return button.classList.remove('active');
  };

  SearchSubmenu.prototype.activateEditMetadataSaveButton = function() {
    return this.$('li[data-key="save-edit-metadata"]').removeClass('inactive');
  };

  SearchSubmenu.prototype.deactivateEditMetadataSaveButton = function() {
    return this.$('li[data-key="save-edit-metadata"]').addClass('inactive');
  };

  SearchSubmenu.prototype.pollDraft = function() {
    var locationUrl;
    locationUrl = localStorage.getItem('publishDraftLocation');
    if (locationUrl != null) {
      this.activatePublishDraftButton();
      return this.project.pollDraft(locationUrl, (function(_this) {
        return function() {
          return _this.deactivatePublishDraftButton();
        };
      })(this));
    }
  };

  return SearchSubmenu;

})(Views.Base);

module.exports = SearchSubmenu;


},{"../../../collections/projects":46,"../../../models/config":54,"../../../models/currentUser":55,"../../../models/entry":56,"./submenu.jade":86,"hilib/src/views/base":20,"hilib/src/views/modal":30}],86:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (config, projects, user) {
buf.push("<div class=\"left-menu\"><ul class=\"horizontal menu\"><li data-key=\"newsearch\">New search</li><li data-key=\"save-edit-metadata\" class=\"inactive\"><span>Save</span><i class=\"fa fa-spinner fa-spin\"></i></li><li data-key=\"cancel-edit-metadata\">Cancel</li></ul></div>");
if ( user.get('roleNo') >= 20)
{
buf.push("<div class=\"middle-menu\"><ul class=\"horizontal menu\"><li data-key=\"newentry\">" + (jade.escape(null == (jade_interp = 'Add '+config.get('entryTermSingular')) ? "" : jade_interp)) + "</li><li data-key=\"editmetadata\">Edit results metadata</li></ul></div><div class=\"right-menu\"><ul class=\"horizontal menu\">");
if ( user.get('roleNo') >= 30)
{
buf.push("<li data-key=\"publish\"> <span>Publish draft</span><i class=\"fa fa-spinner fa-spin\"></i></li>");
}
if ( user.get('roleNo') >= 40 && projects.length > 1)
{
buf.push("<li data-key=\"delete\">Remove project</li>");
}
buf.push("</ul></div>");
}}.call(this,"config" in locals_for_with?locals_for_with.config:typeof config!=="undefined"?config:undefined,"projects" in locals_for_with?locals_for_with.projects:typeof projects!=="undefined"?projects:undefined,"user" in locals_for_with?locals_for_with.user:typeof user!=="undefined"?user:undefined));;return buf.join("");
};
},{"jade/runtime":36}],87:[function(require,module,exports){
var Backbone, EntryMetadata, ProjectSettingsEntries, Views, ajax, config, setNamesTpl, sortLevelsTpl, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

config = require('../../../models/config');

ajax = require('hilib/src/managers/ajax');

EntryMetadata = require('../../../entry.metadata');

Views = {
  Base: require('hilib/src/views/base'),
  EditableList: require('hilib/src/views/form/editablelist/main'),
  Form: require('hilib/src/views/form/main')
};

tpl = require('../../../../jade/project/settings/entries.jade');

sortLevelsTpl = require('../../../../jade/project/settings/entries.sort-levels.jade');

setNamesTpl = require('../../../../jade/project/settings/entries.set-names.jade');

ProjectSettingsEntries = (function(_super) {
  __extends(ProjectSettingsEntries, _super);

  function ProjectSettingsEntries() {
    return ProjectSettingsEntries.__super__.constructor.apply(this, arguments);
  }

  ProjectSettingsEntries.prototype.className = 'entries';

  ProjectSettingsEntries.prototype.initialize = function(options) {
    this.options = options;
    ProjectSettingsEntries.__super__.initialize.apply(this, arguments);
    this.project = this.options.project;
    return this.render();
  };

  ProjectSettingsEntries.prototype.render = function() {
    var EntryMetadataList;
    this.el.innerHTML = tpl({
      settings: this.project.get('settings').attributes
    });
    this.renderSetNames();
    this.renderSortLevels();
    EntryMetadataList = new Views.EditableList({
      value: this.project.get('entrymetadatafields'),
      config: {
        settings: {
          placeholder: 'Add field',
          confirmRemove: true
        }
      }
    });
    this.listenTo(EntryMetadataList, 'confirmRemove', (function(_this) {
      return function(id, confirm) {
        return _this.trigger('confirm', confirm, {
          html: 'You are about to delete entry metadata field: ' + id,
          submitValue: 'Remove field ' + id
        });
      };
    })(this));
    this.listenTo(EntryMetadataList, 'change', (function(_this) {
      return function(values) {
        return new EntryMetadata(_this.project.id).save(values, {
          success: function() {
            _this.project.set('entrymetadatafields', values);
            Backbone.trigger('entrymetadatafields:update', values);
            _this.publish('message', 'Entry metadata fields updated.');
            return _this.renderSortLevels();
          }
        });
      };
    })(this));
    this.$('.entry-list').append(EntryMetadataList.el);
    return this;
  };

  ProjectSettingsEntries.prototype.renderSetNames = function() {
    var setNamesForm;
    setNamesForm = new Views.Form({
      tpl: setNamesTpl,
      model: this.project.get('settings'),
      validationAttributes: ['entry.term_singular', 'entry.term_plural']
    });
    this.listenTo(setNamesForm, 'save:success', (function(_this) {
      return function(model) {
        config.set('entryTermSingular', model.get('entry.term_singular'));
        config.set('entryTermPlural', model.get('entry.term_plural'));
        return Backbone.trigger('message', 'Entries names saved.');
      };
    })(this));
    return this.$('.set-names').html(setNamesForm.el);
  };

  ProjectSettingsEntries.prototype.renderSortLevels = function() {
    return this.$('.sort-levels').html(sortLevelsTpl({
      level1: this.project.get('level1'),
      level2: this.project.get('level2'),
      level3: this.project.get('level3'),
      entrymetadatafields: this.project.get('entrymetadatafields')
    }));
  };

  ProjectSettingsEntries.prototype.events = function() {
    return {
      'click button.savesortlevels': 'saveSortLevels',
      'click .set-names form input[type="submit"]': 'submitSetCustomNames',
      'keyup .set-names form input[type="text"]': function(ev) {
        return this.$('.set-names form input[type="submit"]').removeClass('inactive');
      },
      'change .sort-levels select': function(ev) {
        return this.$('.sort-levels form button').removeClass('inactive');
      }
    };
  };

  ProjectSettingsEntries.prototype.submitSetCustomNames = function(ev) {
    var input, _i, _len, _ref;
    ev.preventDefault();
    _ref = this.el.querySelectorAll('.set-names form input[type="text"]');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      input = _ref[_i];
      this.project.get('settings').set(input.name, input.value);
    }
    return this.trigger('savesettings', ev);
  };

  ProjectSettingsEntries.prototype.saveSortLevels = function(ev) {
    var jqXHR, select, sortlevels, _i, _len, _ref;
    ev.preventDefault();
    if (this.$('.sort-levels form button').hasClass('inactive')) {
      return;
    }
    sortlevels = [];
    _ref = this.$('.sort-levels select');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      select = _ref[_i];
      sortlevels.push(select.value);
    }
    this.$('button.savesortlevels').addClass('loading');
    jqXHR = ajax.put({
      url: "" + (config.get('restUrl')) + "projects/" + this.project.id + "/sortlevels",
      data: JSON.stringify(sortlevels)
    });
    jqXHR.done((function(_this) {
      return function() {
        _this.$('button.savesortlevels').removeClass('loading');
        _this.project.set({
          level1: sortlevels[0],
          level2: sortlevels[1],
          level3: sortlevels[2]
        });
        _this.$('.sort-levels form button').addClass('inactive');
        return _this.publish('message', 'Entry sort levels saved.');
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function() {
        return _this.$('button.savesortlevels').removeClass('loading');
      };
    })(this));
  };

  return ProjectSettingsEntries;

})(Views.Base);

module.exports = ProjectSettingsEntries;


},{"../../../../jade/project/settings/entries.jade":106,"../../../../jade/project/settings/entries.set-names.jade":107,"../../../../jade/project/settings/entries.sort-levels.jade":108,"../../../entry.metadata":50,"../../../models/config":54,"hilib/src/managers/ajax":3,"hilib/src/views/base":20,"hilib/src/views/form/editablelist/main":23,"hilib/src/views/form/main":25}],88:[function(require,module,exports){
var $, Backbone, Form, ProjectSettingsGeneral, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

$ = require('jquery');

Form = require('hilib/src/views/form/main');

tpl = require('../../../../jade/project/settings/general2.jade');

ProjectSettingsGeneral = (function(_super) {
  __extends(ProjectSettingsGeneral, _super);

  function ProjectSettingsGeneral() {
    return ProjectSettingsGeneral.__super__.constructor.apply(this, arguments);
  }

  ProjectSettingsGeneral.prototype.className = 'generalprojectsettings';

  ProjectSettingsGeneral.prototype.initialize = function(options) {
    this.options = options;
    return this.render();
  };

  ProjectSettingsGeneral.prototype.render = function() {
    var form;
    form = new Form({
      model: this.options.project.get('settings'),
      tpl: tpl,
      tplData: {
        projectMembers: this.options.project.get('members')
      }
    });
    this.listenTo(form, 'save:success', (function(_this) {
      return function(model, response, options, changedAttributes) {
        _this.options.project.get('settings').trigger('settings:saved', model, changedAttributes);
        return Backbone.trigger('message', 'Settings saved.');
      };
    })(this));
    this.$el.html(form.el);
    return this;
  };

  ProjectSettingsGeneral.prototype.events = function() {
    return {
      "change select": (function(_this) {
        return function(ev) {
          return _this.$('img[name="text.font"]').attr('src', "/images/fonts/" + ev.currentTarget.value + ".png");
        };
      })(this)
    };
  };

  return ProjectSettingsGeneral;

})(Backbone.View);

module.exports = ProjectSettingsGeneral;


},{"../../../../jade/project/settings/general2.jade":110,"hilib/src/views/form/main":25}],89:[function(require,module,exports){
var $, Async, Backbone, Collections, EntryMetadata, Models, ProjectSettings, ProjectUserIDs, Views, addAnnotationTypeTpl, ajax, config, customTagNamesTpl, generalTpl, token, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

$ = require('jquery');

config = require('../../../models/config');

Async = require('hilib/src/managers/async');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

EntryMetadata = require('../../../entry.metadata');

Views = {
  Base: require('hilib/src/views/base'),
  EditableList: require('hilib/src/views/form/editablelist/main'),
  ComboList: require('hilib/src/views/form/combolist/main'),
  Form: require('hilib/src/views/form/main'),
  Modal: require('hilib/src/views/modal'),
  TextlayersTab: require('./textlayers'),
  EntriesTab: require('./entries'),
  UsersTab: require('./users'),
  GeneralTab: require('./general')
};

Models = {
  Statistics: require('../../../models/project/statistics'),
  Settings: require('../../../models/project/settings'),
  User: require('../../../models/user'),
  Annotationtype: require('../../../models/project/annotationtype'),
  currentUser: require('../../../models/currentUser')
};

Collections = {
  projects: require('../../../collections/projects')
};

ProjectUserIDs = require('../../../project.user.ids');

tpl = require('../../../../jade/project/settings/main.jade');

generalTpl = require('../../../../jade/project/settings/general.jade');

addAnnotationTypeTpl = require('../../../../jade/project/settings/annotations.add.jade');

customTagNamesTpl = require('../../../../jade/project/settings/annotations.set-custom-tag-names.jade');

ProjectSettings = (function(_super) {
  __extends(ProjectSettings, _super);

  function ProjectSettings() {
    return ProjectSettings.__super__.constructor.apply(this, arguments);
  }

  ProjectSettings.prototype.className = 'projectsettings';

  ProjectSettings.prototype.initialize = function(options) {
    this.options = options;
    ProjectSettings.__super__.initialize.apply(this, arguments);
    return Collections.projects.getCurrent((function(_this) {
      return function(project) {
        _this.project = project;
        _this.listenTo(_this.project.get('members'), 'add', function() {
          return _this.renderGeneralTab();
        });
        _this.listenTo(_this.project.get('members'), 'remove', function() {
          return _this.renderGeneralTab();
        });
        _this.model = _this.project.get('settings');
        return _this.render();
      };
    })(this));
  };

  ProjectSettings.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      settings: this.model.attributes,
      roleNo: Models.currentUser.get('roleNo')
    });
    this.$el.html(rtpl);
    this.renderGeneralTab();
    this.renderUserTab();
    this.renderEntriesTab();
    this.renderTextlayersTab();
    this.renderAnnotationsTab();
    if (this.options.tabName) {
      this.showTab(this.options.tabName);
    }
    this;
    return this.listenTo(this.model, 'change', (function(_this) {
      return function() {
        return _this.$('input[name="savesettings"]').removeClass('inactive');
      };
    })(this));
  };

  ProjectSettings.prototype.renderGeneralTab = function() {
    var generalTab;
    generalTab = new Views.GeneralTab({
      project: this.project
    });
    return this.$('div[data-tab="general"]').html(generalTab.el);
  };

  ProjectSettings.prototype.renderEntriesTab = function() {
    var entriesTab;
    entriesTab = new Views.EntriesTab({
      project: this.project
    });
    this.listenTo(entriesTab, 'confirm', this.renderConfirmModal);
    this.listenTo(entriesTab, 'savesettings', this.saveSettings);
    return this.$('div[data-tab="entries"]').html(entriesTab.el);
  };

  ProjectSettings.prototype.renderTextlayersTab = function() {
    var textlayersTab;
    textlayersTab = new Views.TextlayersTab({
      project: this.project
    });
    this.listenTo(textlayersTab, 'confirm', this.renderConfirmModal);
    return this.$('div[data-tab="textlayers"]').html(textlayersTab.el);
  };

  ProjectSettings.prototype.renderUserTab = function() {
    var usersTab;
    usersTab = new Views.UsersTab({
      project: this.project
    });
    this.listenTo(usersTab, 'confirm', this.renderConfirmModal);
    return this.$('div[data-tab="users"]').html(usersTab.el);
  };

  ProjectSettings.prototype.renderAnnotationsTab = function() {
    var addAnnotationTypeForm, annotationTypes, combolist, customTagNamesForm;
    annotationTypes = this.project.get('annotationtypes');
    combolist = new Views.ComboList({
      value: annotationTypes,
      config: {
        data: this.project.allannotationtypes,
        settings: {
          placeholder: 'Add annotation type',
          confirmRemove: true
        }
      }
    });
    this.$('div[data-tab="annotations"] .annotation-type-list').append(combolist.el);
    this.listenTo(combolist, 'confirmRemove', (function(_this) {
      return function(id, confirm) {
        return _this.renderConfirmModal(confirm, {
          title: 'Caution!',
          html: "You are about to <b>remove</b> annotation type: " + (annotationTypes.get(id).get('title')) + ".<br><br>All annotations of type " + (annotationTypes.get(id).get('title')) + " will be <b>permanently</b> removed!",
          submitValue: 'Remove annotation type'
        });
      };
    })(this));
    this.listenTo(combolist, 'change', (function(_this) {
      return function(changes) {
        var annotationType, name, selected;
        if (changes.added != null) {
          selected = new Backbone.Collection(changes.selected);
          annotationType = selected.get(changes.added);
          return _this.project.addAnnotationType(annotationType, function() {
            return _this.publish('message', "Added " + (annotationType.get('name')) + " to " + (_this.project.get('title')) + ".");
          });
        } else if (changes.removed != null) {
          name = _this.project.allannotationtypes.get(changes.removed).get('name');
          return _this.project.removeAnnotationType(changes.removed, function() {
            return _this.publish('message', "Removed " + name + " from " + (_this.project.get('title')) + ".");
          });
        }
      };
    })(this));
    addAnnotationTypeForm = new Views.Form({
      model: new Models.Annotationtype(),
      tpl: addAnnotationTypeTpl
    });
    this.$('div[data-tab="annotations"] .add-annotation-type').append(addAnnotationTypeForm.el);
    this.listenTo(addAnnotationTypeForm, 'save:success', (function(_this) {
      return function(model) {
        _this.project.get('annotationtypes').add(model);
        return addAnnotationTypeForm.reset();
      };
    })(this));
    this.listenTo(addAnnotationTypeForm, 'save:error', (function(_this) {
      return function(model, xhr, options) {
        return _this.publish('message', xhr.responseText);
      };
    })(this));
    customTagNamesForm = new Views.Form({
      model: this.project.get('settings'),
      tpl: customTagNamesTpl
    });
    return this.$('div[data-tab="annotations"] .set-custom-tag-names').append(customTagNamesForm.el);
  };

  ProjectSettings.prototype.renderConfirmModal = function(confirm, options) {
    var modal;
    modal = new Views.Modal(_.extend(options, {
      width: 'auto'
    }));
    return modal.on('submit', (function(_this) {
      return function() {
        modal.close();
        return confirm();
      };
    })(this));
  };

  ProjectSettings.prototype.events = {
    'click li[data-tab]': 'showTab'
  };

  ProjectSettings.prototype.showTab = function(ev) {
    var $ct, index, tabName;
    if (_.isString(ev)) {
      tabName = ev;
    } else {
      $ct = $(ev.currentTarget);
      tabName = $ct.attr('data-tab');
    }
    index = Backbone.history.fragment.indexOf('/settings');
    Backbone.history.navigate(Backbone.history.fragment.substr(0, index) + '/settings/' + tabName);
    this.$(".active[data-tab]").removeClass('active');
    return this.$("[data-tab='" + tabName + "']").addClass('active');
  };

  return ProjectSettings;

})(Views.Base);

module.exports = ProjectSettings;


},{"../../../../jade/project/settings/annotations.add.jade":104,"../../../../jade/project/settings/annotations.set-custom-tag-names.jade":105,"../../../../jade/project/settings/general.jade":109,"../../../../jade/project/settings/main.jade":111,"../../../collections/projects":46,"../../../entry.metadata":50,"../../../models/config":54,"../../../models/currentUser":55,"../../../models/project/annotationtype":59,"../../../models/project/settings":61,"../../../models/project/statistics":62,"../../../models/user":66,"../../../project.user.ids":68,"./entries":87,"./general":88,"./textlayers":90,"./users":91,"hilib/src/managers/ajax":3,"hilib/src/managers/async":4,"hilib/src/managers/token":7,"hilib/src/views/base":20,"hilib/src/views/form/combolist/main":21,"hilib/src/views/form/editablelist/main":23,"hilib/src/views/form/main":25,"hilib/src/views/modal":30}],90:[function(require,module,exports){
var ProjectSettingsTextlayers, Views, ajax, tpl, viewManager,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

ajax = require('hilib/src/managers/ajax');

viewManager = require('hilib/src/managers/view2');

Views = {
  Base: require('hilib/src/views/base'),
  EditableList: require('hilib/src/views/form/editablelist/main')
};

tpl = require('../../../../jade/project/settings/textlayers.jade');

ProjectSettingsTextlayers = (function(_super) {
  __extends(ProjectSettingsTextlayers, _super);

  function ProjectSettingsTextlayers() {
    return ProjectSettingsTextlayers.__super__.constructor.apply(this, arguments);
  }

  ProjectSettingsTextlayers.prototype.className = 'textlayers';

  ProjectSettingsTextlayers.prototype.initialize = function(options) {
    this.options = options;
    ProjectSettingsTextlayers.__super__.initialize.apply(this, arguments);
    this.project = this.options.project;
    return this.render();
  };

  ProjectSettingsTextlayers.prototype.render = function() {
    var textLayerList;
    this.el.innerHTML = tpl();
    textLayerList = new Views.EditableList({
      value: this.project.get('textLayers'),
      config: {
        settings: {
          placeholder: 'Add layer',
          confirmRemove: true
        }
      }
    });
    this.listenTo(textLayerList, 'confirmRemove', (function(_this) {
      return function(id, confirm) {
        return _this.trigger('confirm', confirm, {
          title: 'Caution!',
          html: 'You are about to <b>remove</b> the ' + id + ' layer<br><br>All texts and annotations will be <b>permanently</b> removed!',
          submitValue: 'Remove ' + id + ' layer'
        });
      };
    })(this));
    this.listenTo(textLayerList, 'change', (function(_this) {
      return function(values) {
        _this.project.set('textLayers', values);
        return _this.project.saveTextlayers(function() {
          return _this.publish('message', 'Text layers updated.');
        });
      };
    })(this));
    this.$el.append(textLayerList.el);
    return this;
  };

  return ProjectSettingsTextlayers;

})(Views.Base);

module.exports = ProjectSettingsTextlayers;


},{"../../../../jade/project/settings/textlayers.jade":112,"hilib/src/managers/ajax":3,"hilib/src/managers/view2":8,"hilib/src/views/base":20,"hilib/src/views/form/editablelist/main":23}],91:[function(require,module,exports){
var Models, ProjectSettingsUsers, Views, addUserTpl, rolesTpl, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

Models = {
  currentUser: require('../../../models/currentUser'),
  User: require('../../../models/user')
};

Views = {
  Base: require('hilib/src/views/base'),
  ComboList: require('hilib/src/views/form/combolist/main'),
  Form: require('hilib/src/views/form/main')
};

tpl = require('../../../../jade/project/settings/users.jade');

rolesTpl = require('../../../../jade/project/settings/users.roles.jade');

addUserTpl = require('../../../../jade/project/settings/users.add.jade');

ProjectSettingsUsers = (function(_super) {
  __extends(ProjectSettingsUsers, _super);

  function ProjectSettingsUsers() {
    return ProjectSettingsUsers.__super__.constructor.apply(this, arguments);
  }

  ProjectSettingsUsers.prototype.className = 'users';

  ProjectSettingsUsers.prototype.initialize = function(options) {
    this.options = options;
    ProjectSettingsUsers.__super__.initialize.apply(this, arguments);
    this.project = this.options.project;
    this.listenTo(this.project.get('members'), 'add remove', this.renderUserroles);
    return this.render();
  };

  ProjectSettingsUsers.prototype.render = function() {
    this.el.innerHTML = tpl();
    this.renderUserroles();
    this.renderCombolist();
    this.renderAddUserForm();
    return this;
  };

  ProjectSettingsUsers.prototype.renderUserroles = function() {
    return this.$('.userroles ul').html(rolesTpl({
      members: this.project.get('members')
    }));
  };

  ProjectSettingsUsers.prototype.renderCombolist = (function() {
    var combolist;
    combolist = null;
    return function() {
      if (combolist != null) {
        this.stopListening(combolist);
        combolist.destroy();
      }
      combolist = new Views.ComboList({
        value: this.project.get('members'),
        config: {
          data: this.project.allusers,
          settings: {
            placeholder: 'Add member',
            confirmRemove: true
          }
        }
      });
      this.$('.userlist').append(combolist.el);
      this.listenTo(combolist, 'confirmRemove', (function(_this) {
        return function(id, confirm) {
          return _this.trigger('confirm', confirm, {
            html: 'You are about to remove <u>' + _this.project.get('members').get(id).get('title') + '</u> from your project.',
            submitValue: 'Remove user'
          });
        };
      })(this));
      return this.listenTo(combolist, 'change', (function(_this) {
        return function(changes) {
          var shortName, user, userAttrs;
          if (changes.added != null) {
            userAttrs = _.findWhere(changes.selected, {
              id: changes.added
            });
            user = new Models.User(userAttrs);
            return _this.project.addUser(user, function() {
              return _this.publish('message', "Added " + (user.getShortName()) + " to " + (_this.project.get('title')) + ".");
            });
          } else if (changes.removed != null) {
            user = _this.project.allusers.get(changes.removed);
            shortName = user.getShortName();
            return _this.project.removeUser(changes.removed, function() {
              return _this.publish('message', "Removed " + shortName + " from " + (_this.project.get('title')) + ".");
            });
          }
        };
      })(this));
    };
  })();

  ProjectSettingsUsers.prototype.renderAddUserForm = function() {
    var form;
    form = new Views.Form({
      model: new Models.User(),
      tpl: addUserTpl,
      tplData: {
        roleNo: Models.currentUser.get('roleNo')
      }
    });
    this.$('.adduser').append(form.el);
    this.listenTo(form, 'save:success', (function(_this) {
      return function(model) {
        form.reset();
        _this.project.get('members').add(model);
        _this.project.addUser(model, function() {
          return _this.publish('message', "Added " + (model.getShortName()) + " to " + (_this.project.get('title')) + ".");
        });
        return _this.renderCombolist();
      };
    })(this));
    return this.listenTo(form, 'save:error', (function(_this) {
      return function(model, xhr, options) {
        return _this.publish('message', xhr.responseText);
      };
    })(this));
  };

  ProjectSettingsUsers.prototype.events = function() {
    return {
      'change select': 'roleChanged'
    };
  };

  ProjectSettingsUsers.prototype.roleChanged = function(ev) {
    var id, jqXHR, role;
    id = ev.currentTarget.getAttribute('data-id');
    role = ev.currentTarget.options[ev.currentTarget.selectedIndex].value;
    jqXHR = this.project.get('members').get(id).set('role', role).save();
    jqXHR.done((function(_this) {
      return function() {
        return _this.publish('message', 'Changed role to ' + role);
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function() {
        return _this.publish('message', 'Changing role failed!');
      };
    })(this));
  };

  return ProjectSettingsUsers;

})(Views.Base);

module.exports = ProjectSettingsUsers;


},{"../../../../jade/project/settings/users.add.jade":113,"../../../../jade/project/settings/users.jade":114,"../../../../jade/project/settings/users.roles.jade":115,"../../../models/currentUser":55,"../../../models/user":66,"hilib/src/views/base":20,"hilib/src/views/form/combolist/main":21,"hilib/src/views/form/main":25}],92:[function(require,module,exports){
var BaseView, Collections, Models, Statistics, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseView = require('hilib/src/views/base');

Models = {
  Statistics: require('../../models/project/statistics')
};

Collections = {
  projects: require('../../collections/projects')
};

tpl = require('../../../jade/project/statistics.jade');

Statistics = (function(_super) {
  __extends(Statistics, _super);

  function Statistics() {
    return Statistics.__super__.constructor.apply(this, arguments);
  }

  Statistics.prototype.className = 'statistics';

  Statistics.prototype.initialize = function(options) {
    this.options = options;
    Statistics.__super__.initialize.apply(this, arguments);
    return Collections.projects.getCurrent((function(_this) {
      return function(project) {
        var stats;
        _this.project = project;
        stats = new Models.Statistics(null, {
          projectID: _this.project.id
        });
        return stats.fetch({
          success: function(data) {
            _this.statString = JSON.stringify(data, null, 4);
            _this.statString = _this.statString.replace(/{/g, '');
            _this.statString = _this.statString.replace(/}/g, '');
            _this.statString = _this.statString.replace(/\"/g, '');
            _this.statString = _this.statString.replace(/,/g, '');
            return _this.render();
          }
        });
      };
    })(this));
  };

  Statistics.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      statistics: this.statString
    });
    this.el.innerHTML = rtpl;
    return this;
  };

  return Statistics;

})(BaseView);

module.exports = Statistics;


},{"../../../jade/project/statistics.jade":116,"../../collections/projects":46,"../../models/project/statistics":62,"hilib/src/views/base":20}],93:[function(require,module,exports){
var $, Backbone, BaseView, Models, SetNewPassword, Views, ajax, history, token, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

$ = require('jquery');

BaseView = require('hilib/src/views/base');

Models = {
  SetNewPassword: require('../models/set-new-password')
};

history = require('hilib/src/managers/history');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Views = {
  Modal: require('hilib/src/views/modal'),
  Form: require('hilib/src/views/form/main')
};

tpl = require('../../jade/set-new-password.jade');

SetNewPassword = (function(_super) {
  __extends(SetNewPassword, _super);

  function SetNewPassword() {
    return SetNewPassword.__super__.constructor.apply(this, arguments);
  }

  SetNewPassword.prototype.className = 'set-new-password';

  SetNewPassword.prototype.initialize = function() {
    return this.render();
  };

  SetNewPassword.prototype.render = function() {
    var form, getVar, modal, setNewPasswordModel, _i, _len, _ref;
    setNewPasswordModel = new Models.SetNewPassword();
    _ref = location.search.substr(1).split('&');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      getVar = _ref[_i];
      getVar = getVar.split('=');
      if (getVar[0] === 'emailaddress' || getVar[0] === 'token') {
        setNewPasswordModel.set(getVar[0], getVar[1]);
      }
    }
    form = new Views.Form({
      tpl: tpl,
      model: setNewPasswordModel,
      saveOnSubmit: false
    });
    form.$('a[name="login"]').on('click', (function(_this) {
      return function() {
        form.destroy();
        modal.destroy();
        _this.remove();
        return window.location = '/login';
      };
    })(this));
    form.on('submit', (function(_this) {
      return function(model) {
        return model.setNewPassword(function() {
          form.$('ul').hide();
          return form.$('p').show();
        });
      };
    })(this));
    return modal = new Views.Modal({
      title: 'Choose a new password',
      clickOverlay: false,
      html: form.el,
      cancelAndSubmit: false,
      customClassName: 'set-new-password'
    });
  };

  return SetNewPassword;

})(Backbone.View);

module.exports = SetNewPassword;


},{"../../jade/set-new-password.jade":118,"../models/set-new-password":64,"hilib/src/managers/ajax":3,"hilib/src/managers/history":5,"hilib/src/managers/token":7,"hilib/src/views/base":20,"hilib/src/views/form/main":25,"hilib/src/views/modal":30}],94:[function(require,module,exports){
var $, Backbone, BaseView, Fn, Header, StringFn, Views, ajax, config, currentUser, projects, token, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

$ = require('jquery');

BaseView = require('hilib/src/views/base');

config = require('../../models/config');

Fn = require('hilib/src/utils/general');

StringFn = require('hilib/src/utils/string');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Views = {
  Modal: require('hilib/src/views/modal')
};

currentUser = require('../../models/currentUser');

projects = require('../../collections/projects');

tpl = require('../../../jade/ui/header.jade');

Header = (function(_super) {
  __extends(Header, _super);

  function Header() {
    return Header.__super__.constructor.apply(this, arguments);
  }

  Header.prototype.className = 'main';

  Header.prototype.tagName = 'header';

  Header.prototype.initialize = function(options) {
    this.options = options;
    Header.__super__.initialize.apply(this, arguments);
    this.project = this.options.project;
    this.listenTo(projects, 'current:change', (function(_this) {
      return function(project) {
        _this.project = project;
        return _this.render();
      };
    })(this));
    this.listenTo(config, 'change:entryTermPlural', this.render);
    this.subscribe('message', this.showMessage, this);
    return this.render();
  };

  Header.prototype.events = {
    'click .left .projecttitle': 'navigateToProject',
    'click .left .settings': 'navigateToProjectSettings',
    'click .left .search': 'navigateToProject',
    'click .left .statistics': 'navigateToProjectStatistics',
    'click .left .history': 'navigateToProjectHistory',
    'click .middle .message': function() {
      return this.$('.message').removeClass('active');
    },
    'click .right .logout': function() {
      return currentUser.logout();
    },
    'click .right .project:not(.active)': 'setProject',
    'click .right .addproject': 'addProject'
  };

  Header.prototype.navigateToProject = function(ev) {
    return Backbone.history.navigate("projects/" + (this.project.get('name')), {
      trigger: true
    });
  };

  Header.prototype.navigateToProjectSettings = function(ev) {
    return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/settings", {
      trigger: true
    });
  };

  Header.prototype.navigateToProjectStatistics = function(ev) {
    return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/statistics", {
      trigger: true
    });
  };

  Header.prototype.navigateToProjectHistory = function(ev) {
    return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/history", {
      trigger: true
    });
  };

  Header.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      projects: projects,
      user: currentUser,
      plural: StringFn.ucfirst(config.get('entryTermPlural'))
    });
    this.$el.html(rtpl);
    return this;
  };

  Header.prototype.addProject = (function() {
    var modal;
    modal = null;
    return function(ev) {
      if (modal != null) {
        return;
      }
      modal = new Views.Modal({
        title: "Add project",
        html: "<form> <ul> <li> <label>Name</label> <input name=\"project-title\" type=\"text\" /> </li> <li> <label>Type</label> <select name=\"project-type\"> <option value=\"collection\">Collection</option> <option value=\"mvn\">MVN</option> </select> </li> </ul> </form>",
        submitValue: 'Add project',
        width: '300px'
      });
      modal.on('submit', (function(_this) {
        return function() {
          return projects.create({
            title: $('input[name="project-title"]').val(),
            type: $('select[name="project-type"]').val()
          }, {
            wait: true,
            success: function(model) {
              return modal.close();
            },
            error: function(response) {
              if (response.status === 401) {
                return Backbone.history.navigate('login', {
                  trigger: true
                });
              }
            }
          });
        };
      })(this));
      return modal.on('close', function() {
        return modal = null;
      });
    };
  })();

  Header.prototype.setProject = function(ev) {
    var id;
    this.$('span.projecttitle').html($('<i class="fa fa-spinner fa-spin" />'));
    id = ev.hasOwnProperty('currentTarget') ? +ev.currentTarget.getAttribute('data-id') : ev;
    return projects.setCurrent(id);
  };

  Header.prototype.showMessage = function(msg) {
    var $message;
    if (msg.trim().length === 0) {
      return false;
    }
    $message = this.$('.message');
    if (!$message.hasClass('active')) {
      $message.addClass('active');
    }
    $message.html(msg);
    return Fn.timeoutWithReset(5000, ((function(_this) {
      return function() {
        return $message.removeClass('active');
      };
    })(this)), (function(_this) {
      return function() {
        $message.addClass('pulse');
        return setTimeout((function() {
          return $message.removeClass('pulse');
        }), 1000);
      };
    })(this));
  };

  return Header;

})(BaseView);

module.exports = Header;


},{"../../../jade/ui/header.jade":119,"../../collections/projects":46,"../../models/config":54,"../../models/currentUser":55,"hilib/src/managers/ajax":3,"hilib/src/managers/token":7,"hilib/src/utils/general":17,"hilib/src/utils/string":19,"hilib/src/views/base":20,"hilib/src/views/modal":30}],95:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (collection, model, sel, undefined) {
buf.push("<form><ul" + (jade.attr("data-model-id", model.cid, true, false)) + " class=\"form\"><li><label>Type</label><select name=\"metadata.type\">");
// iterate collection.models
;(function(){
  var $$obj = collection.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var item = $$obj[$index];

sel = item.id === model.get('annotationType').id
buf.push("<option" + (jade.attr("value", item.id, true, false)) + (jade.attr("selected", sel, true, false)) + ">" + (jade.escape((jade_interp = item.get('description')) == null ? '' : jade_interp)) + " (" + (jade.escape((jade_interp = item.get('name')) == null ? '' : jade_interp)) + ")</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var item = $$obj[$index];

sel = item.id === model.get('annotationType').id
buf.push("<option" + (jade.attr("value", item.id, true, false)) + (jade.attr("selected", sel, true, false)) + ">" + (jade.escape((jade_interp = item.get('description')) == null ? '' : jade_interp)) + " (" + (jade.escape((jade_interp = item.get('name')) == null ? '' : jade_interp)) + ")</option>");
    }

  }
}).call(this);

buf.push("</select></li>");
if ( model.get('annotationType').hasOwnProperty('metadataItems'))
{
// iterate model.get('annotationType').metadataItems
;(function(){
  var $$obj = model.get('annotationType').metadataItems;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var metadata = $$obj[$index];

buf.push("<li> <label" + (jade.attr("title", metadata.description, true, false)) + ">" + (jade.escape(null == (jade_interp = metadata.name) ? "" : jade_interp)) + "</label><input type=\"text\"" + (jade.attr("name", 'metadata.'+metadata.name, true, false)) + (jade.attr("value", model.get('metadata')[metadata.name], true, false)) + "/></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var metadata = $$obj[$index];

buf.push("<li> <label" + (jade.attr("title", metadata.description, true, false)) + ">" + (jade.escape(null == (jade_interp = metadata.name) ? "" : jade_interp)) + "</label><input type=\"text\"" + (jade.attr("name", 'metadata.'+metadata.name, true, false)) + (jade.attr("value", model.get('metadata')[metadata.name], true, false)) + "/></li>");
    }

  }
}).call(this);

}
buf.push("</ul></form>");}.call(this,"collection" in locals_for_with?locals_for_with.collection:typeof collection!=="undefined"?collection:undefined,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined,"sel" in locals_for_with?locals_for_with.sel:typeof sel!=="undefined"?sel:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":36}],96:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (user) {
buf.push("<div class=\"subsubmenu\"><div class=\"editfacsimiles\"></div></div><div class=\"container\"><div class=\"left-pane\"><iframe id=\"viewer_iframe\" name=\"viewer_iframe\" scrolling=\"no\" width=\"100%\" frameborder=\"0\"></iframe><div class=\"preview-placeholder\"></div></div>");
if ( user.get('roleNo') >= 20)
{
buf.push("<div class=\"middle-pane\"><div class=\"transcription-placeholder\"><div class=\"transcription-editor\"></div></div><div class=\"annotation-placeholder\"><div class=\"annotation-editor\"></div></div><div class=\"annotationmetadata-placeholder\"><div class=\"annotationmetadata\"></div></div></div>");
}
buf.push("<div class=\"right-pane\"><div class=\"preview-placeholder\"></div></div></div>");}.call(this,"user" in locals_for_with?locals_for_with.user:typeof user!=="undefined"?user:undefined));;return buf.join("");
};
},{"jade/runtime":36}],97:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (currentTranscription, entry, undefined, user) {
currentTranscription = entry.get('transcriptions').current
buf.push("<div class=\"left-menu\"><ul class=\"horizontal menu nav\"><li data-key=\"previous\">&nbsp;</li><li data-key=\"current\"" + (jade.attr("title", entry.get('name'), true, false)) + ">" + (jade.escape(null == (jade_interp = entry.get('name')) ? "" : jade_interp)) + "</li><li data-key=\"next\">&nbsp;</li></ul><ul class=\"horizontal menu switchers\"><li data-key=\"facsimiles\">Facsimiles&nbsp;<span>" + (jade.escape(null == (jade_interp = '(' + entry.get('facsimiles').length + ')') ? "" : jade_interp)) + "</span><ul class=\"vertical menu facsimiles\"><li class=\"spacer\">&nbsp;</li>");
if ( user.get('roleNo') >= 20)
{
buf.push("<li data-key=\"editfacsimiles\" class=\"subsub\">Add &amp; remove...</li>");
}
// iterate entry.get('facsimiles').models
;(function(){
  var $$obj = entry.get('facsimiles').models;
  if ('number' == typeof $$obj.length) {

    for (var index = 0, $$l = $$obj.length; index < $$l; index++) {
      var facsimile = $$obj[index];

buf.push("<li data-key=\"facsimile\"" + (jade.attr("data-value", facsimile.id, true, false)) + (jade.cls([index==0?'active':''], [true])) + ">" + (jade.escape(null == (jade_interp = facsimile.get('name')) ? "" : jade_interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var index in $$obj) {
      $$l++;      var facsimile = $$obj[index];

buf.push("<li data-key=\"facsimile\"" + (jade.attr("data-value", facsimile.id, true, false)) + (jade.cls([index==0?'active':''], [true])) + ">" + (jade.escape(null == (jade_interp = facsimile.get('name')) ? "" : jade_interp)) + "</li>");
    }

  }
}).call(this);

buf.push("</ul></li><li data-key=\"textlayers\">Text layers&nbsp;<span>" + (jade.escape(null == (jade_interp = '(' + entry.get('transcriptions').length + ')') ? "" : jade_interp)) + "</span><ul class=\"vertical menu textlayers\">");
// iterate entry.get('transcriptions').models
;(function(){
  var $$obj = entry.get('transcriptions').models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var transcription = $$obj[$index];

buf.push("<li data-key=\"transcription\"" + (jade.attr("data-value", transcription.id, true, false)) + ">" + (jade.escape((jade_interp = transcription.get('textLayer')) == null ? '' : jade_interp)) + " layer</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var transcription = $$obj[$index];

buf.push("<li data-key=\"transcription\"" + (jade.attr("data-value", transcription.id, true, false)) + ">" + (jade.escape((jade_interp = transcription.get('textLayer')) == null ? '' : jade_interp)) + " layer</li>");
    }

  }
}).call(this);

buf.push("</ul></li></ul></div><div class=\"middle-menu\"><ul class=\"horizontal menu\">");
if ( entry.get('transcriptions').models.length > 1)
{
buf.push("<li data-key=\"layer\"" + (jade.attr("data-value", currentTranscription.id, true, false)) + " class=\"arrowdown\">" + (jade.escape(null == (jade_interp = currentTranscription.get('textLayer') + ' layer') ? "" : jade_interp)) + "<ul class=\"vertical menu textlayers\"><li class=\"spacer\">&nbsp;</li>");
if ( entry.get('transcriptions').models.length > 1)
{
}
// iterate entry.get('transcriptions').models
;(function(){
  var $$obj = entry.get('transcriptions').models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var transcription = $$obj[$index];

if ( transcription != currentTranscription)
{
buf.push("<li data-key=\"transcription\"" + (jade.attr("data-value", transcription.id, true, false)) + ">" + (jade.escape((jade_interp = transcription.get('textLayer')) == null ? '' : jade_interp)) + " layer</li>");
}
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var transcription = $$obj[$index];

if ( transcription != currentTranscription)
{
buf.push("<li data-key=\"transcription\"" + (jade.attr("data-value", transcription.id, true, false)) + ">" + (jade.escape((jade_interp = transcription.get('textLayer')) == null ? '' : jade_interp)) + " layer</li>");
}
    }

  }
}).call(this);

buf.push("</ul></li>");
}
buf.push("</ul></div><div class=\"right-menu\"><ul class=\"horizontal menu\">");
if ( user.get('roleNo') >= 30)
{
buf.push("<li data-key=\"delete\">Remove</li>");
}
buf.push("<li data-key=\"metadata\">Metadata</li></ul></div>");}.call(this,"currentTranscription" in locals_for_with?locals_for_with.currentTranscription:typeof currentTranscription!=="undefined"?currentTranscription:undefined,"entry" in locals_for_with?locals_for_with.entry:typeof entry!=="undefined"?entry:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined,"user" in locals_for_with?locals_for_with.user:typeof user!=="undefined"?user:undefined));;return buf.join("");
};
},{"jade/runtime":36}],98:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (Date, entrymetadatafields, generateID, id, model, undefined, user, value) {
buf.push("<small>The last modification of " + (jade.escape((jade_interp = model.get('name')) == null ? '' : jade_interp)) + " was " + (jade.escape((jade_interp = new Date(model.get('modifiedOn')).toDateString()) == null ? '' : jade_interp)) + " by " + (jade.escape((jade_interp = model.get('modifier').title) == null ? '' : jade_interp)) + ".</small><br/><br/><fieldset class=\"span100\"><ul" + (jade.attr("data-model-id", model.cid, true, false)) + "><li>");
id = generateID()
buf.push("<label" + (jade.attr("for", id, true, false)) + ">Name</label>");
if ( user.get('roleNo') >= 20)
{
buf.push("<textarea" + (jade.attr("id", id, true, false)) + " name=\"name\">" + (jade.escape(null == (jade_interp = model.get('name')) ? "" : jade_interp)) + "</textarea>");
}
else
{
buf.push("<span>" + (jade.escape(null == (jade_interp = model.get('name')) ? "" : jade_interp)) + "</span>");
}
buf.push("</li><li>");
id = generateID()
buf.push("<label" + (jade.attr("for", id, true, false)) + ">Short name</label>");
if ( user.get('roleNo') >= 20)
{
buf.push("<input" + (jade.attr("id", id, true, false)) + " type=\"text\" name=\"shortName\"" + (jade.attr("value", model.get('shortName'), true, false)) + "/>");
}
else
{
buf.push("<span>" + (jade.escape(null == (jade_interp = model.get('shortName')) ? "" : jade_interp)) + "</span>");
}
buf.push("</li>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var key = $$obj[$index];

buf.push("<li>");
id = generateID()
value = model.get('settings').get(key)
buf.push("<label" + (jade.attr("for", id, true, false)) + ">" + (jade.escape(null == (jade_interp = key) ? "" : jade_interp)) + "</label>");
if ( user.get('roleNo') >= 20)
{
buf.push("<textarea" + (jade.attr("id", id, true, false)) + (jade.attr("name", key, true, false)) + ">" + (jade.escape(null == (jade_interp = value) ? "" : jade_interp)) + "</textarea>");
}
else
{
buf.push("<span>" + (jade.escape(null == (jade_interp = value) ? "" : jade_interp)) + "</span>");
}
buf.push("</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var key = $$obj[$index];

buf.push("<li>");
id = generateID()
value = model.get('settings').get(key)
buf.push("<label" + (jade.attr("for", id, true, false)) + ">" + (jade.escape(null == (jade_interp = key) ? "" : jade_interp)) + "</label>");
if ( user.get('roleNo') >= 20)
{
buf.push("<textarea" + (jade.attr("id", id, true, false)) + (jade.attr("name", key, true, false)) + ">" + (jade.escape(null == (jade_interp = value) ? "" : jade_interp)) + "</textarea>");
}
else
{
buf.push("<span>" + (jade.escape(null == (jade_interp = value) ? "" : jade_interp)) + "</span>");
}
buf.push("</li>");
    }

  }
}).call(this);

buf.push("<li>");
id = generateID()
buf.push("<label" + (jade.attr("for", id, true, false)) + ">Publishable</label>");
if ( user.get('roleNo') >= 20)
{
buf.push("<input" + (jade.attr("id", id, true, false)) + " type=\"checkbox\" name=\"publishable\"" + (jade.attr("checked", model.get('publishable'), true, false)) + "/>");
}
else
{
buf.push("<span>" + (jade.escape(null == (jade_interp = model.get('publishable')) ? "" : jade_interp)) + "</span>");
}
buf.push("</li></ul></fieldset>");}.call(this,"Date" in locals_for_with?locals_for_with.Date:typeof Date!=="undefined"?Date:undefined,"entrymetadatafields" in locals_for_with?locals_for_with.entrymetadatafields:typeof entrymetadatafields!=="undefined"?entrymetadatafields:undefined,"generateID" in locals_for_with?locals_for_with.generateID:typeof generateID!=="undefined"?generateID:undefined,"id" in locals_for_with?locals_for_with.id:typeof id!=="undefined"?id:undefined,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined,"user" in locals_for_with?locals_for_with.user:typeof user!=="undefined"?user:undefined,"value" in locals_for_with?locals_for_with.value:typeof value!=="undefined"?value:undefined));;return buf.join("");
};
},{"jade/runtime":36}],99:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (body, lineCount, lineNumber, textLayer, user) {
buf.push("<h2><span>" + (jade.escape(null == (jade_interp = textLayer + ' preview layer') ? "" : jade_interp)) + "</span>");
if ( user.get('roleNo') >= 20)
{
buf.push("<i style=\"color: #888; font-size: 0.8em; margin-left: 10px\" class=\"fa fa-print\"></i>");
}
buf.push("</h2>");
if ( lineCount == 0)
{
buf.push("<span class=\"emptylayer\">This layer is empty.</span>");
}
buf.push("<div class=\"body-container\"><div class=\"body\">" + (null == (jade_interp = body) ? "" : jade_interp) + "</div><ul class=\"linenumbers\">");
lineNumber = 1
while (lineNumber <= lineCount)
{
buf.push("<li>" + (jade.escape(null == (jade_interp = lineNumber) ? "" : jade_interp)) + "</li>");
lineNumber++
}
buf.push("</ul></div>");}.call(this,"body" in locals_for_with?locals_for_with.body:typeof body!=="undefined"?body:undefined,"lineCount" in locals_for_with?locals_for_with.lineCount:typeof lineCount!=="undefined"?lineCount:undefined,"lineNumber" in locals_for_with?locals_for_with.lineNumber:typeof lineNumber!=="undefined"?lineNumber:undefined,"textLayer" in locals_for_with?locals_for_with.textLayer:typeof textLayer!=="undefined"?textLayer:undefined,"user" in locals_for_with?locals_for_with.user:typeof user!=="undefined"?user:undefined));;return buf.join("");
};
},{"jade/runtime":36}],100:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (facsimiles, undefined) {
buf.push("<div class=\"row span3\"><div class=\"close-button\">X</div><div class=\"cell span1\"><div class=\"pad2\"><h3>Facsimiles</h3><ul class=\"facsimiles\">");
// iterate facsimiles.models
;(function(){
  var $$obj = facsimiles.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var facsimile = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", facsimile.id, true, false)) + " class=\"facsimile\"><span class=\"name\"><img src=\"/images/icon.bin.png\" width=\"14px\" height=\"14px\"/><label>" + (jade.escape(null == (jade_interp = facsimile.get('name')) ? "" : jade_interp)) + "</label></span><span class=\"orcancel\">or Cancel</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var facsimile = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", facsimile.id, true, false)) + " class=\"facsimile\"><span class=\"name\"><img src=\"/images/icon.bin.png\" width=\"14px\" height=\"14px\"/><label>" + (jade.escape(null == (jade_interp = facsimile.get('name')) ? "" : jade_interp)) + "</label></span><span class=\"orcancel\">or Cancel</span></li>");
    }

  }
}).call(this);

buf.push("</ul></div></div><div class=\"cell span2\"><div class=\"pad2\"><h3>Upload new facsimile</h3><ul class=\"form addfacsimile\"><li><label>Name</label><input type=\"text\" name=\"name\"/></li><li><form enctype=\"multipart/form-data\" class=\"addfile\"><input type=\"file\" name=\"filename\"/></form></li><li><button class=\"addfacsimile\">Add facsimile</button></li></ul></div></div></div>");}.call(this,"facsimiles" in locals_for_with?locals_for_with.facsimiles:typeof facsimiles!=="undefined"?facsimiles:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":36}],101:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (annotationTypes, undefined) {
buf.push("<select>");
// iterate annotationTypes.models
;(function(){
  var $$obj = annotationTypes.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var annotationType = $$obj[$index];

buf.push("<option" + (jade.attr("value", annotationType.id, true, false)) + ">" + (jade.escape(null == (jade_interp = annotationType.get('name')) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var annotationType = $$obj[$index];

buf.push("<option" + (jade.attr("value", annotationType.id, true, false)) + ">" + (jade.escape(null == (jade_interp = annotationType.get('name')) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select><button>Add annotation</button>");}.call(this,"annotationTypes" in locals_for_with?locals_for_with.annotationTypes:typeof annotationTypes!=="undefined"?annotationTypes:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":36}],102:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<div class=\"left-pane\"><h1>eLaborate</h1><p>eLaborate is an online work environment in which scholars can upload scans, transcribe and annotate text, and publish the results \nas on online text edition which is freely available to all users. Short information about and a link to already published editions \nis presented on the page Editions under Published. Information about editions currently being prepared is posted on the page \nOngoing projects.</p><p>The eLaborate work environment for the creation and publication of online digital editions is developed by the Huygens Institute \nfor the History of the Netherlands of the Royal Netherlands Academy of Arts and Sciences. This website is the companion to the \nfourth version of the software, which was released on 31 March 2014.</p><p>Information about access to the work environment can be found in <a data-bypass target=\"_blank\" href=\"http://elaborate.huygens.knaw.nl\">http://elaborate.huygens.knaw.nl</a> through the tab About eLaborate \non the page For users. Details about the technical side is available on the page For programmers. This page also gives information \nabout the open source version of the software. The history of eLaborate is described on the page About eLaborate.</p><h2>eLaborate2</h2><p>Those still using eLaborate2 can find their work environment by following this link: <a data-bypass target=\"_blank\" href=\"http://www.e-laborate.nl/en/\">http://www.e-laborate.nl/en/</a>. \nIn the course of 2014, projects using eLaborate2 will be migrated to eLaborate4. The eLaborate team will contact the project leaders to discuss the best time frame for the migration and to arrange instruction in eLaborate4.</p><h2>Links</h2><p> \nMore about Huygens ING at <a data-bypass target=\"_blank\" href=\"http://www.huygens.knaw.nl/\">http://www.huygens.knaw.nl/</a></p></div><div class=\"right-pane\"><h2>Regular login</h2><form class=\"login region\"><ul class=\"message\"><li></li></ul><ul><li><label>Username</label><input id=\"username\" type=\"text\" name=\"username\"/></li><li><label>Password</label><input id=\"password\" type=\"password\" name=\"password\"/></li><li class=\"resetpassword\">Forgot your password?</li><li class=\"login\"><button name=\"submit\">Login<i class=\"fa fa-spinner fa-spin\"></i></button></li></ul></form><div class=\"federated\"><h2>Federated login</h2><button class=\"simple federated-login\">Login</button></div></div>");;return buf.join("");
};
},{"jade/runtime":36}],103:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (logEntries, undefined) {
buf.push("<h2>History</h2><div class=\"entries\">");
// iterate logEntries
;(function(){
  var $$obj = logEntries;
  if ('number' == typeof $$obj.length) {

    for (var date = 0, $$l = $$obj.length; date < $$l; date++) {
      var entries = $$obj[date];

buf.push("<h3>" + (jade.escape(null == (jade_interp = date) ? "" : jade_interp)) + "</h3><ul>");
// iterate entries
;(function(){
  var $$obj = entries;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade_interp = entry.userName) ? "" : jade_interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade_interp = entry.comment) ? "" : jade_interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade_interp = entry.userName) ? "" : jade_interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade_interp = entry.comment) ? "" : jade_interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul>");
    }

  } else {
    var $$l = 0;
    for (var date in $$obj) {
      $$l++;      var entries = $$obj[date];

buf.push("<h3>" + (jade.escape(null == (jade_interp = date) ? "" : jade_interp)) + "</h3><ul>");
// iterate entries
;(function(){
  var $$obj = entries;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade_interp = entry.userName) ? "" : jade_interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade_interp = entry.comment) ? "" : jade_interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade_interp = entry.userName) ? "" : jade_interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade_interp = entry.comment) ? "" : jade_interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul>");
    }

  }
}).call(this);

buf.push("</div><button class=\"simple more\">Show the next 500 entries</button>");}.call(this,"logEntries" in locals_for_with?locals_for_with.logEntries:typeof logEntries!=="undefined"?logEntries:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":36}],104:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (model) {
buf.push("<fieldset class=\"span100\"><h3>Add annotation type to project</h3><ul" + (jade.attr("data-model-id", model.cid, true, false)) + "><li><label>Name</label><input type=\"text\" name=\"name\"/></li><li><label>Description</label><input type=\"text\" name=\"description\"/></li><li><button name=\"submit\" class=\"disabled\">Add type<i class=\"fa fa-spinner fa-spin\"></i></button></li></ul></fieldset>");}.call(this,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined));;return buf.join("");
};
},{"jade/runtime":36}],105:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (model) {
buf.push("<fieldset><h3>Set custom names for tags</h3><p style=\"color:gray\"><strong>The custom names are only applicable to the <u>diplomatic</u> layer!</strong></p><ul" + (jade.attr("data-model-id", model.cid, true, false)) + "><li><b>Bold</b></li><li><label>Name</label><input type=\"text\" name=\"annotationType.b.name\"" + (jade.attr("value", model.get('annotationType.b.name'), true, false)) + "/></li><li class=\"description\"><label>Description</label><input type=\"text\" name=\"annotationType.b.description\"" + (jade.attr("value", model.get('annotationType.b.description'), true, false)) + "/></li><li><b>Italic</b></li><li><label>Name</label><input type=\"text\" name=\"annotationType.i.name\"" + (jade.attr("value", model.get('annotationType.i.name'), true, false)) + "/></li><li class=\"description\"><label>Description</label><input type=\"text\" name=\"annotationType.i.description\"" + (jade.attr("value", model.get('annotationType.i.description'), true, false)) + "/></li><li><b>Underline</b></li><li><label>Name</label><input type=\"text\" name=\"annotationType.u.name\"" + (jade.attr("value", model.get('annotationType.u.name'), true, false)) + "/></li><li class=\"description\"><label>Description</label><input type=\"text\" name=\"annotationType.u.description\"" + (jade.attr("value", model.get('annotationType.u.description'), true, false)) + "/></li><li><b>Strikethrough</b></li><li><label>Name</label><input type=\"text\" name=\"annotationType.strike.name\"" + (jade.attr("value", model.get('annotationType.strike.name'), true, false)) + "/></li><li class=\"description\"><label>Description</label><input type=\"text\" name=\"annotationType.strike.description\"" + (jade.attr("value", model.get('annotationType.strike.description'), true, false)) + "/></li><li><button name=\"submit\" class=\"disabled\">Save settings<i class=\"fa fa-spinner fa-spin\"></i></button></li></ul></fieldset>");}.call(this,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined));;return buf.join("");
};
},{"jade/runtime":36}],106:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<div class=\"entry-list\"><h3>Add / remove entry metadata fields</h3></div><div class=\"set-names\"></div><div class=\"sort-levels\"></div>");;return buf.join("");
};
},{"jade/runtime":36}],107:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (model) {
buf.push("<fieldset class=\"span100\"><h3>Set entry names</h3><ul" + (jade.attr("data-model-id", model.cid, true, false)) + "><li><label>Singular</label><input type=\"text\" name=\"entry.term_singular\"" + (jade.attr("value", model.get('entry.term_singular'), true, false)) + " placeholder=\"entry\"/></li><li><label>Plural</label><input type=\"text\" name=\"entry.term_plural\"" + (jade.attr("value", model.get('entry.term_plural'), true, false)) + " placeholder=\"entries\"/></li><li><button name=\"submit\" class=\"disabled\">Save settings<i class=\"fa fa-spinner fa-spin\"></i></button></li></ul></fieldset>");}.call(this,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined));;return buf.join("");
};
},{"jade/runtime":36}],108:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (entrymetadatafields, level1, level2, level3, undefined) {
buf.push("<h3>Sort levels</h3><form><ul><li><label>Level 1</label><select name=\"level1\"><option></option>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level1, true, false)) + ">" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level1, true, false)) + ">" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li><li><label>Level 2</label><select name=\"level2\"><option></option>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level2, true, false)) + ">" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level2, true, false)) + ">" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li><li><label>Level 3</label><select name=\"level3\"><option></option>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level3, true, false)) + ">" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level3, true, false)) + ">" + (jade.escape(null == (jade_interp = field) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li><li><button class=\"simple savesortlevels inactive\">Save sort levels<i class=\"fa fa-spinner fa-spin\"></i></button></li></ul></form>");}.call(this,"entrymetadatafields" in locals_for_with?locals_for_with.entrymetadatafields:typeof entrymetadatafields!=="undefined"?entrymetadatafields:undefined,"level1" in locals_for_with?locals_for_with.level1:typeof level1!=="undefined"?level1:undefined,"level2" in locals_for_with?locals_for_with.level2:typeof level2!=="undefined"?level2:undefined,"level3" in locals_for_with?locals_for_with.level3:typeof level3!=="undefined"?level3:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":36}],109:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (projectMembers, sel, settings, src, undefined) {
buf.push("<div class=\"general\"><h3>General</h3><form><ul><li><label for=\"type\">Type</label><select name=\"projectType\" data-attr=\"projectType\"><option value=\"collection\"" + (jade.attr("selected", settings['projectType']==='collection', true, false)) + ">Collection</option><option value=\"work\"" + (jade.attr("selected", settings['projectType']==='work', true, false)) + ">Work</option></select></li><li><label for=\"title\">Project title</label><input type=\"text\" name=\"title\"" + (jade.attr("value", settings['Project title'], true, false)) + " data-attr=\"Project title\"/></li><li><label for=\"title\">Project name</label><input type=\"text\" name=\"name\"" + (jade.attr("value", settings['name'], true, false)) + " data-attr=\"name\"/></li><li><label for=\"leader\">Project leader</label><select name=\"leader\" data-attr=\"Project leader\"><option>-- select member --</option>");
// iterate projectMembers.models
;(function(){
  var $$obj = projectMembers.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var member = $$obj[$index];

sel = member.id === +settings['Project leader']
buf.push("<option" + (jade.attr("value", member.id, true, false)) + (jade.attr("selected", sel, true, false)) + ">" + (jade.escape(null == (jade_interp = member.get('title')) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var member = $$obj[$index];

sel = member.id === +settings['Project leader']
buf.push("<option" + (jade.attr("value", member.id, true, false)) + (jade.attr("selected", sel, true, false)) + ">" + (jade.escape(null == (jade_interp = member.get('title')) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li><li><label for=\"start\">Start date</label><input type=\"text\" name=\"start\"" + (jade.attr("value", settings['Start date'], true, false)) + " data-attr=\"Start date\"/></li><li><label for=\"release\">Release date</label><input type=\"text\" name=\"release\"" + (jade.attr("value", settings['Release date'], true, false)) + " data-attr=\"Release date\"/></li><li><label for=\"version\">Version</label><input type=\"text\" name=\"version\"" + (jade.attr("value", settings.Version, true, false)) + " data-attr=\"Version\"/></li><li style=\"margin-top: 20px\"><input type=\"submit\" name=\"savesettings\" value=\"Save settings\" class=\"inactive\"/></li></ul></form></div><div class=\"publication\"><h3>Publication</h3><form><ul>");
if ( settings.publicationURL.length > 0)
{
buf.push("<li><label>URL</label><a" + (jade.attr("href", settings.publicationURL, true, false)) + " data-bypass=\"data-bypass\" target=\"_blank\">link</a></li>");
}
buf.push("<li><label>Title</label><input type=\"text\"" + (jade.attr("value", settings['publication.title'], true, false)) + " name=\"publication.title\" data-attr=\"publication.title\"/></li><li><label for=\"text.font\">Font</label><select name=\"text.font\" data-attr=\"text.font\"><option></option><option value=\"junicode\"" + (jade.attr("selected", settings['text.font']=='junicode', true, false)) + ">Junicode</option><option value=\"dejavu\"" + (jade.attr("selected", settings['text.font']=='dejavu', true, false)) + ">DejaVu</option><option value=\"gentium\"" + (jade.attr("selected", settings['text.font']=='gentium', true, false)) + ">Gentium</option><option value=\"alexander\"" + (jade.attr("selected", settings['text.font']=='alexander', true, false)) + ">Alexander</option><option value=\"newathena\"" + (jade.attr("selected", settings['text.font']=='newathena', true, false)) + ">New Athena</option></select></li>");
src = settings['text.font'] === '' ? settings['text.font'] : '/images/fonts/'+settings['text.font']+'.png'
buf.push("<li><label></label><img name=\"text.font\"" + (jade.attr("src", src, true, false)) + "/></li></ul></form></div>");}.call(this,"projectMembers" in locals_for_with?locals_for_with.projectMembers:typeof projectMembers!=="undefined"?projectMembers:undefined,"sel" in locals_for_with?locals_for_with.sel:typeof sel!=="undefined"?sel:undefined,"settings" in locals_for_with?locals_for_with.settings:typeof settings!=="undefined"?settings:undefined,"src" in locals_for_with?locals_for_with.src:typeof src!=="undefined"?src:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":36}],110:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (console, model, projectMembers, sel, src, undefined) {
console.log(model)
buf.push("<fieldset class=\"span50\"><h3>General</h3><ul" + (jade.attr("data-model-id", model.cid, true, false)) + "><li><label for=\"projectType\">Type</label><span>" + (jade.escape(null == (jade_interp = model.get('projectType')) ? "" : jade_interp)) + "</span></li><li><label for=\"Project title\">Project title</label><input type=\"text\" name=\"Project title\"" + (jade.attr("value", model.get('Project title'), true, false)) + "/></li><li><label for=\"name\">Project name</label><input type=\"text\" name=\"name\"" + (jade.attr("value", model.get('name'), true, false)) + "/></li><li><label for=\"Project leader\">Project leader</label><select name=\"Project leader\"><option>-- select member --</option>");
// iterate projectMembers.models
;(function(){
  var $$obj = projectMembers.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var member = $$obj[$index];

sel = member.id === +model.get('Project leader')
buf.push("<option" + (jade.attr("value", member.id, true, false)) + (jade.attr("selected", sel, true, false)) + ">" + (jade.escape(null == (jade_interp = member.get('title')) ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var member = $$obj[$index];

sel = member.id === +model.get('Project leader')
buf.push("<option" + (jade.attr("value", member.id, true, false)) + (jade.attr("selected", sel, true, false)) + ">" + (jade.escape(null == (jade_interp = member.get('title')) ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li><li><label for=\"Start date\">Start date</label><input type=\"text\" name=\"Start date\"" + (jade.attr("value", model.get('Start date'), true, false)) + "/></li><li><label for=\"Release date\">Release date</label><input type=\"text\" name=\"Release date\"" + (jade.attr("value", model.get('Release date'), true, false)) + "/></li><li><label for=\"Version\">Version</label><input type=\"text\" name=\"Version\"" + (jade.attr("value", model.get('Version'), true, false)) + "/></li><li><label for=\"wordwrap\">Word wrap</label><input type=\"checkbox\" name=\"wordwrap\"" + (jade.attr("checked", model.get('wordwrap'), true, false)) + "/></li><li><label for=\"results-per-page\">Results per page</label><select name=\"results-per-page\">");
// iterate [10, 25, 50, 100, 250, 500, 1000]
;(function(){
  var $$obj = [10, 25, 50, 100, 250, 500, 1000];
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var count = $$obj[$index];

buf.push("<option" + (jade.attr("value", count, true, false)) + (jade.attr("selected", count===model.get('results-per-page'), true, false)) + ">" + (jade.escape(null == (jade_interp = count + " results") ? "" : jade_interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var count = $$obj[$index];

buf.push("<option" + (jade.attr("value", count, true, false)) + (jade.attr("selected", count===model.get('results-per-page'), true, false)) + ">" + (jade.escape(null == (jade_interp = count + " results") ? "" : jade_interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li>");
if ( (model.get("projectType") === "mvn"))
{
buf.push("<li><h3 style=\"margin-top: 30px\">MVN</h3><label for=\"mvn.placeName\">Place name</label><input type=\"text\" name=\"mvn.placeName\"" + (jade.attr("value", model.get('mvn.placeName'), true, false)) + "/></li><li><label for=\"mvn.institution\">Institution</label><input type=\"text\" name=\"mvn.institution\"" + (jade.attr("value", model.get('mvn.institution'), true, false)) + "/></li><li><label for=\"mvn.idno\">ID number</label><input type=\"text\" name=\"mvn.idno\"" + (jade.attr("value", model.get('mvn.idno'), true, false)) + "/></li>");
}
buf.push("</ul></fieldset><fieldset class=\"span50\"><h3>Publication</h3><ul" + (jade.attr("data-model-id", model.cid, true, false)) + ">");
if ( model.get('publicationURL').length > 0)
{
buf.push("<li><label>URL</label><a" + (jade.attr("href", model.get('publicationURL'), true, false)) + " data-bypass=\"data-bypass\" target=\"_blank\">link</a></li>");
}
buf.push("<li><label>Title</label><input type=\"text\"" + (jade.attr("value", model.get('publication.title'), true, false)) + " name=\"publication.title\"/></li><li><label for=\"text.font\">Font</label><select name=\"text.font\"><option></option><option value=\"junicode\"" + (jade.attr("selected", model.get('text.font')=='junicode', true, false)) + ">Junicode</option><option value=\"dejavu\"" + (jade.attr("selected", model.get('text.font')=='dejavu', true, false)) + ">DejaVu</option><option value=\"gentium\"" + (jade.attr("selected", model.get('text.font')=='gentium', true, false)) + ">Gentium</option><option value=\"alexander\"" + (jade.attr("selected", model.get('text.font')=='alexander', true, false)) + ">Alexander</option><option value=\"newathena\"" + (jade.attr("selected", model.get('text.font')=='newathena', true, false)) + ">New Athena</option></select></li>");
src = model.get('text.font') === '' ? model.get('text.font') : '/images/fonts/'+model.get('text.font')+'.png'
buf.push("<li><label></label><img name=\"text.font\"" + (jade.attr("src", src, true, false)) + " width=\"140px\" height=\"140px\"/></li></ul></fieldset><button name=\"submit\" class=\"disabled\">Save settings<i class=\"fa fa-spinner fa-spin\"></i></button>");}.call(this,"console" in locals_for_with?locals_for_with.console:typeof console!=="undefined"?console:undefined,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined,"projectMembers" in locals_for_with?locals_for_with.projectMembers:typeof projectMembers!=="undefined"?projectMembers:undefined,"sel" in locals_for_with?locals_for_with.sel:typeof sel!=="undefined"?sel:undefined,"src" in locals_for_with?locals_for_with.src:typeof src!=="undefined"?src:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":36}],111:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (roleNo) {
buf.push("<div class=\"padl5 padr5\"><h2>Settings</h2>");
if ( roleNo >= 30)
{
buf.push("<ul class=\"horizontal tab menu\"><li data-tab=\"general\" class=\"active\">General</li><li data-tab=\"users\">Users</li><li data-tab=\"entries\">Entries</li><li data-tab=\"textlayers\">Text layers</li><li data-tab=\"annotations\">Annotations</li></ul><div data-tab=\"general\" class=\"active\"></div><div data-tab=\"textlayers\"></div><div data-tab=\"entries\"></div><div data-tab=\"annotations\"><div class=\"annotation-type-list\"><h3>Add / remove annotation types</h3></div><div class=\"add-annotation-type\"></div><div class=\"set-custom-tag-names\"></div></div><div data-tab=\"users\"></div>");
}
else
{
buf.push("<p>You are not authorized to alter project settings. Please contact the project leader.</p>");
}
buf.push("</div>");}.call(this,"roleNo" in locals_for_with?locals_for_with.roleNo:typeof roleNo!=="undefined"?roleNo:undefined));;return buf.join("");
};
},{"jade/runtime":36}],112:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<h3>Add / remove text layers</h3>");;return buf.join("");
};
},{"jade/runtime":36}],113:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (model, roleNo) {
buf.push("<fieldset class=\"span100\"><h3>Add user to project</h3><ul" + (jade.attr("data-model-id", model.cid, true, false)) + "><li><label for=\"username\">Username *</label><input type=\"text\" name=\"username\"/></li><li><label for=\"email\">E-mail *</label><input type=\"text\" name=\"email\"/></li><li><label for=\"firstName\">First name</label><input type=\"text\" name=\"firstName\"/></li><li><label for=\"lastName\">Last name</label><input type=\"text\" name=\"lastName\"/></li><li><label for=\"password\">Password *</label><input type=\"password\" name=\"password\"/></li><li><label for=\"role\">Role</label><select name=\"role\"><option value=\"USER\">USER</option><option value=\"READER\">READER</option>");
if ( roleNo >= 40)
{
buf.push("<option value=\"PROJECTLEADER\">PROJECTLEADER</option>");
}
buf.push("</select></li><li><button name=\"submit\" class=\"disabled\">Add user<i class=\"fa fa-spinner fa-spin\"></i></button></li></ul></fieldset>");}.call(this,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined,"roleNo" in locals_for_with?locals_for_with.roleNo:typeof roleNo!=="undefined"?roleNo:undefined));;return buf.join("");
};
},{"jade/runtime":36}],114:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<div class=\"listandroles\"><div class=\"userlist\"><h3>Add / remove project members</h3></div><div class=\"userroles\"><h3>Change user roles</h3><ul></ul></div></div><div class=\"adduser\"></div>");;return buf.join("");
};
},{"jade/runtime":36}],115:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (members, undefined) {
// iterate members.models
;(function(){
  var $$obj = members.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var member = $$obj[$index];

var role = member.get('role');
if ( role == 'USER' || role == 'READER')
{
buf.push("<li><select" + (jade.attr("data-id", member.id, true, false)) + "><option" + (jade.attr("selected", role=='READER', true, false)) + ">READER</option><option" + (jade.attr("selected", role=='USER', true, false)) + ">USER</option></select><label>" + (jade.escape(null == (jade_interp = member.get('title')) ? "" : jade_interp)) + "</label></li>");
}
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var member = $$obj[$index];

var role = member.get('role');
if ( role == 'USER' || role == 'READER')
{
buf.push("<li><select" + (jade.attr("data-id", member.id, true, false)) + "><option" + (jade.attr("selected", role=='READER', true, false)) + ">READER</option><option" + (jade.attr("selected", role=='USER', true, false)) + ">USER</option></select><label>" + (jade.escape(null == (jade_interp = member.get('title')) ? "" : jade_interp)) + "</label></li>");
}
    }

  }
}).call(this);
}.call(this,"members" in locals_for_with?locals_for_with.members:typeof members!=="undefined"?members:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":36}],116:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (statistics) {
buf.push("<h2>Statistics</h2><div class=\"statistics\"><pre>" + (jade.escape(null == (jade_interp = statistics) ? "" : jade_interp)) + "</pre></div>");}.call(this,"statistics" in locals_for_with?locals_for_with.statistics:typeof statistics!=="undefined"?statistics:undefined));;return buf.join("");
};
},{"jade/runtime":36}],117:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (model) {
buf.push("<fieldset class=\"span100\"><ul" + (jade.attr("data-model-id", model.cid, true, false)) + "><li class=\"message error\"></li><li class=\"input\"><label>Enter your email address:</label><input type=\"text\" name=\"email\"/></li><li class=\"submit\"><button name=\"cancel\">Cancel</button><span>or</span><button name=\"submit\" class=\"disabled\">Reset my password<i class=\"fa fa-spinner fa-spin\"></i></button></li></ul></fieldset>");}.call(this,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined));;return buf.join("");
};
},{"jade/runtime":36}],118:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (model) {
buf.push("<fieldset class=\"span100\"><p>Your password has been changed. Please continue to <a name=\"login\" href=\"login\">login.</a></p><ul" + (jade.attr("data-model-id", model.cid, true, false)) + "><li><label>Enter new password</label><input type=\"password\" name=\"password1\"/></li><li><label>Re-enter new password</label><input type=\"password\" name=\"password2\"/></li><li><button name=\"submit\" class=\"disabled\">Update password<i class=\"fa fa-spinner fa-spin\"></i></button></li></ul></fieldset>");}.call(this,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined));;return buf.join("");
};
},{"jade/runtime":36}],119:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (plural, projects, undefined, user) {
buf.push("<div class=\"left\"><img src=\"/images/logo.elaborate.png\"/><ul class=\"horizontal menu\"><li class=\"thisproject arrowdown\"> <span class=\"projecttitle\">" + (jade.escape(null == (jade_interp = projects.current.get('title')) ? "" : jade_interp)) + "</span><ul class=\"vertical menu\"><li class=\"search\">" + (jade.escape(null == (jade_interp = plural + ' overview') ? "" : jade_interp)) + "</li>");
if ( user.get('roleNo') >= 30)
{
buf.push("<li class=\"settings\">Settings</li>");
}
buf.push("<li class=\"statistics\">Statistics</li><li class=\"history\">History</li></ul></li></ul></div><div class=\"middle\"><span class=\"message\"></span></div><div class=\"right\"><ul class=\"horizontal menu\"><li> <a href=\"http://elaborate.huygens.knaw.nl/wp-content/bestanden/2012/12/Handleiding-Elaborate-4.pdf\" target=\"_blank\" data-bypass=\"data-bypass\">Help</a></li><li class=\"username arrowdown\">" + (jade.escape(null == (jade_interp = user.get('title')) ? "" : jade_interp)) + "<ul class=\"vertical menu\"><li class=\"projects arrowleft\">" + (jade.escape(null == (jade_interp = 'My projects (' + projects.length + ')') ? "" : jade_interp)) + "<ul class=\"vertical menu\">");
// iterate projects.models
;(function(){
  var $$obj = projects.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var project = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", project.id, true, false)) + (jade.cls(['project',projects.current==project?'active':''], [null,true])) + ">" + (jade.escape(null == (jade_interp = project.get('title')) ? "" : jade_interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var project = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", project.id, true, false)) + (jade.cls(['project',projects.current==project?'active':''], [null,true])) + ">" + (jade.escape(null == (jade_interp = project.get('title')) ? "" : jade_interp)) + "</li>");
    }

  }
}).call(this);

buf.push("</ul></li>");
if ( user.get('roleNo') >= 40)
{
buf.push("<li class=\"addproject\">Add project</li>");
}
buf.push("<li class=\"logout\">Logout</li></ul></li></ul><img src=\"/images/logo.huygens.png\"/></div>");}.call(this,"plural" in locals_for_with?locals_for_with.plural:typeof plural!=="undefined"?plural:undefined,"projects" in locals_for_with?locals_for_with.projects:typeof projects!=="undefined"?projects:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined,"user" in locals_for_with?locals_for_with.user:typeof user!=="undefined"?user:undefined));;return buf.join("");
};
},{"jade/runtime":36}],120:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (interactive, user) {
buf.push("<ul" + (jade.attr("style", interactive?'visibility:visible':'visibility:hidden', true, false)) + " class=\"horizontal menu left\">");
if ( user.get('roleNo') >= 20)
{
buf.push("<li class=\"edit\"><img src=\"/images/icon.edit.png\" title=\"Edit annotation\"/></li><li class=\"delete\"><img src=\"/images/icon.bin.png\" title=\"Delete annotation\"/></li>");
}
buf.push("</ul><div class=\"annotation-type\"></div><ul class=\"horizontal menu right\"><li class=\"close\"><img src=\"/images/icon.close.png\" title=\"Close annotation\"/></li></ul><div class=\"tooltip-body\"></div>");}.call(this,"interactive" in locals_for_with?locals_for_with.interactive:typeof interactive!=="undefined"?interactive:undefined,"user" in locals_for_with?locals_for_with.user:typeof user!=="undefined"?user:undefined));;return buf.join("");
};
},{"jade/runtime":36}]},{},[51])
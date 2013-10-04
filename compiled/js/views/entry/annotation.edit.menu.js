(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var AnnotationEditMenu, Fn, Tpl, Views, config, _ref;
    Fn = require('hilib/functions/general');
    config = require('config');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/annotation.edit.menu.html');
    return AnnotationEditMenu = (function(_super) {
      __extends(AnnotationEditMenu, _super);

      function AnnotationEditMenu() {
        _ref = AnnotationEditMenu.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AnnotationEditMenu.prototype.className = 'annotationeditmenu';

      AnnotationEditMenu.prototype.initialize = function() {
        AnnotationEditMenu.__super__.initialize.apply(this, arguments);
        this.addListeners();
        return this.render();
      };

      AnnotationEditMenu.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Tpl, this.model.toJSON());
        this.$el.html(rtpl);
        return this;
      };

      AnnotationEditMenu.prototype.events = function() {
        var _this = this;
        return {
          'click button.ok': 'save',
          'click button.cancel': function() {
            return _this.trigger('cancel', _this.model);
          },
          'click button.metadata': function() {
            return _this.trigger('metadata', _this.model);
          }
        };
      };

      AnnotationEditMenu.prototype.save = function() {
        var _this = this;
        if (this.model.isNew()) {
          this.model.urlRoot = function() {
            return config.baseUrl + ("projects/" + _this.collection.projectId + "/entries/" + _this.collection.entryId + "/transcriptions/" + _this.collection.transcriptionId + "/annotations");
          };
          return this.model.save([], {
            success: function() {
              return _this.collection.add(_this.model);
            },
            error: function(model, xhr, options) {
              return console.error('Saving annotation failed!', model, xhr, options);
            }
          });
        } else {
          return this.model.save();
        }
      };

      AnnotationEditMenu.prototype.setModel = function(annotation) {
        this.model = annotation;
        return this.addListeners();
      };

      AnnotationEditMenu.prototype.addListeners = function() {
        var _this = this;
        this.listenTo(this.model, 'sync', function(model, resp, options) {
          return _this.el.querySelector('button.ok').disabled = true;
        });
        return this.listenTo(this.model, 'change:body', function() {
          return _this.el.querySelector('button.ok').disabled = false;
        });
      };

      return AnnotationEditMenu;

    })(Views.Base);
  });

}).call(this);

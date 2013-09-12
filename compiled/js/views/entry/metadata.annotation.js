(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var AnnotationMetadata, Fn, Tpl, Views, _ref;
    Fn = require('helpers2/general');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/metadata.annotation.html');
    return AnnotationMetadata = (function(_super) {
      __extends(AnnotationMetadata, _super);

      function AnnotationMetadata() {
        _ref = AnnotationMetadata.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AnnotationMetadata.prototype.initialize = function() {
        AnnotationMetadata.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      AnnotationMetadata.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Tpl, {
          collection: this.collection.toJSON()
        });
        this.$el.html(rtpl);
        return this;
      };

      AnnotationMetadata.prototype.events = function() {};

      return AnnotationMetadata;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var AnnotationMetadata, Fn, Tpl, Views, _ref;
    Fn = require('helpers/general');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/annotation.metadata.html');
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
        console.log(this.model, this.collection.toJSON());
        rtpl = _.template(Tpl, {
          model: this.model,
          collection: this.collection
        });
        this.$el.html(rtpl);
        return this;
      };

      AnnotationMetadata.prototype.events = function() {
        return {
          'change select': 'selectChanged'
        };
      };

      AnnotationMetadata.prototype.selectChanged = function(ev) {
        var annotationTypeID;
        annotationTypeID = ev.currentTarget.options[ev.currentTarget.selectedIndex].getAttribute('data-id');
        this.model.set('annotationType', this.collection.get(annotationTypeID));
        return console.log(this.model);
      };

      return AnnotationMetadata;

    })(Views.Base);
  });

}).call(this);

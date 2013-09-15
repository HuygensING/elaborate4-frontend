(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Async, Entry, Fn, Models, Templates, Views, _ref;
    Fn = require('helpers/general');
    require('helpers/jquery.mixin');
    Async = require('managers/async');
    Models = {
      state: require('models/state'),
      Entry: require('models/entry')
    };
    Views = {
      Base: require('views/base'),
      SubMenu: require('views/ui/entry.submenu'),
      Preview: require('views/entry/preview'),
      SuperTinyEditor: require('views2/supertinyeditor/supertinyeditor'),
      AnnotationMetadata: require('views/entry/metadata.annotation')
    };
    Templates = {
      Entry: require('text!html/entry/main.html')
    };
    return Entry = (function(_super) {
      __extends(Entry, _super);

      function Entry() {
        _ref = Entry.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Entry.prototype.className = 'entry';

      Entry.prototype.initialize = function() {
        var async,
          _this = this;
        Entry.__super__.initialize.apply(this, arguments);
        async = new Async(['transcriptions', 'facsimiles', 'settings', 'annotationtypes']);
        this.listenToOnce(async, 'ready', function() {
          return _this.render();
        });
        return Models.state.getCurrentProject(function(project) {
          _this.project = project;
          project.get('entries').fetch({
            success: function(collection, response, options) {
              _this.model = collection.setCurrent(_this.options.entryId);
              _this.model.get('transcriptions').fetch({
                success: function(collection, response, options) {
                  _this.currentTranscription = collection.setCurrent();
                  return async.called('transcriptions');
                }
              });
              _this.model.get('facsimiles').fetch({
                success: function(collection, response, options) {
                  _this.currentFacsimile = collection.setCurrent();
                  return async.called('facsimiles');
                }
              });
              return _this.model.get('settings').fetch({
                success: function() {
                  return async.called('settings');
                }
              });
            }
          });
          return project.get('annotationtypes').fetch({
            success: function() {
              return async.called('annotationtypes');
            }
          });
        });
      };

      Entry.prototype.render = function() {
        var rtpl,
          _this = this;
        rtpl = _.template(Templates.Entry, this.model.attributes);
        this.$el.html(rtpl);
        this.renderFacsimile();
        this.renderTranscription();
        this.listenTo(this.preview, 'addAnnotation', this.renderAnnotation);
        this.listenTo(this.preview, 'editAnnotation', this.renderAnnotation);
        this.listenTo(this.preview, 'scrolled', function(percentage) {
          return _this.transcriptionEdit.setScrollPercentage(percentage, 'horizontal');
        });
        this.listenTo(this.preview, 'newAnnotationRemoved', this.renderTranscription);
        this.listenTo(this.transcriptionEdit, 'scrolled', function(percentage) {
          return Fn.setScrollPercentage(_this.preview.el, percentage, 'horizontal');
        });
        this.listenTo(this.transcriptionEdit, 'change', function(cmd, doc) {
          return _this.currentTranscription.set('body', doc);
        });
        this.listenTo(this.model.get('facsimiles'), 'current:change', function(current) {
          _this.currentFacsimile = current;
          return _this.renderFacsimile();
        });
        return this.listenTo(this.model.get('transcriptions'), 'current:change', function(current) {
          _this.currentTranscription = current;
          return _this.renderTranscription(current);
        });
      };

      Entry.prototype.renderFacsimile = function() {
        var url;
        if (this.model.get('facsimiles').length) {
          url = this.model.get('facsimiles').current.get('zoomableUrl');
          return this.$('.left iframe').attr('src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.0/viewer.html?rft_id=' + url);
        }
      };

      Entry.prototype.renderTranscription = function(model) {
        var currentTranscription, el, li, text, textLayer, textLayerNode;
        this.renderPreview();
        if (this.transcriptionEdit != null) {
          if (model != null) {
            this.transcriptionEdit.setModel(model);
          }
        } else {
          textLayer = this.model.get('transcriptions').current.get('textLayer');
          textLayerNode = document.createTextNode(textLayer + ' layer');
          li = this.el.querySelector('.submenu li[data-key="layer"]');
          li.replaceChild(textLayerNode, li.firstChild);
          currentTranscription = this.model.get('transcriptions').current;
          text = currentTranscription.get('body');
          el = this.$('.container .middle .transcription');
          this.transcriptionEdit = new Views.SuperTinyEditor({
            model: this.model.get('transcriptions').current,
            htmlAttribute: 'body',
            el: el,
            controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'n', 'outdent', 'indent', '|', 'unformat', '|', 'undo', 'redo'],
            cssFile: '/css/main.css',
            html: text,
            height: this.preview.$el.innerHeight(),
            width: el.width() - 20
          });
        }
        return this.toggleEditPane('transcription');
      };

      Entry.prototype.renderAnnotation = function(model) {
        if (this.annotationEdit != null) {
          if (model != null) {
            this.annotationEdit.setModel(model);
          }
        } else {
          if (model == null) {
            console.error('No annotation given as argument!');
          }
          this.annotationEdit = new Views.SuperTinyEditor({
            model: model,
            htmlAttribute: 'body',
            el: this.el.querySelector('.container .middle .annotation'),
            controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'n', 'outdent', 'indent', '|', 'unformat', '|', 'undo', 'redo'],
            cssFile: '/css/main.css',
            html: model.get('body'),
            wrap: true
          });
        }
        return this.toggleEditPane('annotation');
      };

      Entry.prototype.renderPreview = function() {
        return this.preview = new Views.Preview({
          model: this.model,
          el: this.$('.container .right')
        });
      };

      Entry.prototype.events = function() {
        return {
          'click .menu li[data-key="previous"]': 'previousEntry',
          'click .menu li[data-key="next"]': 'nextEntry',
          'click .menu li[data-key="facsimile"]': 'changeFacsimile',
          'click .menu li[data-key="transcription"]': 'changeTranscription',
          'click .menu li[data-key="save"]': 'save',
          'click .menu li[data-key="metadata"]': 'metadata'
        };
      };

      Entry.prototype.previousEntry = function() {
        return this.model.collection.previous();
      };

      Entry.prototype.nextEntry = function() {
        return this.model.collection.next();
      };

      Entry.prototype.changeFacsimile = function(ev) {
        var facsimileID, model;
        facsimileID = ev.currentTarget.getAttribute('data-value');
        model = this.model.get('facsimiles').get(facsimileID);
        if (model != null) {
          return this.model.get('facsimiles').setCurrent(model);
        }
      };

      Entry.prototype.changeTranscription = function(ev) {
        var model, transcriptionID;
        transcriptionID = ev.currentTarget.getAttribute('data-value');
        model = this.model.get('transcriptions').get(transcriptionID);
        return this.model.get('transcriptions').setCurrent(model);
      };

      Entry.prototype.save = function(ev) {
        var annotations,
          _this = this;
        if ((this.annotationEdit != null) && this.annotationEdit.$el.is(':visible')) {
          annotations = this.model.get('transcriptions').current.get('annotations');
          return annotations.create(this.annotationEdit.model.attributes, {
            wait: true,
            success: function() {
              return _this.renderTranscription();
            }
          });
        }
      };

      Entry.prototype.metadata = function(ev) {
        if ((this.annotationEdit != null) && this.annotationEdit.$el.is(':visible')) {
          this.annotationMetadata = new Views.AnnotationMetadata({
            model: this.annotationEdit.model,
            collection: this.project.get('annotationtypes'),
            el: this.el.querySelector('.container .middle .annotationmetadata')
          });
          return this.toggleEditPane('annotationmetadata');
        }
      };

      Entry.prototype.toggleEditPane = function(viewName) {
        var view;
        view = (function() {
          switch (viewName) {
            case 'transcription':
              return this.transcriptionEdit;
            case 'annotation':
              return this.annotationEdit;
            case 'annotationmetadata':
              return this.annotationMetadata;
          }
        }).call(this);
        if (viewName === 'annotationmetadata') {
          viewName = 'am';
        }
        this.$('.submenu [data-key="save"]').html('Save ' + viewName);
        view.$el.siblings().hide();
        return view.$el.show();
      };

      return Entry;

    })(Views.Base);
  });

}).call(this);

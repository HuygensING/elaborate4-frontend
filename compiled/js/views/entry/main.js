(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Async, Entry, Fn, Models, Templates, Views, _ref;
    Fn = require('helpers2/general');
    require('helpers2/jquery.mixin');
    Async = require('managers/async');
    Models = {
      state: require('models/state'),
      Entry: require('models/entry')
    };
    Views = {
      Base: require('views/base'),
      SubMenu: require('views/ui/entry.submenu'),
      Preview: require('views/entry/preview'),
      SuperTinyEditor: require('views2/supertinyeditor/supertinyeditor')
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
        var _this = this;
        Entry.__super__.initialize.apply(this, arguments);
        return Models.state.getCurrentProject(function(project) {
          _this.project = project;
          return project.get('entries').fetch({
            success: function(collection, response, options) {
              var async;
              _this.model = collection.get(_this.options.entryId);
              collection.setCurrentEntry(_this.model);
              async = new Async(['transcriptions', 'facsimiles', 'settings']);
              _this.model.get('transcriptions').fetch({
                success: function(collection, response, options) {
                  collection.setCurrent();
                  return async.called('transcriptions');
                }
              });
              _this.model.get('facsimiles').fetch({
                success: function(collection, response, options) {
                  collection.setCurrentFacsimile();
                  return async.called('facsimiles');
                }
              });
              _this.model.get('settings').fetch({
                success: function() {
                  return async.called('settings');
                }
              });
              return _this.listenToOnce(async, 'ready', function() {
                return _this.render();
              });
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
        this.renderPreview();
        this.renderTranscription();
        this.listenTo(this.preview, 'addAnnotation', this.renderAnnotation);
        this.listenTo(this.preview, 'editAnnotation', this.renderAnnotation);
        this.listenTo(this.preview, 'scrolled', function(percentage) {
          return _this.transcriptionEdit.setScrollPercentage(percentage, 'horizontal');
        });
        this.listenTo(this.transcriptionEdit, 'scrolled', function(percentage) {
          return Fn.setScrollPercentage(_this.preview.el, percentage, 'horizontal');
        });
        this.listenTo(this.transcriptionEdit, 'change', function(cmd, doc) {
          return currentTranscription.set('body', doc);
        });
        this.listenTo(this.model.get('facsimiles'), 'currentFacsimile:change', this.renderFacsimile);
        return this.listenTo(this.model.get('transcriptions'), 'current:change', function() {
          return _this.renderTranscription();
        });
      };

      Entry.prototype.renderFacsimile = function() {
        var url;
        if (this.model.get('facsimiles').length) {
          url = this.model.get('facsimiles').currentFacsimile.get('zoomableUrl');
          return this.$('.left iframe').attr('src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.0/viewer.html?rft_id=' + url);
        }
      };

      Entry.prototype.renderTranscription = function() {
        var currentTranscription, el, li, showTranscriptionEdit, text, textLayer, textLayerNode,
          _this = this;
        showTranscriptionEdit = function() {
          _this.transcriptionEdit.$el.siblings().hide();
          return _this.transcriptionEdit.$el.show();
        };
        if (this.transcriptionEdit != null) {
          showTranscriptionEdit();
          return console.log('tran exists');
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
          return showTranscriptionEdit();
        }
      };

      Entry.prototype.renderAnnotation = function(model) {
        var showAnnotationEdit,
          _this = this;
        if (model == null) {
          console.error('No model given!');
        }
        showAnnotationEdit = function() {
          _this.annotationEdit.$el.siblings().hide();
          return _this.annotationEdit.$el.show();
        };
        if (this.annotationEdit != null) {
          showAnnotationEdit();
          return this.annotationEdit.setModel(model);
        } else {
          this.annotationEdit = new Views.SuperTinyEditor({
            model: model,
            htmlAttribute: 'body',
            el: this.el.querySelector('.container .middle .annotation'),
            controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'n', 'outdent', 'indent', '|', 'unformat', '|', 'undo', 'redo'],
            cssFile: '/css/main.css',
            html: model.get('body'),
            wrap: true
          });
          return showAnnotationEdit();
        }
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
          'click .menu li[data-key="save"]': 'save'
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
          return this.model.get('facsimiles').setCurrentFacsimile(model);
        }
      };

      Entry.prototype.changeTranscription = function(ev) {
        var model, transcriptionID;
        transcriptionID = ev.currentTarget.getAttribute('data-value');
        model = this.model.get('transcriptions').get(transcriptionID);
        return this.model.get('transcriptions').setCurrent(model);
      };

      Entry.prototype.save = function(ev) {
        if ((this.annotationEdit != null) && this.annotationEdit.$el.is(':visible')) {
          return this.model.get('transcriptions').current.get('annotations').create(this.annotationEdit.model.attributes);
        }
      };

      return Entry;

    })(Views.Base);
  });

}).call(this);

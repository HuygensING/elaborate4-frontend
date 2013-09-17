(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Async, Backbone, Entry, Fn, Models, StringFn, Templates, Views, _ref;
    Backbone = require('backbone');
    Fn = require('helpers2/general');
    StringFn = require('helpers2/string');
    require('helpers/jquery.mixin');
    Async = require('managers2/async');
    Models = {
      state: require('models/state'),
      Entry: require('models/entry')
    };
    Views = {
      Base: require('views/base'),
      SubMenu: require('views/ui/entry.submenu'),
      Preview: require('views/entry/preview'),
      SuperTinyEditor: require('views2/supertinyeditor/supertinyeditor'),
      AnnotationMetadata: require('views/entry/metadata.annotation'),
      EditTextlayers: require('views/entry/textlayers.edit')
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
        this.subviews = {};
        async = new Async(['transcriptions', 'facsimiles', 'settings', 'annotationtypes', 'entrymetadatafields']);
        this.listenToOnce(async, 'ready', function() {
          _this.render();
          return _this.addListeners();
        });
        return Models.state.getCurrentProject(function(project) {
          _this.project = project;
          project.get('entries').fetch({
            success: function(collection, response, options) {
              _this.model = collection.setCurrent(_this.options.entryId);
              _this.model.get('transcriptions').fetch({
                success: function(collection, response, options) {
                  var model;
                  model = collection.find(function(model) {
                    if (_this.options.transcriptionName != null) {
                      return model.get('textLayer').toLowerCase() === _this.options.transcriptionName.toLowerCase();
                    }
                  });
                  _this.currentTranscription = collection.setCurrent(model);
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
          project.get('annotationtypes').fetch({
            success: function() {
              return async.called('annotationtypes');
            }
          });
          return project.fetchEntrymetadatafields(function() {
            return async.called('entrymetadatafields');
          });
        });
      };

      Entry.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Entry, this.model.toJSON());
        this.$el.html(rtpl);
        this.navigateToTextLayer();
        this.changeTextlayerInMenu();
        this.renderFacsimile();
        this.renderTranscription();
        return this.renderSubsubmenu();
      };

      Entry.prototype.renderFacsimile = function() {
        var url;
        if (this.model.get('facsimiles').length) {
          url = this.model.get('facsimiles').current.get('zoomableUrl');
          this.$('.left iframe').attr('src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.0/viewer.html?rft_id=' + url);
          return this.$('.left iframe').height(document.documentElement.clientHeight - 89);
        } else {
          return this.el.querySelector('li[data-key="facsimiles"]').style.display = 'none';
        }
      };

      Entry.prototype.renderTranscription = function() {
        var el;
        this.renderPreview();
        if (this.transcriptionEdit != null) {
          this.transcriptionEdit.setModel(this.currentTranscription);
        } else {
          el = this.$('.container .middle .transcription');
          this.transcriptionEdit = new Views.SuperTinyEditor({
            controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'n', 'unformat', '|', 'undo', 'redo'],
            cssFile: '/css/main.css',
            el: el,
            height: this.preview.$el.innerHeight(),
            html: this.currentTranscription.get('body'),
            htmlAttribute: 'body',
            model: this.model.get('transcriptions').current,
            width: el.width() - 10
          });
        }
        return this.toggleEditPane('transcription');
      };

      Entry.prototype.renderAnnotation = function(model) {
        var el;
        if (this.annotationEdit != null) {
          if (model != null) {
            this.annotationEdit.setModel(model);
          }
        } else {
          if (model == null) {
            console.error('No annotation given as argument!');
          }
          el = this.$('.container .middle');
          this.annotationEdit = new Views.SuperTinyEditor({
            cssFile: '/css/main.css',
            controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'n', 'unformat', '|', 'undo', 'redo'],
            el: this.el.querySelector('.container .middle .annotation'),
            height: this.preview.$el.innerHeight(),
            html: model.get('body'),
            htmlAttribute: 'body',
            model: model,
            width: el.width() - 10,
            wrap: true
          });
        }
        return this.toggleEditPane('annotation');
      };

      Entry.prototype.renderPreview = function() {
        if (this.preview != null) {
          return this.preview.setModel(this.currentTranscription);
        } else {
          return this.preview = new Views.Preview({
            model: this.currentTranscription,
            el: this.$('.container .right')
          });
        }
      };

      Entry.prototype.renderSubsubmenu = function() {
        return this.subviews.textlayersEdit = new Views.EditTextlayers({
          collection: this.model.get('transcriptions'),
          el: this.$('.subsubmenu .textlayers')
        });
      };

      Entry.prototype.events = function() {
        return {
          'click .menu li[data-key="previous"]': 'previousEntry',
          'click .menu li[data-key="next"]': 'nextEntry',
          'click .menu li[data-key="facsimile"]': 'changeFacsimile',
          'click .menu li[data-key="transcription"]': 'changeTextlayer',
          'click .menu li[data-key="save"]': 'save',
          'click .menu li[data-key="metadata"]': 'metadata',
          'click .menu li[data-key="edittextlayers"]': 'edittextlayers'
        };
      };

      Entry.prototype.edittextlayers = function() {
        return this.$('.subsubmenu').toggleClass('active');
      };

      Entry.prototype.previousEntry = function() {
        return this.publish('navigate:entry', this.model.collection.previous().id);
      };

      Entry.prototype.nextEntry = function() {
        return this.publish('navigate:entry', this.model.collection.next().id);
      };

      Entry.prototype.changeFacsimile = function(ev) {
        var facsimileID, model;
        facsimileID = ev.currentTarget.getAttribute('data-value');
        model = this.model.get('facsimiles').get(facsimileID);
        if (model != null) {
          return this.model.get('facsimiles').setCurrent(model);
        }
      };

      Entry.prototype.changeTextlayer = function(ev) {
        var newTranscription, transcriptionID;
        transcriptionID = ev.currentTarget.getAttribute('data-value');
        newTranscription = this.model.get('transcriptions').get(transcriptionID);
        if (newTranscription !== this.currentTranscription) {
          this.model.get('transcriptions').setCurrent(newTranscription);
          this.navigateToTextLayer();
          this.changeTextlayerInMenu();
        }
        return this.toggleEditPane('transcription');
      };

      Entry.prototype.navigateToTextLayer = function() {
        var index;
        index = Backbone.history.fragment.indexOf('/transcriptions/');
        if (index !== -1) {
          Backbone.history.fragment = Backbone.history.fragment.substr(0, index);
        }
        return Backbone.history.navigate(Backbone.history.fragment + '/transcriptions/' + StringFn.slugify(this.currentTranscription.get('textLayer')), {
          replace: true
        });
      };

      Entry.prototype.changeTextlayerInMenu = function() {
        var li, textLayer, textLayerNode;
        textLayer = this.currentTranscription.get('textLayer');
        textLayerNode = document.createTextNode(textLayer + ' layer');
        li = this.el.querySelector('.submenu li[data-key="layer"]');
        return li.replaceChild(textLayerNode, li.firstChild);
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
        view.$el.siblings().hide();
        return view.$el.show();
      };

      Entry.prototype.addListeners = function() {
        var _this = this;
        this.listenTo(this.preview, 'editAnnotation', this.renderAnnotation);
        this.listenTo(this.preview, 'addAnnotation', this.renderAnnotation);
        this.listenTo(this.preview, 'newAnnotationRemoved', this.renderTranscription);
        this.listenTo(this.preview, 'scrolled', function(percentages) {
          return _this.transcriptionEdit.setScrollPercentage(percentages);
        });
        this.listenTo(this.transcriptionEdit, 'scrolled', function(percentages) {
          return Fn.setScrollPercentage(_this.preview.el, percentages);
        });
        this.listenTo(this.transcriptionEdit, 'change', function(cmd, doc) {
          return _this.currentTranscription.set('body', doc);
        });
        this.listenTo(this.model.get('facsimiles'), 'current:change', function(current) {
          _this.currentFacsimile = current;
          return _this.renderFacsimile();
        });
        this.listenTo(this.model.get('transcriptions'), 'current:change', function(current) {
          _this.currentTranscription = current;
          return _this.renderTranscription();
        });
        return window.addEventListener('resize', function(ev) {
          return Fn.timeoutWithReset(600, function() {
            _this.renderFacsimile();
            _this.preview.setHeight();
            _this.transcriptionEdit.setIframeHeight(_this.preview.$el.innerHeight());
            if (_this.annotationEdit != null) {
              return _this.annotationEdit.setIframeHeight(_this.preview.$el.innerHeight());
            }
          });
        });
      };

      return Entry;

    })(Views.Base);
  });

}).call(this);

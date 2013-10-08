(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Async, Backbone, Entry, Fn, Models, StringFn, Templates, Views, config, _ref;
    Backbone = require('backbone');
    config = require('config');
    Fn = require('hilib/functions/general');
    StringFn = require('hilib/functions/string');
    require('hilib/functions/jquery.mixin');
    Async = require('hilib/managers/async');
    Models = {
      state: require('models/state'),
      Entry: require('models/entry')
    };
    Views = {
      Base: require('views/base'),
      SubMenu: require('views/ui/entry.submenu'),
      Preview: require('views/entry/preview/main'),
      SuperTinyEditor: require('hilib/views/supertinyeditor/supertinyeditor'),
      AnnotationMetadata: require('views/entry/annotation.metadata'),
      EntryMetadata: require('views/entry/metadata'),
      EditTextlayers: require('views/entry/subsubmenu/textlayers.edit'),
      EditFacsimiles: require('views/entry/subsubmenu/facsimiles.edit'),
      TranscriptionEditMenu: require('views/entry/transcription.edit.menu'),
      AnnotationEditMenu: require('views/entry/annotation.edit.menu'),
      Modal: require('hilib/views/modal/main'),
      Form: require('hilib/views/form/main')
    };
    Templates = {
      Entry: require('text!html/entry/main.html'),
      Metadata: require('text!html/entry/metadata.html')
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
          return _this.render();
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
        var rtpl,
          _this = this;
        rtpl = _.template(Templates.Entry, this.model.toJSON());
        this.$el.html(rtpl);
        if (this.options.transcriptionName == null) {
          this.navigateToTranscription();
        }
        this.setTranscriptionNameToMenu();
        this.renderFacsimile();
        this.renderTranscription();
        this.renderSubsubmenu();
        this.addListeners();
        return this.currentTranscription.getAnnotations(function(annotations) {
          if (_this.options.annotationID != null) {
            return _this.renderAnnotation(annotations.get(_this.options.annotationID));
          }
        });
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
        var $el,
          _this = this;
        this.renderPreview();
        if (this.transcriptionEdit != null) {
          this.transcriptionEdit.setModel(this.currentTranscription);
        } else {
          $el = this.$('.transcription-placeholder');
          this.transcriptionEdit = new Views.SuperTinyEditor({
            controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'undo', 'redo', 'n', 'b_save'],
            cssFile: '/css/main.css',
            el: $el.find('.transcription-editor'),
            height: this.preview.$el.innerHeight(),
            html: this.currentTranscription.get('body'),
            htmlAttribute: 'body',
            model: this.model.get('transcriptions').current,
            width: $el.width() - 20
          });
          this.listenTo(this.transcriptionEdit, 'save', function() {
            return _this.currentTranscription.save();
          });
        }
        return this.toggleEditPane('transcription');
      };

      Entry.prototype.renderAnnotation = function(model) {
        var $el, annotatedText, annotationNo, _ref1,
          _this = this;
        this.navigateToAnnotation(model.id);
        if ((this.annotationEdit != null) && (model != null)) {
          this.annotationEdit.setModel(model);
        } else {
          if (model == null) {
            console.error('No annotation given as argument!');
          }
          $el = this.$('.annotation-placeholder');
          this.annotationEdit = new Views.SuperTinyEditor({
            cssFile: '/css/main.css',
            controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'undo', 'redo', 'n', 'b_save', 'b_cancel', 'b_metadata', 'n'],
            el: $el.find('.annotation-editor'),
            height: this.preview.$el.innerHeight() - 31,
            html: model.get('body'),
            htmlAttribute: 'body',
            model: model,
            width: this.preview.$el.width() - 4,
            wrap: true
          });
          this.listenTo(this.annotationEdit, 'save', function() {
            var annotations;
            if (model.isNew()) {
              annotations = _this.currentTranscription.get('annotations');
              model.urlRoot = function() {
                return config.baseUrl + ("projects/" + annotations.projectId + "/entries/" + annotations.entryId + "/transcriptions/" + annotations.transcriptionId + "/annotations");
              };
              return model.save([], {
                success: function() {
                  return annotations.add(model);
                },
                error: function(model, xhr, options) {
                  return console.error('Saving annotation failed!', model, xhr, options);
                }
              });
            } else {
              return model.save();
            }
          });
          this.listenTo(this.annotationEdit, 'cancel', function() {
            return _this.preview.removeNewAnnotationTags();
          });
          this.listenTo(this.annotationEdit, 'metadata', function() {
            _this.annotationMetadata = new Views.AnnotationMetadata({
              model: model,
              collection: _this.project.get('annotationtypes'),
              el: _this.el.querySelector('.container .middle .annotationmetadata')
            });
            return _this.toggleEditPane('annotationmetadata');
          });
        }
        annotationNo = (_ref1 = model.get('annotationNo')) != null ? _ref1 : 'newannotation';
        annotatedText = this.preview.getAnnotatedText(annotationNo);
        this.annotationEdit.$('.ste-header').last().addClass('annotationtext').html(annotatedText);
        return this.toggleEditPane('annotation');
      };

      Entry.prototype.renderPreview = function() {
        if (this.preview != null) {
          return this.preview.setModel(this.model);
        } else {
          return this.preview = new Views.Preview({
            model: this.model,
            el: this.$('.container .right')
          });
        }
      };

      Entry.prototype.renderSubsubmenu = function() {
        this.subviews.textlayersEdit = new Views.EditTextlayers({
          collection: this.model.get('transcriptions'),
          el: this.$('.subsubmenu .edittextlayers')
        });
        return this.subviews.facsimileEdit = new Views.EditFacsimiles({
          collection: this.model.get('facsimiles'),
          el: this.$('.subsubmenu .editfacsimiles')
        });
      };

      Entry.prototype.events = function() {
        return {
          'click .menu li[data-key="previous"]': 'previousEntry',
          'click .menu li[data-key="next"]': 'nextEntry',
          'click .menu li[data-key="facsimile"]': 'changeFacsimile',
          'click .menu li[data-key="transcription"]': 'changeTranscription',
          'click .menu li[data-key="save"]': 'save',
          'click .menu li[data-key="metadata"]': 'metadata',
          'click .menu li.subsub': 'toggleSubsubmenu'
        };
      };

      Entry.prototype.toggleSubsubmenu = (function() {
        var currentMenu;
        currentMenu = null;
        return function(ev) {
          var newMenu;
          newMenu = ev.currentTarget.getAttribute('data-key');
          if (currentMenu === newMenu) {
            $(ev.currentTarget).removeClass('rotateup');
            $('.subsubmenu').removeClass('active');
            return currentMenu = null;
          } else {
            if (currentMenu != null) {
              $('.submenu li[data-key="' + currentMenu + '"]').removeClass('rotateup');
            } else {
              $('.subsubmenu').addClass('active');
            }
            $('.submenu li[data-key="' + newMenu + '"]').addClass('rotateup');
            $('.subsubmenu').find('.' + newMenu).show().siblings().hide();
            return currentMenu = newMenu;
          }
        };
      })();

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

      Entry.prototype.changeTranscription = function(ev) {
        var newTranscription, transcriptionID;
        transcriptionID = ev.currentTarget.getAttribute('data-value');
        newTranscription = this.model.get('transcriptions').get(transcriptionID);
        if (newTranscription !== this.currentTranscription || this.currentViewInEditPane !== this.transcriptionEdit) {
          this.model.get('transcriptions').setCurrent(newTranscription);
          this.navigateToTranscription();
          this.setTranscriptionNameToMenu();
        }
        return this.toggleEditPane('transcription');
      };

      Entry.prototype.navigateToTranscription = function() {
        var index;
        index = Backbone.history.fragment.indexOf('/transcriptions/');
        if (index !== -1) {
          Backbone.history.fragment = Backbone.history.fragment.substr(0, index);
        }
        return Backbone.history.navigate(Backbone.history.fragment + '/transcriptions/' + StringFn.slugify(this.currentTranscription.get('textLayer')), {
          replace: true
        });
      };

      Entry.prototype.navigateToAnnotation = function(id) {
        var index;
        index = Backbone.history.fragment.indexOf('/annotations/');
        if (index !== -1) {
          Backbone.history.fragment = Backbone.history.fragment.substr(0, index);
        }
        return Backbone.history.navigate(Backbone.history.fragment + '/annotations/' + id, {
          replace: true
        });
      };

      Entry.prototype.setTranscriptionNameToMenu = function() {
        var li, textLayer, textLayerNode;
        textLayer = this.currentTranscription.get('textLayer');
        textLayerNode = document.createTextNode(textLayer + ' layer');
        li = this.el.querySelector('.submenu li[data-key="layer"]');
        return li.replaceChild(textLayerNode, li.firstChild);
      };

      Entry.prototype.metadata = function(ev) {
        var entryMetadata, modal,
          _this = this;
        entryMetadata = new Views.Form({
          tpl: Templates.Metadata,
          model: this.model.clone()
        });
        modal = new Views.Modal({
          title: "Edit entry metadata",
          $html: entryMetadata.$el,
          submitValue: 'Save metadata',
          width: '300px'
        });
        return modal.on('submit', function() {
          var jqXHR;
          _this.model.updateFromClone(entryMetadata.model);
          jqXHR = _this.model.save();
          return jqXHR.done(function() {
            return modal.messageAndFade('success', 'Metadata saved!');
          });
        });
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
        this.currentViewInEditPane = view;
        view.$el.parent().siblings().hide();
        return view.$el.parent().show();
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
        this.listenTo(this.model.get('facsimiles'), 'current:change', function(current) {
          _this.currentFacsimile = current;
          return _this.renderFacsimile();
        });
        this.listenTo(this.model.get('facsimiles'), 'add', function(facsimile) {
          var li;
          li = $("<li data-key='facsimile' data-value='" + facsimile.id + "'>" + (facsimile.get('name')) + "</li>");
          return _this.$('.submenu .facsimiles').append(li);
        });
        this.listenTo(this.model.get('facsimiles'), 'remove', function(facsimile) {
          return _this.$('.submenu .facsimiles [data-value="' + facsimile.id + '"]').remove();
        });
        this.listenTo(this.model.get('transcriptions'), 'current:change', function(current) {
          _this.currentTranscription = current;
          _this.currentTranscription.getAnnotations();
          return _this.renderTranscription();
        });
        this.listenTo(this.model.get('transcriptions'), 'add', function(transcription) {
          var li;
          li = $("<li data-key='transcription' data-value='" + transcription.id + "'>" + (transcription.get('textLayer')) + " layer</li>");
          return _this.$('.submenu .textlayers').append(li);
        });
        this.listenTo(this.model.get('transcriptions'), 'remove', function(transcription) {
          return _this.$('.submenu .textlayers [data-value="' + transcription.id + '"]').remove();
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

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Async, Backbone, Collections, Entry, Fn, Models, StringFn, Templates, Views, config, _ref;
    Backbone = require('backbone');
    config = require('config');
    Fn = require('hilib/functions/general');
    StringFn = require('hilib/functions/string');
    require('hilib/functions/jquery.mixin');
    Async = require('hilib/managers/async');
    Models = {
      Entry: require('models/entry')
    };
    Collections = {
      projects: require('collections/projects')
    };
    Views = {
      Base: require('views/base'),
      Preview: require('views/entry/preview/main'),
      EntryMetadata: require('views/entry/metadata'),
      EditTextlayers: require('views/entry/subsubmenu/textlayers.edit'),
      EditFacsimiles: require('views/entry/subsubmenu/facsimiles.edit'),
      Modal: require('hilib/views/modal/main'),
      Form: require('hilib/views/form/main'),
      AnnotationEditor: require('views/entry/editors/annotation'),
      LayerEditor: require('views/entry/editors/layer')
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
        async = new Async(['transcriptions', 'facsimiles', 'settings', 'annotationtypes']);
        this.listenToOnce(async, 'ready', function() {
          return _this.render();
        });
        return Collections.projects.getCurrent(function(project) {
          _this.project = project;
          _this.project.get('entries').fetch({
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
          return _this.project.get('annotationtypes').fetch({
            success: function() {
              return async.called('annotationtypes');
            }
          });
        });
      };

      Entry.prototype.render = function() {
        var rtpl,
          _this = this;
        rtpl = _.template(Templates.Entry, this.model.toJSON());
        this.$el.html(rtpl);
        this.renderFacsimile();
        this.renderTranscription();
        this.renderSubsubmenu();
        this.addListeners();
        return this.currentTranscription.getAnnotations(function(annotations) {
          var annotation;
          if (_this.options.annotationID != null) {
            annotation = annotations.get(_this.options.annotationID);
            _this.preview.setAnnotatedText(annotation);
            return _this.renderAnnotation(annotation);
          }
        });
      };

      Entry.prototype.renderFacsimile = function() {
        var url;
        if (this.model.get('facsimiles').current != null) {
          url = this.model.get('facsimiles').current.get('zoomableUrl');
          this.$('.left iframe').attr('src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.0/viewer.html?rft_id=' + url);
          return this.$('.left iframe').height(document.documentElement.clientHeight - 89);
        }
      };

      Entry.prototype.renderTranscription = function() {
        this.renderPreview();
        this.setTranscriptionNameToMenu();
        if (!this.layerEditor) {
          this.layerEditor = new Views.LayerEditor({
            el: this.el.querySelector('.transcription-placeholder'),
            model: this.currentTranscription,
            height: this.preview.$el.innerHeight(),
            width: this.preview.$el.width() - 4
          });
        } else {
          this.layerEditor.show(this.currentTranscription);
        }
        if (this.annotationEditor != null) {
          return this.annotationEditor.hide();
        }
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

      Entry.prototype.renderAnnotation = function(model) {
        var _this = this;
        if (!this.annotationEditor) {
          this.annotationEditor = new Views.AnnotationEditor({
            el: this.el.querySelector('.annotation-placeholder'),
            model: model,
            height: this.preview.$el.innerHeight() - 31,
            width: this.preview.$el.width() - 4
          });
          this.listenTo(this.annotationEditor, 'cancel', function() {
            _this.preview.removeNewAnnotationTags();
            return _this.renderTranscription();
          });
          this.listenTo(this.annotationEditor, 'newannotation:saved', function(annotation) {
            _this.currentTranscription.get('annotations').add(annotation);
            return _this.publish('message', "New annotation added.");
          });
        } else {
          this.annotationEditor.show(model);
        }
        return this.layerEditor.hide();
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
          'click .menu li.subsub': function(ev) {
            return this.subsubmenu.toggle(ev);
          },
          'click .menu li[data-key="metadata"]': 'editEntryMetadata'
        };
      };

      Entry.prototype.subsubmenu = (function() {
        var currentMenu;
        currentMenu = null;
        return {
          close: function() {
            $('.subsubmenu').removeClass('active');
            return currentMenu = null;
          },
          toggle: function(ev) {
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
          }
        };
      })();

      Entry.prototype.previousEntry = function() {
        var entryID;
        entryID = this.model.collection.previous().id;
        return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/entries/" + entryID, {
          trigger: true
        });
      };

      Entry.prototype.nextEntry = function() {
        var entryID;
        entryID = this.model.collection.next().id;
        return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/entries/" + entryID, {
          trigger: true
        });
      };

      Entry.prototype.changeFacsimile = function(ev) {
        var facsimileID, newFacsimile;
        facsimileID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
        newFacsimile = this.model.get('facsimiles').get(facsimileID);
        if (newFacsimile != null) {
          return this.model.get('facsimiles').setCurrent(newFacsimile);
        }
      };

      Entry.prototype.changeTranscription = function(ev) {
        var newTranscription, transcriptionID;
        transcriptionID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
        newTranscription = this.model.get('transcriptions').get(transcriptionID);
        if (newTranscription !== this.currentTranscription) {
          return this.model.get('transcriptions').setCurrent(newTranscription);
        } else if (!this.layerEditor.visible()) {
          return this.model.get('transcriptions').trigger('current:change', this.currentTranscription);
        }
      };

      Entry.prototype.editEntryMetadata = function(ev) {
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
          _this.model.get('settings').save();
          jqXHR = _this.model.save();
          return jqXHR.done(function() {
            _this.publish('message', "Saved metadata for entry: " + (_this.model.get('name')) + ".");
            return modal.close();
          });
        });
      };

      Entry.prototype.setTranscriptionNameToMenu = function() {
        var li, textLayer, textLayerNode;
        textLayer = this.currentTranscription.get('textLayer');
        textLayerNode = document.createTextNode(textLayer + ' layer');
        li = this.el.querySelector('.submenu li[data-key="layer"]');
        return li.replaceChild(textLayerNode, li.firstChild);
      };

      Entry.prototype.addListeners = function() {
        var _this = this;
        this.listenTo(this.preview, 'editAnnotation', this.renderAnnotation);
        this.listenTo(this.preview, 'annotation:removed', this.renderTranscription);
        this.listenTo(this.preview, 'scrolled', function(percentages) {
          return _this.layerEditor.editor.setScrollPercentage(percentages);
        });
        this.listenTo(this.layerEditor.editor, 'scrolled', function(percentages) {
          return Fn.setScrollPercentage(_this.preview.el, percentages);
        });
        this.listenTo(this.model.get('facsimiles'), 'current:change', function(current) {
          _this.currentFacsimile = current;
          return _this.renderFacsimile();
        });
        this.listenTo(this.model.get('facsimiles'), 'add', function(facsimile) {
          var li;
          li = $("<li data-key='facsimile' data-value='" + facsimile.id + "'>" + (facsimile.get('name')) + "</li>");
          _this.$('.submenu .facsimiles').append(li);
          _this.changeFacsimile(facsimile.id);
          _this.subsubmenu.close();
          return _this.publish('message', "Added facsimile: \"" + (facsimile.get('name')) + "\".");
        });
        this.listenTo(this.model.get('facsimiles'), 'remove', function(facsimile) {
          _this.$('.submenu .facsimiles [data-value="' + facsimile.id + '"]').remove();
          return _this.publish('message', "Removed facsimile: \"" + (facsimile.get('name')) + "\".");
        });
        this.listenTo(this.model.get('transcriptions'), 'current:change', function(current) {
          _this.currentTranscription = current;
          return _this.currentTranscription.getAnnotations(function(annotations) {
            return _this.renderTranscription();
          });
        });
        this.listenTo(this.model.get('transcriptions'), 'add', function(transcription) {
          var li;
          li = $("<li data-key='transcription' data-value='" + transcription.id + "'>" + (transcription.get('textLayer')) + " layer</li>");
          _this.$('.submenu .textlayers').append(li);
          _this.changeTranscription(transcription.id);
          _this.subsubmenu.close();
          return _this.publish('message', "Added text layer: \"" + (transcription.get('textLayer')) + "\".");
        });
        this.listenTo(this.model.get('transcriptions'), 'remove', function(transcription) {
          _this.$('.submenu .textlayers [data-value="' + transcription.id + '"]').remove();
          return _this.publish('message', "Removed text layer: \"" + (transcription.get('textLayer')) + "\".");
        });
        return window.addEventListener('resize', function(ev) {
          return Fn.timeoutWithReset(600, function() {
            _this.renderFacsimile();
            _this.preview.setHeight();
            _this.layerEditor.editor.setIframeHeight(_this.preview.$el.innerHeight());
            _this.layerEditor.editor.setIframeWidth(_this.preview.$el.width() - 4);
            if (_this.annotationEditor != null) {
              _this.annotationEditor.editor.setIframeHeight(_this.preview.$el.innerHeight());
              return _this.annotationEditor.editor.setIframeWidth(_this.preview.$el.width() - 4);
            }
          });
        });
      };

      return Entry;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var EditFacsimiles, Fn, Tpl, Views, ajax, token, _ref;
    Fn = require('helpers2/general');
    ajax = require('managers2/ajax');
    token = require('managers2/token');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/facsimiles.edit.html');
    return EditFacsimiles = (function(_super) {
      __extends(EditFacsimiles, _super);

      function EditFacsimiles() {
        _ref = EditFacsimiles.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EditFacsimiles.prototype.initialize = function() {
        EditFacsimiles.__super__.initialize.apply(this, arguments);
        this.listenTo(this.collection, 'add', this.render);
        this.listenTo(this.collection, 'remove', this.render);
        return this.render();
      };

      EditFacsimiles.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Tpl, {
          facsimiles: this.collection
        });
        this.$el.html(rtpl);
        return this;
      };

      EditFacsimiles.prototype.events = function() {
        return {
          'click ul.facsimiles li img': 'removefacsimile',
          'click ul.facsimiles li.destroy label': 'destroyfacsimile',
          'keyup input[name="name"]': 'keyupName',
          'click button.addfacsimile': 'addfacsimile'
        };
      };

      EditFacsimiles.prototype.keyupName = function(ev) {
        return this.el.querySelector('form.addfile').style.display = ev.currentTarget.value.length > 0 ? 'block' : 'none';
      };

      EditFacsimiles.prototype.addfacsimile = function(ev) {
        var form, formData, jqXHR,
          _this = this;
        ev.stopPropagation();
        ev.preventDefault();
        form = this.el.querySelector('form.addfile');
        formData = new FormData(form);
        jqXHR = ajax.post({
          url: 'http://tiler01.huygensinstituut.knaw.nl:8080/facsimileservice/upload',
          data: formData,
          cache: false,
          contentType: false,
          processData: false
        });
        return jqXHR.done(function(response) {
          var data;
          data = {
            name: _this.el.querySelector('input[name="name"]').value,
            filename: response[1].originalName,
            zoomableUrl: response[1].jp2url
          };
          return _this.collection.create(data, {
            wait: true
          });
        });
      };

      EditFacsimiles.prototype.removefacsimile = function(ev) {
        var parentLi;
        parentLi = $(ev.currentTarget).parent();
        return parentLi.toggleClass('destroy');
      };

      EditFacsimiles.prototype.destroyfacsimile = function(ev) {
        var transcriptionID;
        transcriptionID = ev.currentTarget.getAttribute('data-id');
        return this.collection.remove(this.collection.get(transcriptionID));
      };

      return EditFacsimiles;

    })(Views.Base);
  });

}).call(this);

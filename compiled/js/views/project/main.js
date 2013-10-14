(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Fn, Models, ProjectSearch, Templates, Views, config, token, _ref;
    Fn = require('hilib/functions/general');
    config = require('config');
    token = require('hilib/managers/token');
    Models = {
      Search: require('models/project/search')
    };
    Collections = {
      projects: require('collections/projects')
    };
    Views = {
      Base: require('views/base'),
      FacetedSearch: require('faceted-search'),
      Modal: require('hilib/views/modal/main'),
      EditSelection: require('views/project/editselection')
    };
    Templates = {
      Search: require('text!html/project/main.html'),
      Results: require('text!html/project/results.html')
    };
    return ProjectSearch = (function(_super) {
      var _this = this;

      __extends(ProjectSearch, _super);

      function ProjectSearch() {
        _ref = ProjectSearch.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectSearch.prototype.className = 'projectsearch';

      ProjectSearch.prototype.initialize = function() {
        var _this = this;
        ProjectSearch.__super__.initialize.apply(this, arguments);
        this.model = new Models.Search();
        this.listenTo(this.model, 'change', function(model, options) {
          _this.project.get('entries').set(model.get('results'));
          _this.listenTo(_this.project.get('entries'), 'current:change', function(entry) {
            return Backbone.history.navigate("projects/" + (_this.project.get('name')) + "/entries/" + entry.id, {
              trigger: true
            });
          });
          _this.updateHeader();
          return _this.renderResult();
        });
        return Collections.projects.getCurrent(function(project) {
          _this.project = project;
          return _this.render();
        });
      };

      ProjectSearch.prototype.render = function() {
        var rtpl,
          _this = this;
        rtpl = _.template(Templates.Search, this.project.attributes);
        this.$el.html(rtpl);
        this.editSelection = new Views.EditSelection({
          el: this.el.querySelector('.editselection-placeholder'),
          model: this.project
        });
        this.facetedSearch = new Views.FacetedSearch({
          el: this.$('.faceted-search-placeholder'),
          baseUrl: config.baseUrl,
          searchPath: 'projects/' + this.project.id + '/search',
          token: token.get(),
          textSearchOptions: {
            textLayers: this.project.get('textLayers'),
            searchInAnnotations: true,
            searchInTranscriptions: true
          },
          queryOptions: {
            resultRows: 12
          }
        });
        this.listenTo(this.facetedSearch, 'unauthorized', function() {
          return _this.publish('unauthorized');
        });
        this.listenTo(this.facetedSearch, 'results:change', function(response, queryOptions) {
          _this.model.queryOptions = queryOptions;
          return _this.model.set(response);
        });
        return this;
      };

      ProjectSearch.prototype.renderResult = function() {
        var rtpl;
        rtpl = _.template(Templates.Results, {
          model: this.model
        });
        this.$('ul.entries').html(rtpl);
        if ((this.model.queryOptions.term != null) && this.model.queryOptions.term !== '') {
          document.getElementById('cb_showkeywords').checked = true;
          this.$('.keywords').show();
        } else {
          document.getElementById('cb_showkeywords').checked = false;
          this.$('.keywords').hide();
        }
        return this;
      };

      ProjectSearch.prototype.events = {
        'click .submenu li[data-key="newsearch"]': function() {
          return this.facetedSearch.reset();
        },
        'click .submenu li[data-key="newentry"]': 'newEntry',
        'click .submenu li[data-key="editselection"]': function(ev) {
          return this.$('.editselection-placeholder').toggle();
        },
        'click li.entry label': 'changeCurrentEntry',
        'click .pagination li.prev': 'changePage',
        'click .pagination li.next': 'changePage',
        'click li[data-key="selectall"]': function() {
          return Fn.checkCheckboxes('.entries input[type="checkbox"]', true, ProjectSearch.el);
        },
        'click li[data-key="deselectall"]': function() {
          return Fn.checkCheckboxes('.entries input[type="checkbox"]', false, ProjectSearch.el);
        },
        'change #cb_showkeywords': function(ev) {
          if (ev.currentTarget.checked) {
            return this.$('.keywords').show();
          } else {
            return this.$('.keywords').hide();
          }
        }
      };

      ProjectSearch.prototype.newEntry = function(ev) {
        var $html, modal,
          _this = this;
        $html = $('<form><ul><li><label>Name</label><input type="text" name="name" /></li></ul></form>');
        modal = new Views.Modal({
          title: "Create a new entry",
          $html: $html,
          submitValue: 'Create entry',
          width: '300px'
        });
        return modal.on('submit', function() {
          var entries;
          entries = _this.project.get('entries');
          modal.message('success', 'Creating new entry...');
          _this.listenToOnce(entries, 'add', function(entry) {
            modal.close();
            return Backbone.history.navigate("projects/" + (_this.project.get('name')) + "/entries/" + entry.id, {
              trigger: true
            });
          });
          return entries.create({
            name: modal.$('input[name="name"]').val()
          }, {
            wait: true
          });
        });
      };

      ProjectSearch.prototype.changePage = function(ev) {
        var ct;
        ct = $(ev.currentTarget);
        if (ct.hasClass('inactive')) {
          return;
        }
        $('.pagination li').removeClass('inactive');
        if (ct.hasClass('prev')) {
          return this.facetedSearch.prev();
        } else if (ct.hasClass('next')) {
          return this.facetedSearch.next();
        }
      };

      ProjectSearch.prototype.changeCurrentEntry = function(ev) {
        var entryID;
        entryID = ev.currentTarget.getAttribute('data-id');
        return this.project.get('entries').setCurrent(entryID);
      };

      ProjectSearch.prototype.updateHeader = function() {
        var currentpage, pagecount;
        this.$('h3.numfound').html(this.model.get('numFound') + ' letters found');
        currentpage = (this.model.get('start') / this.model.get('rows')) + 1;
        pagecount = Math.ceil(this.model.get('numFound') / this.model.get('rows'));
        if (pagecount > 1) {
          if (!this.facetedSearch.hasPrev()) {
            this.$('.pagination li.prev').addClass('inactive');
          }
          if (!this.facetedSearch.hasNext()) {
            this.$('.pagination li.next').addClass('inactive');
          }
          this.$('.pagination li.currentpage').html(currentpage);
          this.$('.pagination li.pagecount').html(pagecount);
          return this.$('.pagination').show();
        } else {
          return this.$('.pagination').hide();
        }
      };

      return ProjectSearch;

    }).call(this, Views.Base);
  });

}).call(this);

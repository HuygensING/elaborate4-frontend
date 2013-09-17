(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Fn, Models, ProjectSearch, Templates, Views, config, token, _ref;
    Fn = require('helpers2/general');
    config = require('config');
    token = require('managers/token');
    Models = {
      Search: require('models/project/search'),
      state: require('models/state')
    };
    Views = {
      Base: require('views/base'),
      FacetedSearch: require('faceted-search')
    };
    Templates = {
      Search: require('text!html/project/search.html'),
      Results: require('text!html/project/search.results.html')
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
          _this.updateHeader();
          return _this.renderEntries();
        });
        return Models.state.getCurrentProject(function(project) {
          /* console.log 'callback called' # FIX Callback is called twice on login! But initialize is only run once*/

          _this.project = project;
          return _this.render();
        });
      };

      ProjectSearch.prototype.render = function() {
        var rtpl,
          _this = this;
        rtpl = _.template(Templates.Search, this.project.attributes);
        this.$el.html(rtpl);
        this.facetedSearch = new Views.FacetedSearch({
          el: this.$('.faceted-search-placeholder'),
          baseUrl: config.baseUrl,
          searchPath: 'projects/' + this.project.id + '/search',
          token: token.get(),
          textSearchOptions: {
            searchInAnnotations: false,
            searchInTranscriptions: false
          },
          queryOptions: {
            resultRows: 12
          }
        });
        this.listenTo(this.facetedSearch, 'results:change', function(response) {
          return _this.model.set(response);
        });
        return this;
      };

      ProjectSearch.prototype.renderEntries = function() {
        var rtpl;
        rtpl = _.template(Templates.Results, {
          entries: this.project.get('entries')
        });
        this.$('ul.entries').html(rtpl);
        return this;
      };

      ProjectSearch.prototype.events = {
        'click li.entry label': 'goToEntry',
        'click .pagination li.prev': 'changePage',
        'click .pagination li.next': 'changePage',
        'click li[data-key="selectall"]': function() {
          return Fn.checkCheckboxes('.entries input[type="checkbox"]', true, ProjectSearch.el);
        },
        'click li[data-key="deselectall"]': function() {
          return Fn.checkCheckboxes('.entries input[type="checkbox"]', false, ProjectSearch.el);
        }
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

      ProjectSearch.prototype.goToEntry = function(ev) {
        var entryID;
        entryID = ev.currentTarget.getAttribute('data-id');
        this.project.get('entries').setCurrent(entryID);
        return this.publish('navigate:entry', entryID);
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

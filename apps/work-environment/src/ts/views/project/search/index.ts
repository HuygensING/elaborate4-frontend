import Backbone from "backbone"
import { FacetedSearch } from "@elaborate4-frontend/faceted-search"
import { className, BaseView, token, stringFn } from "@elaborate4-frontend/hilib"
import config from "../../../models/config"
import projects from "../../../collections/projects"
import Submenu from "./submenu"
import EditMetadata from "./edit-metadata"

  // TODO: Destroy view
@className('search')
export default class Search extends BaseView {
  project 

  // ### Initialize
  constructor(options?) {
    super(options)

    projects.getCurrent((project1) => {
      this.project = project1
      this.render()
      // If the project's entry metadata fields change, the faceted search
      // has to be updated to render the sort fields correctly.
      this.listenTo(this.project, 'change:entrymetadatafields', (values) => {
        this.subviews.fs.config.set({
          entryMetadataFields: values
        })
      })

      this.listenTo(this.project, 'change:level1 change:level2 change:level3', () => {
        this.subviews.fs.config.set({
          levels: [this.project.get('level1'), this.project.get('level2'), this.project.get('level3')]
        })
      })
    })
  }

  // TODO fix for new FS
  // @listenTo Backbone, 'change:entry-metadata', => entryMetadataChanged = true
  // @listenTo Backbone, 'router:search', => @subviews.fsr.reset() if entryMetadataChanged

    // ### Render
  render() {
    this.renderSubmenu()
    this.renderFacetedSearch()
    this.addListeners()
    return this
  }

  renderSubmenu() {
    this.subviews.submenu = new Submenu()
    this.$el.html(this.subviews.submenu.$el)
  }

  renderFacetedSearch() {
    const div = document.createElement('div');
    div.className = 'faceted-search-placeholder';
    this.$el.append(div);
    const levels = [this.project.get('level1'), this.project.get('level2'), this.project.get('level3')];
    const sortParameters = (function() {
      const results = [];
      for (let i = 0, len = levels.length; i < len; i++) {
        const level = levels[i];
        results.push({
          fieldname: level,
          direction: 'asc'
        })
      }
      return results
    })()
    this.subviews.fs = new FacetedSearch({
      el: this.$('div.faceted-search-placeholder'),
      levels: levels,
      entryMetadataFields: this.project.get('entrymetadatafields'),
      textLayers: this.project.get('textLayers'),
      baseUrl: `${config.get('restUrl')}`,
      searchPath: `projects/${this.project.id}/search`,
      results: true,
      authorizationHeaderToken: `${token.getType()} ${token.get()}`,
      textSearchOptions: {
        textLayers: this.project.get('textLayers'),
        searchInAnnotations: true,
        searchInTranscriptions: true,
        term: '*:*',
        caseSensitive: true,
        fuzzy: true
      },
      queryOptions: {
        sortParameters: sortParameters,
        resultFields: levels
      },
      resultRows: this.project.get('settings').get('results-per-page')
    })
    this.subviews.fs.search()
  }

  private addListeners() {
    this.listenTo(this.subviews.submenu, 'newsearch', () => {
      return this.subviews.fs.reset();
    });
    this.listenTo(this.subviews.submenu, 'edit-metadata', () => {
      return this.showEditMetadata();
    });
    this.listenTo(this.subviews.submenu, 'save-edit-metadata', () => {
      return this.subviews.editMetadata.save();
    });
    this.listenTo(this.subviews.submenu, 'cancel-edit-metadata', () => {
      return this.hideEditMetadata();
    });
    this.listenToOnce(this.subviews.fs, 'change:results', () => {
      return this.subviews.submenu.enableEditMetadataButton();
    });
    this.listenTo(this.subviews.fs, 'change:results', (responseModel) => {
      var project;
      project = projects.current;
      project.resultSet = responseModel;
      return project.get('entries').add(responseModel.get('results'), {
        merge: true
      });
    });
    this.listenTo(this.subviews.fs, 'result:click', (data) => {
      var url;
      // console.log data
      // TODO get href from model
      url = `projects/${this.project.get('name')}/entries/${data.id}`;
      return Backbone.history.navigate(url, {
        trigger: true
      });
    });
    return this.listenTo(this.subviews.fs, 'result:layer-click', (textLayer, data) => {
      var splitLayer, textLayerSlug, url;
      if (textLayer != null) {
        // TODO Move logic to model
        splitLayer = textLayer.split(' ');
        if (splitLayer[splitLayer.length - 1] === 'annotations') {
          splitLayer.pop();
          textLayer = splitLayer.join(' ');
        }
        textLayerSlug = stringFn.slugify(textLayer);
        url = `projects/${this.project.get('name')}/entries/${data.id}`;
        url += `/transcriptions/${textLayerSlug}`;
        return Backbone.history.navigate(url, {
          trigger: true
        });
      }
    });
  }

  private showEditMetadata() {
    this.subviews.submenu.$el.addClass('submenu-edit-metadata');
    this.$('.faceted-search-placeholder').hide();
    this.subviews.editMetadata = new EditMetadata({
      entryMetadataFields: this.project.get('entrymetadatafields'),
      resultModel: this.subviews.fs.searchResults.getCurrent(),
      isMetadataVisible: this.subviews.fs.results.isMetadataVisible
    } as any);
    this.$el.append(this.subviews.editMetadata.el);
    this.listenTo(this.subviews.editMetadata, 'activate-save-button', () => {
      return this.subviews.submenu.activateEditMetadataSaveButton();
    });
    this.listenTo(this.subviews.editMetadata, 'deactivate-save-button', () => {
      return this.subviews.submenu.deactivateEditMetadataSaveButton();
    });
    return this.listenTo(this.subviews.editMetadata, 'saved', () => {
      this.hideEditMetadata();
      return this.subviews.fs.reset();
    });
  }

  private hideEditMetadata() {
    this.subviews.submenu.$el.removeClass('submenu-edit-metadata');
    this.$('.faceted-search-placeholder').show();
    this.subviews.editMetadata.destroy();
    return delete this.subviews.editMetadata;
  }

};

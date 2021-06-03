import Backbone from "backbone";
import StrFn from "hilib/utils/string";
import FacetedSearch from "./faceted-search/coffee/main";
import config from "../../../models/config";
import projects from "../../../collections/projects";
import token from "hilib/managers/token";
import Base from "hilib/views/base";
import Submenu from "./submenu";
import EditMetadata from "./edit-metadata";
export default class Search extends Base {
    initialize(options) {
        this.options = options;
        super.initialize();
        this.subviews = {};
        return projects.getCurrent((project1) => {
            this.project = project1;
            this.render();
            this.listenTo(this.project, 'change:entrymetadatafields', (values) => {
                return this.subviews.fs.config.set({
                    entryMetadataFields: values
                });
            });
            return this.listenTo(this.project, 'change:level1 change:level2 change:level3', () => {
                return this.subviews.fs.config.set({
                    levels: [this.project.get('level1'), this.project.get('level2'), this.project.get('level3')]
                });
            });
        });
    }
    render() {
        this.renderSubmenu();
        this.renderFacetedSearch();
        this._addListeners();
        return this;
    }
    renderSubmenu() {
        this.subviews.submenu = new Submenu();
        return this.$el.html(this.subviews.submenu.$el);
    }
    renderFacetedSearch() {
        var div, level, levels, sortParameters;
        div = document.createElement('div');
        div.className = 'faceted-search-placeholder';
        this.$el.append(div);
        levels = [this.project.get('level1'), this.project.get('level2'), this.project.get('level3')];
        sortParameters = (function () {
            var i, len, results;
            results = [];
            for (i = 0, len = levels.length; i < len; i++) {
                level = levels[i];
                results.push({
                    fieldname: level,
                    direction: 'asc'
                });
            }
            return results;
        })();
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
        });
        return this.subviews.fs.search();
    }
    _addListeners() {
        this.listenTo(this.subviews.submenu, 'newsearch', () => {
            return this.subviews.fs.reset();
        });
        this.listenTo(this.subviews.submenu, 'edit-metadata', () => {
            return this._showEditMetadata();
        });
        this.listenTo(this.subviews.submenu, 'save-edit-metadata', () => {
            return this.subviews.editMetadata.save();
        });
        this.listenTo(this.subviews.submenu, 'cancel-edit-metadata', () => {
            return this._hideEditMetadata();
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
            url = `projects/${this.project.get('name')}/entries/${data.id}`;
            return Backbone.history.navigate(url, {
                trigger: true
            });
        });
        return this.listenTo(this.subviews.fs, 'result:layer-click', (textLayer, data) => {
            var splitLayer, textLayerSlug, url;
            if (textLayer != null) {
                splitLayer = textLayer.split(' ');
                if (splitLayer[splitLayer.length - 1] === 'annotations') {
                    splitLayer.pop();
                    textLayer = splitLayer.join(' ');
                }
                textLayerSlug = StrFn.slugify(textLayer);
                url = `projects/${this.project.get('name')}/entries/${data.id}`;
                url += `/transcriptions/${textLayerSlug}`;
                return Backbone.history.navigate(url, {
                    trigger: true
                });
            }
        });
    }
    _showEditMetadata() {
        this.subviews.submenu.$el.addClass('submenu-edit-metadata');
        this.$('.faceted-search-placeholder').hide();
        this.subviews.editMetadata = new EditMetadata({
            entryMetadataFields: this.project.get('entrymetadatafields'),
            resultModel: this.subviews.fs.searchResults.getCurrent(),
            isMetadataVisible: this.subviews.fs.results.isMetadataVisible
        });
        this.$el.append(this.subviews.editMetadata.el);
        this.listenTo(this.subviews.editMetadata, 'activate-save-button', () => {
            return this.subviews.submenu.activateEditMetadataSaveButton();
        });
        this.listenTo(this.subviews.editMetadata, 'deactivate-save-button', () => {
            return this.subviews.submenu.deactivateEditMetadataSaveButton();
        });
        return this.listenTo(this.subviews.editMetadata, 'saved', () => {
            this._hideEditMetadata();
            return this.subviews.fs.reset();
        });
    }
    _hideEditMetadata() {
        this.subviews.submenu.$el.removeClass('submenu-edit-metadata');
        this.$('.faceted-search-placeholder').show();
        this.subviews.editMetadata.destroy();
        return delete this.subviews.editMetadata;
    }
}
;
Search.prototype.className = 'search';

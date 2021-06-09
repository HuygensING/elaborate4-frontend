import Backbone from "backbone"
import _ from "underscore"
import SearchResult from "../models/searchresult"
import { req as funckyReq } from "@elaborate4-frontend/funcky"
import { model } from "@elaborate4-frontend/hilib"

@model(SearchResult)
export default class SearchResults extends Backbone.Collection {
  config
  cachedModels
  _current

  /*
  @constructs
  @param {object[]} models
  @param {object} options
  @param {Backbone.Model} options.config
  */
  constructor(models, options) {
    super(models, options)
    this.config = options.config

    // Init cachedModels in the initialize function, because when defined in the class
    // as a property, it is defined on the prototype and thus not refreshed when we instantiate
    // a new Collection.
    this.cachedModels = {}
  }

  // Hold a count of the number of run queries. We can't use @length, because
  // if the second query is fetched from cache, the length stays at length one.
  // @queryAmount = 0

    // @on 'add', @_setCurrent, @
  clearCache() {
    return this.cachedModels = {};
  }

  getCurrent() {
    return this._current;
  }

  _setCurrent(_current, changeMessage) {
    this._current = _current;
    return this.trigger(changeMessage, this._current);
  }

  /*
  Add the latest search result model to a collection for caching.

  @method
  @param {string} url - Base location of the resultModel. Is used to fetch parts of the result which are not prev or next but at a different place (for example: row 100 - 110) in the result set.
  @param {object} attrs - The properties/attributes of the resultModel.
  @param {string} cacheId - The ID to file the props/attrs under for caching.
  @param {string} changeMessage - The event message to trigger.
  */
  _addModel(url, attrs, cacheId, changeMessage) {
    attrs.location = url;
    this.cachedModels[cacheId] = new this.model(attrs);
    this.add(this.cachedModels[cacheId]);
    return this._setCurrent(this.cachedModels[cacheId], changeMessage);
  }

  // @trigger changeMessage, @cachedModels[cacheId]
  /*
  @method
  @param {object} queryOptions
  @param {object} [options={}]
  @param {boolean} options.cache - Determines if the result can be fetched from the cachedModels (searchResult models). In case of a reset or a refresh, options.cache is set to false.
  */
  runQuery(queryOptions, options: any = {}) {
    var changeMessage, queryOptionsString;
    if (options.cache == null) {
      options.cache = true;
    }
    changeMessage = 'change:results';
    // @queryAmount = @queryAmount + 1

    // Artifact?
    // if queryOptions.hasOwnProperty 'resultRows'
    //   resultRows = queryOptions.resultRows
    //   delete queryOptions.resultRows
    queryOptionsString = JSON.stringify(queryOptions);
    // The search results are cached by the query options string,
    // so we check if there is such a string to find the cached result.
    if (options.cache && this.cachedModels.hasOwnProperty(queryOptionsString)) {
      return this._setCurrent(this.cachedModels[queryOptionsString], changeMessage);
    } else {
      return this.postQuery(queryOptions, (url) => {
        var getUrl;
        getUrl = `${url}?rows=${this.config.get('resultRows')}`;
        return this.getResults(getUrl, (response) => {
          return this._addModel(url, response, queryOptionsString, changeMessage);
        });
      });
    }
  }

  moveCursor(direction) {
    var changeMessage, url;
    url = direction === '_prev' || direction === '_next' ? this._current.get(direction) : direction;
    changeMessage = 'change:cursor';
    if (url != null) {
      if (this.cachedModels.hasOwnProperty(url)) {
        return this._setCurrent(this.cachedModels[url], changeMessage);
      } else {
        return this.getResults(url, (response) => {
          return this._addModel(this._current.get('location'), response, url, changeMessage);
        });
      }
    }
  }

  // TODO breaking for Rembench, database isn't send back. Add to result model.
  page(pagenumber, database) {
    var changeMessage, start, url;
    changeMessage = 'change:page';
    start = this.config.get('resultRows') * (pagenumber - 1);
    url = this._current.get('location') + `?rows=${this.config.get('resultRows')}&start=${start}`;
    if (database != null) {
      url += `&database=${database}`;
    }
    if (this.cachedModels.hasOwnProperty(url)) {
      return this._setCurrent(this.cachedModels[url], changeMessage);
    } else {
      return this.getResults(url, (response) => {
        return this._addModel(this._current.get('location'), response, url, changeMessage);
      });
    }
  }

  postQuery(queryOptions, done) {
    var ajaxOptions, req;
    this.trigger('request');
    ajaxOptions = {
      data: JSON.stringify(queryOptions)
    };
    if (this.config.has('authorizationHeaderToken')) {
      ajaxOptions.headers = {
        Authorization: this.config.get('authorizationHeaderToken')
      };
    }
    // This is used for extra options to the ajax call,
    // such as setting custom headers (e.g., VRE_ID)
    if (this.config.has('requestOptions')) {
      _.extend(ajaxOptions, this.config.get('requestOptions'));
    }
    req = funckyReq.post(this.config.get('baseUrl') + this.config.get('searchPath'), ajaxOptions);
    req.done((res) => {
      if (res.status === 201) {
        // @postURL = res.getResponseHeader('Location')
        // url = if @config.has('resultRows') then @postURL + '?rows=' + @config.get('resultRows') else @postURL
        // Add number of results to fetch.
        return done(res.getResponseHeader('Location'));
      }
    });
    return req.fail((res) => {
      if (res.status === 401) {
        return this.trigger('unauthorized');
      } else {
        this.trigger('request:failed', res);
        throw new Error('Failed posting FacetedSearch queryOptions to the server!');
      }
    });
  }

  getResults(url, done) {
    this.trigger('request');
    let options
    if (this.config.has('authorizationHeaderToken')) {
      options = {
        headers: {
          Authorization: this.config.get('authorizationHeaderToken')
        }
      };
    }
    // Fire GET request.
    const req = funckyReq.get(url, options);
    req.done((res) => {
      done(JSON.parse(res.responseText));
      return this.trigger('sync');
    });
    return req.fail((res) => {
      if (res.status === 401) {
        return this.trigger('unauthorized');
      } else {
        this.trigger('request:failed', res);
        throw new Error('Failed getting FacetedSearch results from the server!');
      }
    });
  }

};

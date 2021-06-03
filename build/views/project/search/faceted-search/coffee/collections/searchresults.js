var Backbone, SearchResult, SearchResults, _, funcky;
SearchResults = (function () {
    class SearchResults extends Backbone.Collection {
        initialize(models, options) {
            this.config = options.config;
            return this.cachedModels = {};
        }
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
        _addModel(url, attrs, cacheId, changeMessage) {
            attrs.location = url;
            this.cachedModels[cacheId] = new this.model(attrs);
            this.add(this.cachedModels[cacheId]);
            return this._setCurrent(this.cachedModels[cacheId], changeMessage);
        }
        runQuery(queryOptions, options = {}) {
            var changeMessage, queryOptionsString;
            if (options.cache == null) {
                options.cache = true;
            }
            changeMessage = 'change:results';
            queryOptionsString = JSON.stringify(queryOptions);
            if (options.cache && this.cachedModels.hasOwnProperty(queryOptionsString)) {
                return this._setCurrent(this.cachedModels[queryOptionsString], changeMessage);
            }
            else {
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
                }
                else {
                    return this.getResults(url, (response) => {
                        return this._addModel(this._current.get('location'), response, url, changeMessage);
                    });
                }
            }
        }
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
            }
            else {
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
            if (this.config.has('requestOptions')) {
                _.extend(ajaxOptions, this.config.get('requestOptions'));
            }
            req = funcky.post(this.config.get('baseUrl') + this.config.get('searchPath'), ajaxOptions);
            req.done((res) => {
                if (res.status === 201) {
                    return done(res.getResponseHeader('Location'));
                }
            });
            return req.fail((res) => {
                if (res.status === 401) {
                    return this.trigger('unauthorized');
                }
                else {
                    this.trigger('request:failed', res);
                    throw new Error('Failed posting FacetedSearch queryOptions to the server!', res);
                }
            });
        }
        getResults(url, done) {
            var options, req;
            this.trigger('request');
            if (this.config.has('authorizationHeaderToken')) {
                options = {
                    headers: {
                        Authorization: this.config.get('authorizationHeaderToken')
                    }
                };
            }
            req = funcky.get(url, options);
            req.done((res) => {
                done(JSON.parse(res.responseText));
                return this.trigger('sync');
            });
            return req.fail((res) => {
                if (res.status === 401) {
                    return this.trigger('unauthorized');
                }
                else {
                    this.trigger('request:failed', res);
                    throw new Error('Failed getting FacetedSearch results from the server!', res);
                }
            });
        }
    }
    ;
    SearchResults.prototype.model = SearchResult;
    return SearchResults;
}).call(this);
export default SearchResults;

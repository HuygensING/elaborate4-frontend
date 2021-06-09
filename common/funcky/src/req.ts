// WIP
var hasProp = {}.hasOwnProperty

export const req = {
  get: function(url, options = {}) {
    return this._sendRequest('GET', url, options);
  },
  post: function(url, options = {}) {
    return this._sendRequest('POST', url, options);
  },
  put: function(url, options = {}) {
    return this._sendRequest('PUT', url, options);
  },
  _promise: function() {
    return {
      done: function(fn) {
        return this.callDone = fn;
      },
      callDone: null,
      fail: function(fn) {
        return this.callFail = fn;
      },
      callFail: null,
      always: function(fn) {
        return this.callAlways = fn;
      },
      callAlways: null
    };
  },
  _sendRequest: function(method, url, options: any = {}) {
    var header, promise, ref, value, xhr;
    promise = this._promise();
    if (options.headers == null) {
      options.headers = {};
    }
    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      var ref;
      if (xhr.readyState === 4) {
        if (promise.callAlways != null) {
          promise.callAlways(xhr);
        }
        if ((200 <= (ref = xhr.status) && ref <= 206) || xhr.status === 1223) {
          if (promise.callDone != null) {
            return promise.callDone(xhr);
          }
        } else {
          if (promise.callFail != null) {
            return promise.callFail(xhr);
          }
        }
      }
    };
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    ref = options.headers;
    for (header in ref) {
      if (!hasProp.call(ref, header)) continue;
      value = ref[header];
      xhr.setRequestHeader(header, value);
    }
    xhr.send(options.data);
    return promise;
  }
};

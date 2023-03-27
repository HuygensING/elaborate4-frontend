import $  from "jquery";

// FIX Should not be used: http://api.jquery.com/jquery.support/
// $.support.cors = true
import { token }  from "./token";

const defaultOptions = {
  // A use case for the token option is when we have a project which uses tokens to authorize,
  // but we want to make a request which shouldn't send the Authorization header. For example
  // when doing a file upload.
  token: true
};

export const ajax = {
  token: null,
  get: function(args, options = {}) {
    return this.fire('get', args, options);
  },
  post: function(args, options = {}) {
    return this.fire('post', args, options);
  },
  put: function(args, options = {}) {
    return this.fire('put', args, options);
  },
  // Keep requesting *url until *testFn returns true. Call *done afterwards.
  poll: function(args) {
    var done, dopoll, testFn, url;
    ({url, testFn, done} = args);
    dopoll = () => {
      var xhr;
      xhr = this.get({
        url: url
      });
      return xhr.done((data, textStatus, jqXHR) => {
        if (testFn(data)) {
          return done(data, textStatus, jqXHR);
        } else {
          return setTimeout(dopoll, 5000);
        }
      });
    };
    return dopoll();
  },
  fire: function(type, args, options) {
    var ajaxArgs;
    options = $.extend({}, defaultOptions, options);
    ajaxArgs = {
      type: type,
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      processData: false,
      crossDomain: true
    };
    if (options.token && (token.get() != null)) {
      ajaxArgs.beforeSend = (xhr) => {
        return xhr.setRequestHeader('Authorization', `${token.getType()} ${token.get()}`);
      };
    } else {
      ajaxArgs.beforeSend = (xhr) => {};
    }
    return $.ajax($.extend(ajaxArgs, args));
  }
};

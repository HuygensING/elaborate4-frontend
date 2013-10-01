(function() {
  define(function(require) {
    var EntryMetadata, Models, ajax, config, token;
    config = require('config');
    token = require('managers/token');
    ajax = require('managers/ajax');
    Models = {
      state: require('models/state')
    };
    return EntryMetadata = (function() {
      var url;

      url = null;

      function EntryMetadata(projectID) {
        url = "" + config.baseUrl + "projects/" + projectID + "/entrymetadatafields";
      }

      EntryMetadata.prototype.fetch = function(cb) {
        var jqXHR;
        ajax.token = token.get();
        jqXHR = ajax.get({
          url: url
        });
        return jqXHR.done(function(data) {
          return cb(data);
        });
      };

      EntryMetadata.prototype.save = function(newValues) {
        var jqXHR;
        ajax.token = token.get();
        return jqXHR = ajax.put({
          url: url,
          data: newValues
        });
      };

      return EntryMetadata;

    })();
  });

}).call(this);

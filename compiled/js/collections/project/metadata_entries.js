(function() {
  define(function(require) {
    var Models, ProjectMetadataEntries, config, token;
    config = require('config');
    token = require('managers/token');
    Models = {
      state: require('models/state')
    };
    return ProjectMetadataEntries = (function() {
      function ProjectMetadataEntries() {}

      ProjectMetadataEntries.prototype.fetch = function(cb) {
        var _this = this;
        return Models.state.getCurrentProjectId(function(id) {
          var jqXHR;
          jqXHR = $.ajax({
            url: "" + config.baseUrl + "projects/" + id + "/entrymetadatafields",
            type: 'get',
            dataType: 'json',
            beforeSend: function(xhr) {
              return xhr.setRequestHeader('Authorization', "SimpleAuth " + (token.get()));
            }
          });
          return jqXHR.done(function(data) {
            return cb(data);
          });
        });
      };

      return ProjectMetadataEntries;

    })();
  });

}).call(this);

(function() {
  define(function(require) {
    var Models, ProjectStatistics, config, token;
    config = require('config');
    token = require('hilib/managers/token');
    Models = {
      state: require('models/state')
    };
    return ProjectStatistics = (function() {
      function ProjectStatistics() {}

      ProjectStatistics.prototype.fetch = function(cb) {
        var jqXHR,
          _this = this;
        jqXHR = $.ajax({
          url: "" + config.baseUrl + "projects/" + Collections.projects.current.id + "/statistics",
          type: 'get',
          dataType: 'json',
          beforeSend: function(xhr) {
            return xhr.setRequestHeader('Authorization', "SimpleAuth " + (token.get()));
          }
        });
        return jqXHR.done(function(data) {
          return cb(data);
        });
      };

      return ProjectStatistics;

    })();
  });

}).call(this);

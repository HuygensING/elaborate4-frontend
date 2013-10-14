(function() {
  define(function(require) {
    var ProjectStatistics, config, token;
    config = require('config');
    token = require('hilib/managers/token');
    return ProjectStatistics = (function() {
      function ProjectStatistics(projectID) {
        this.projectID = projectID;
      }

      ProjectStatistics.prototype.fetch = function(cb) {
        var jqXHR,
          _this = this;
        jqXHR = $.ajax({
          url: "" + config.baseUrl + "projects/" + this.projectID + "/statistics",
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

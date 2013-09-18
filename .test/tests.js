define(function(require) {
  var chai, should;
  chai = require('chai');
  should = chai.should();
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("module", function() {
    return describe("method", function() {
      return it("should", function() {});
    });
  });
  describe("Fn", function() {
    var Fn;
    Fn = require('helpers/fns');
    describe("slugify", function() {
      return it("should slugify strings", function() {
        Fn.slugify("Jack & Jill like numbers 1,2,3 and 4 and silly characters ?%.$!/").should.equal("jack-jill-like-numbers-123-and-4-and-silly-characters");
        Fn.slugify("Un éléphant à l'orée du bois").should.equal("un-elephant-a-loree-du-bois");
        return Fn.slugify("I am a word too, even though I am but a single letter: i!").should.equal("i-am-a-word-too-even-though-i-am-but-a-single-letter--i");
      });
    });
    describe("generateID()", function() {
      it("Without parameters the ID should have 8 chars", function() {
        return Fn.generateID().should.have.length(8);
      });
      it("With a parameter (1-20) the ID should have the length (1-20) of the parameter", function() {
        var i, _i, _results;
        _results = [];
        for (i = _i = 1; _i < 20; i = ++_i) {
          _results.push(Fn.generateID(i).should.have.length(i));
        }
        return _results;
      });
      return it("An ID starts with a letter", function() {
        return Fn.generateID().should.match(/^[a-zA-Z]/);
      });
    });
    describe("deepCopy()", function() {
      var originalArray, originalObject;
      originalArray = ["sint", "niklaas", 14, ["la", "li"]];
      originalObject = {
        Sint: "Niklaas",
        Jan: "Maat",
        During: 12,
        la: {
          li: "leuk"
        }
      };
      it("should create an equal copy of an object", function() {
        var copy;
        copy = Fn.deepCopy(originalObject);
        return copy.should.eql(originalObject);
      });
      it("should create an equal copy of an array", function() {
        var copy;
        copy = Fn.deepCopy(originalArray);
        return copy.should.eql(originalArray);
      });
      return it("should not reference", function() {
        var copy;
        copy = Fn.deepCopy(originalObject);
        copy.la.li = "lachen";
        return copy.should.not.eql(originalObject);
      });
    });
    describe("timeoutWithReset()", function() {
      return it("should fire only once", function(done) {
        var cb_called;
        cb_called = 0;
        Fn.timeoutWithReset(18, function() {
          return cb_called++;
        });
        Fn.timeoutWithReset(22, function() {
          return cb_called++;
        });
        return setTimeout((function() {
          cb_called.should.equal(1);
          return done();
        }), 50);
      });
    });
    describe("stripTags(str)", function() {
      return it("should strip the tags from a string", function() {
        var str;
        str = "This is <b>very</b> <input /> strange";
        Fn.stripTags(str).should.not.contain("<b>");
        Fn.stripTags(str).should.not.contain("</b>");
        return Fn.stripTags(str).should.not.contain("<input />");
      });
    });
    return describe("onlyNumbers", function() {
      return it("should strip all non numbers from a string", function() {
        var str;
        str = "<10>_$%11 There were 12 little piggies, what! 14? Yeah! 13";
        return Fn.onlyNumbers(str).should.equal("1011121413");
      });
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("Token", function() {
    var token;
    token = require('managers/token');
    describe("set", function() {
      token.set('somecooltoken');
      it("should set sessionStorage.elaborate_token", function() {
        return sessionStorage.getItem('elaborate_token').should.equal('somecooltoken');
      });
      return it("should set @token", function() {
        return token.token.should.equal('somecooltoken');
      });
    });
    return describe("get", function() {
      it("should get @token", function() {
        sessionStorage.removeItem('elaborate_token');
        return token.get().should.equal('somecooltoken');
      });
      it("should get sessionStorage.elaborate_token if no @token is present", function() {
        sessionStorage.setItem('elaborate_token', 'somecooltoken2');
        token.token = null;
        return token.get().should.equal('somecooltoken2');
      });
      return it("should publish unauthorized if no @token or sessionStorage.elaborate_token is found", function(done) {
        var finished;
        sessionStorage.removeItem('elaborate_token');
        token.token = null;
        finished = false;
        token.subscribe('unauthorized', function() {
          if (!finished) {
            done();
          }
          return finished = true;
        });
        return token.get();
      });
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("currentUser", function() {
    var Backbone, currentUser;
    currentUser = require('models/currentUser');
    Backbone = require('backbone');
    before(function() {
      var pw, un;
      currentUser.clear();
      sessionStorage.clear();
      un = $('<input type="text" id="username" />').val('root');
      pw = $('<input type="password" id="password" />').val('toor');
      $('#sandbox').append(un);
      return $('#sandbox').append(pw);
    });
    describe("authorize", function() {
      return it("should have a token, user and projects", function() {});
    });
    describe("login", function() {
      it("should call authorized event on correct credentials", function(done) {
        var finished;
        finished = false;
        Backbone.on('authorized', function() {
          if (!finished) {
            done();
          }
          return finished = true;
        });
        return currentUser.login();
      });
      it("should set a sessionStorage.huygens_user", function() {
        return sessionStorage.getItem('huygens_user').should.exist;
      });
      it("should restore the user from sessionStorage", function(done) {
        currentUser.clear();
        Backbone.on('authorized', function() {
          currentUser.id.should.be.a('number');
          currentUser.off('authorized');
          return done();
        });
        return currentUser.login();
      });
      return it("should call unauthorized cb on incorrect credentials", function(done) {
        currentUser.clear();
        sessionStorage.clear();
        $('#password').val('wrongpass');
        Backbone.on('unauthorized', function() {
          return done();
        });
        return currentUser.login();
      });
    });
    return after(function() {
      currentUser.off();
      return $('#password').val('qe9hEtra');
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
  return describe("", function() {
    return describe("", function() {
      return it("", function() {});
    });
  });
});

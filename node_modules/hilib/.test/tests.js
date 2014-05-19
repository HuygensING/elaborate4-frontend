define(function(require) {
  var chai, should;
  chai = require('chai');
  should = chai.should();
  describe("Fn", function() {
    var Fn;
    Fn = require('hilib/functions/general');
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
    describe("compareJSON()", function() {
      var changed, changes, current;
      current = {
        test: 'toets',
        taat: 12,
        trier: 'teflon',
        tramp: ['tre', ['tro'], ['try']],
        trap: {
          la: 'li',
          lo: {
            le: 'ly'
          }
        },
        lamp: {
          lem: ['tre', ['tro'], ['try']]
        },
        lip: [
          {
            la: 'lomp'
          }, {
            le: 'limp'
          }, {
            ly: 'lemp'
          }
        ]
      };
      changed = {
        tast: 'toets',
        taat: 14,
        trier: 'teflan',
        tramp: ['tre', ['tro'], ['tre']],
        trap: {
          la: 'li',
          lo: {
            le: 'lo'
          }
        },
        lamp: {
          lem: ['tre', ['tro'], ['tre']]
        },
        lip: [
          {
            la: 'lomp'
          }, {
            le: 'lamp'
          }, {
            ly: 'lemp'
          }
        ]
      };
      changes = Fn.compareJSON(current, changed);
      it("should set test to removed", function() {
        return changes.test.should.eql('removed');
      });
      it("should set tast to added", function() {
        return changes.tast.should.eql('added');
      });
      it("should set trier value (String) to the new value ('teflan')", function() {
        return changes.trier.should.eql(changed.trier);
      });
      it("should set taat value (Number) to the new value (14)", function() {
        return changes.taat.should.eql(changed.taat);
      });
      it("should set tramp value (Array) to the new value (Array)", function() {
        return changes.tramp.should.eql(changed.tramp);
      });
      it("should set trap value (Object) to the new value (Object)", function() {
        return changes.trap.should.eql(changed.trap);
      });
      it("should set lip value (Array of Objects) to the new value (Array of Object)", function() {
        return changes.lip.should.eql(changed.lip);
      });
      return it("should set lamp value (Object with nested Array) to the new value (Object with nested Array)", function() {
        return changes.lamp.should.eql(changed.lamp);
      });
    });
    return describe("isObjectLiteral()", function() {
      it("should return true on an object literal", function() {
        return Fn.isObjectLiteral({}).should.be.ok;
      });
      it("should return true on an instantiated object", function() {
        return Fn.isObjectLiteral(new Object()).should.be.ok;
      });
      it("should return false on an array", function() {
        return Fn.isObjectLiteral([]).should.not.be.ok;
      });
      it("should return false on a string", function() {
        return Fn.isObjectLiteral('lali').should.not.be.ok;
      });
      return it("should return false on an instantiated object", function() {
        return Fn.isObjectLiteral(new Number()).should.not.be.ok;
      });
    });
  });
  describe("jQuery mixins", function() {
    require('hilib/functions/jquery.mixin');
    describe("(el:contains(query))", function() {
      var $div;
      $div = null;
      before(function() {
        var text;
        text = '<span>Dit is test tekst!</span><span>Tekst is test dit!</span><span>Dit is test text!</span><span>Text is test dit!</span>';
        return $div = $('<div id="testdiv" />').html(text);
      });
      it('should find two els when searching for "tekst"', function() {
        return $div.find('span:contains(tekst)').length.should.equal(2);
      });
      it('should find one el when searching for "test text"', function() {
        return $div.find('span:contains(test text)').length.should.equal(1);
      });
      return it('should find four els when searching for "dit"', function() {
        return $div.find('span:contains(dit)').length.should.equal(4);
      });
    });
    describe("(el).scrollTo(pos)", function() {
      var $div, pos;
      pos = void 0;
      $div = void 0;
      before(function() {
        $div = $("<div id=\"scrollablediv\" style=\"width: 100px; height: 100px; overflow: auto\" />");
        $div.html("<p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p id=\"anchor\" style=\"color: red;\">some<br>text</p><p>some<br>text</p>");
        $("#sandbox").html($div);
        return pos = $("#anchor").position();
      });
      beforeEach(function() {
        return $div.scrollTop(0);
      });
      return it("should scroll", function(done) {
        var scrolled;
        scrolled = false;
        $div.scroll(function() {});
        scrolled = true;
        return $div.scrollTo(pos.top, {
          duration: 100,
          complete: function() {
            scrolled.should.be.ok;
            return done();
          }
        });
      });
    });
    return describe("(el).highlight()", function() {
      var $span;
      $span = void 0;
      before(function() {
        return $span = $("<span />").html("test span");
      });
      it("sets the highlight class", function() {
        $span.highlight(200);
        return $span.hasClass("highlight").should.be.ok;
      });
      return it("removes the highlight class after 0.2s delay", function(done) {
        return setTimeout((function() {
          $span.hasClass("highlight").should.not.be.ok;
          return done();
        }), 300);
      });
    });
  });
  describe("StringFn", function() {
    var StringFn;
    StringFn = require('hilib/functions/string');
    describe("slugify", function() {
      return it("should slugify strings", function() {
        StringFn.slugify("Jack & Jill like numbers 1,2,3 and 4 and silly characters ?%.$!/").should.equal("jack-jill-like-numbers-123-and-4-and-silly-characters");
        StringFn.slugify("Un éléphant à l'orée du bois").should.equal("un-elephant-a-loree-du-bois");
        return StringFn.slugify("I am a word too, even though I am but a single letter: i!").should.equal("i-am-a-word-too-even-though-i-am-but-a-single-letter--i");
      });
    });
    describe("stripTags(str)", function() {
      return it("should strip the tags from a string", function() {
        var str;
        str = "This is <b>very</b> <input /> strange";
        StringFn.stripTags(str).should.not.contain("<b>");
        StringFn.stripTags(str).should.not.contain("</b>");
        return StringFn.stripTags(str).should.not.contain("<input />");
      });
    });
    return describe("onlyNumbers", function() {
      return it("should strip all non numbers from a string", function() {
        var str;
        str = "<10>_$%11 There were 12 little piggies, what! 14? Yeah! 13";
        return StringFn.onlyNumbers(str).should.equal("1011121413");
      });
    });
  });
  describe("Token", function() {
    var token;
    token = require('hilib/managers/token');
    describe("set", function() {
      token.set('somecooltoken');
      it("should set sessionStorage.huygens_token", function() {
        return sessionStorage.getItem('huygens_token').should.equal('somecooltoken');
      });
      return it("should set @token", function() {
        return token.token.should.equal('somecooltoken');
      });
    });
    return describe("get", function() {
      it("should get @token", function() {
        sessionStorage.removeItem('huygens_token');
        return token.get().should.equal('somecooltoken');
      });
      return it("should get sessionStorage.huygens_token if no @token is present", function() {
        sessionStorage.setItem('huygens_token', 'somecooltoken2');
        token.token = null;
        return token.get().should.equal('somecooltoken2');
      });
    });
  });
  describe("Managers:View", function() {
    var Backbone, BaseView, StringFn, mainEl, options, viewManager;
    Backbone = require('backbone');
    viewManager = require('hilib/managers/view');
    BaseView = require('hilib/views/base');
    StringFn = require('hilib/functions/string');
    mainEl = document.createElement('div');
    viewManager.el = mainEl;
    options = {
      tagName: 'span',
      className: 'test'
    };
    return afterEach(function() {
      return viewManager.clear();
    });
  });
  return describe("Pubsub", function() {
    var pubsub, pubsubObj;
    pubsub = require('hilib/mixins/pubsub');
    pubsubObj = _.extend(Backbone.Events, pubsub);
    describe("publish", function() {
      return it("should trigger an event on Backbone", function(done) {
        Backbone.on('my_event', function() {
          return done();
        });
        return pubsubObj.publish('my_event');
      });
    });
    return describe("subscribe", function() {
      return it("should receive an event from Backbone", function(done) {
        pubsubObj.subscribe('my_event2', function() {
          return done();
        });
        return Backbone.trigger('my_event2');
      });
    });
  });
});

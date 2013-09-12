(function() {
  define(function(require) {
    var $;
    $ = require('jquery');
    return {
      slugify: function(str) {
        var from, index, strlen, to;
        from = "àáäâèéëêìíïîòóöôùúüûñç·/_:;";
        to = "aaaaeeeeiiiioooouuuunc-----";
        str = str.trim().toLowerCase();
        strlen = str.length;
        while (strlen--) {
          index = from.indexOf(str[strlen]);
          if (index !== -1) {
            str = str.substr(0, strlen) + to[index] + str.substr(strlen + 1);
          }
        }
        return str.replace(/[^a-z0-9 -]/g, '').replace(/\s+|\-+/g, '-').replace(/^\-+|\-+$/g, '');
      },
      /*
      	Generates an ID that starts with a letter
      	
      	Example: "aBc12D34"
      
      	param Number length of the id
      	return String
      */

      generateID: function(length) {
        var chars, text;
        length = (length != null) && length > 0 ? length - 1 : 7;
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        text = chars.charAt(Math.floor(Math.random() * 52));
        while (length--) {
          text += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return text;
      },
      /*
      	Deepcopies arrays and object literals
      	
      	return Array or object
      */

      deepCopy: function(object) {
        var newEmpty;
        newEmpty = Array.isArray(object) ? [] : {};
        return $.extend(true, newEmpty, object);
      },
      /*
      	Starts a timer which resets when it is called again.
      	
      	Example: with a scroll event, when a user stops scrolling, the timer ends.
      		Without the reset, the timer would fire dozens of times.
      	
      	return Function
      */

      timeoutWithReset: (function() {
        var timer;
        timer = 0;
        return function(ms, cb) {
          clearTimeout(timer);
          return timer = setTimeout(cb, ms);
        };
      })(),
      /*
      	Strips the tags from a string
      	
      	Example: "This is a <b>string</b>." => "This is a string."
      	
      	return String
      */

      stripTags: function(str) {
        return $('<span />').html(str).text();
      },
      /*
      	Removes non numbers from a string
      	
      	Example: "There are 12 monkeys." => "12"
      	
      	return String
      */

      onlyNumbers: function(str) {
        return str.replace(/[^\d.]/g, '');
      }
    };
  });

}).call(this);

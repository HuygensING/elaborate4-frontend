import $  from "jquery";

export default {
  // Capitalize the first letter of a string 
  ucfirst: function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  /*
  Slugify a string
  */
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
  Strips the tags from a string

  Example: "This is a <b>string</b>." => "This is a string."

  return String
  */
  stripTags: function(str) {
    return $('<span />').html(str).text();
  },
  /*
  Removes non numbers from a string

  Example: "Count the 12 monkeys." => "12"

  return String
  */
  onlyNumbers: function(str) {
    return str.replace(/[^\d.]/g, '');
  },
  hashCode: function(str) {
    var c, chr, hash, i, j, len;
    if (str.length === 0) {
      return false;
    }
    hash = 0;
    for (i = j = 0, len = str.length; j < len; i = ++j) {
      chr = str[i];
      c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash;
    }
    return hash;
  },
  insertAt: function(str, needle, index) {
    return str.slice(0, index) + needle + str.slice(index);
  }
};

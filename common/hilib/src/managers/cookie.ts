// //** COOKIE MANAGER **// Credits: http://www.quirksmode.org/js/cookies.html
export default {
  get: function(name) {
    var c, i, len, nameEQ, ref;
    nameEQ = name + "=";
    ref = document.cookie.split(';');
    for (i = 0, len = ref.length; i < len; i++) {
      c = ref[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1, c.length);
      }
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
  },
  set: function(name, value, days) {
    var date, expires;
    if (days) {
      date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "expires=" + date.toGMTString();
    } else {
      expires = "";
    }
    return document.cookie = `${name}=${value}; ${expires}; path=/`;
  },
  remove: function(name) {
    return this.set(name, "", -1);
  }
};

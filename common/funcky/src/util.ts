export const util = {
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
    text = chars.charAt(Math.floor(Math.random() * 52)); // Start with a letter
    while (length--) { // Countdown is more lightweight than for-loop
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  },
  // Starts a timer which resets when it is called again. The third arg is a function
  // which is called everytime the timer is reset. You can use it, for example, to animate
  // a visual object on reset (shake, pulse, or whatever).

  // Example: with a scroll event, when a user stops scrolling, the timer ends.
  // Without the reset, the timer would fire dozens of times.
  // Can also be handy to avoid double clicks.

  // Example usages:
  // div.addEventListener 'scroll', (ev) ->
  // 	Fn.timeoutWithReset 200, -> console.log('finished!')

  // div.addEventListener 'click', (ev) ->
  // 	Fn.timeoutWithReset 5000, (=> $message.removeClass 'active'), =>
  // 		$message.addClass 'shake'
  // 		setTimeout (=> $message.removeClass 'shake'), 200

  // return Function
  setResetTimeout: (function() {
    let timer = null;
    return function(ms, cb, onResetFn?) {
      if (timer != null) {
        if (onResetFn != null) {
          onResetFn();
        }
        clearTimeout(timer);
      }
      return timer = setTimeout((function() {
        // clearTimeout frees the memory, but does not clear the var. So we manually clear it,
        // otherwise onResetFn will be called on the next call to timeoutWithReset.
        timer = null;
        // Trigger the callback.
        return cb();
      }), ms);
    };
  })()
};

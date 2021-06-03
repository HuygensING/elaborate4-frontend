import $  from "jquery";

(function(jQuery) {
  jQuery.expr[":"].contains = $.expr.createPseudo(function(arg) {
    return function(elem) {
      return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
  });
  // @ts-ignore
  jQuery.fn.scrollTo = function(newPos, args) {
    var defaults, extraOffset, options, scrollTop, top;
    defaults = {
      start: function() {},
      complete: function() {},
      duration: 500
    };
    options = $.extend(defaults, args);
    if (options.start) {
      options.start();
    }
    scrollTop = this.scrollTop();
    top = this.offset().top;
    extraOffset = 60;
    newPos = newPos + scrollTop - top - extraOffset;
    if (newPos !== scrollTop) {
      return this.animate({
        scrollTop: newPos
      }, options.duration, options.complete);
    } else {
      return options.complete();
    }
  };
  // @ts-ignore
  jQuery.fn.highlight = function(delay) {
    delay = delay || 3000;
    this.addClass('highlight');
    return setTimeout((() => {
      return this.removeClass('highlight');
    }), delay);
  };
  /*
  Render remove button in element
  */
 // @ts-ignore
  return jQuery.fn.appendCloseButton = function(args: any = {}) {
    var $closeButton, close, corner, html;
    ({corner, html, close} = args);
    if (html == null) {
      html = '<img src="/images/icon.close.png">';
    }
    if (corner == null) {
      corner = 'topright';
    }
    $closeButton = $('<div class="closebutton">').html(html);
    $closeButton.css('position', 'absolute');
    $closeButton.css('opacity', '0.2');
    $closeButton.css('cursor', 'pointer');
    switch (corner) {
      case 'topright':
        $closeButton.css('right', '8px');
        $closeButton.css('top', '8px');
        break;
      case 'bottomright':
        $closeButton.css('right', '8px');
        $closeButton.css('bottom', '8px');
    }
    this.prepend($closeButton);
    $closeButton.hover((function(ev) {
      return $closeButton.css('opacity', 100);
    }), (function(ev) {
      return $closeButton.css('opacity', 0.2);
    }));
    return $closeButton.click(() => {
      return close();
    });
  };
})($);


// visible = false

// closeButton.onmouseover = 

// mousemoveEl.onmousemove = (ev) =>
// 	console.log 'move'
// 	if ev.target is el or @isDescendant el, ev.target
// 		if corner is 'topright' and bb.right - 30 < ev.pageX < bb.right and bb.top < ev.pageY < bb.top + 30
// 			if not visible
// 				closeButton.style.display = 'block'
// 				visible = true
// 		else
// 			closeButton.style.display = 'none'
// 			visible = false
// 	else
// 		closeButton.style.display = 'none'
// 		visible = false

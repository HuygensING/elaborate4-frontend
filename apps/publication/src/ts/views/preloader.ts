var Preloader;

Preloader = class Preloader {
  loadImage(src, onLoaded) {
    var img;
    img = new Image()
    if (img.addEventListener) {
      img.addEventListener('load', function() {
        return onLoaded(src)
      })
    } else {
      img.attachEvent('onload', function() {
        return onLoaded(src)
      })
    }
    return img.src = src;
  }

}

module.exports = new Preloader()

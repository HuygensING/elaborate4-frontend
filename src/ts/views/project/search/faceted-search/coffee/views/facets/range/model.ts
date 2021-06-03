import FacetModel from "../../../models/facets/main"

import _ from "underscore"

export default class RangeFacet extends FacetModel {
  constructor(...args: any) {
    super(...args);
  }

  defaults() {
    return _.extend({}, super.defaults, {
      min: null,
      max: null,
      currentMin: null,
      currentMax: null,
      handleMinLeft: null,
      handleMaxLeft: null,
      sliderWidth: null
    });
  }

  // options: {}
  initialize() {
    return this.once('change', () => {
      this.on('change:currentMin', (model, value) => {
        return this.set({
          handleMinLeft: this.getLeftFromYear(value)
        });
      });
      this.on('change:currentMax', (model, value) => {
        return this.set({
          handleMaxLeft: this.getLeftFromYear(value)
        });
      });
      this.on('change:handleMinLeft', (model, value) => {
        return this.set({
          currentMin: this.getYearFromLeft(value)
        });
      });
      return this.on('change:handleMaxLeft', (model, value) => {
        return this.set({
          currentMax: this.getYearFromLeft(value)
        });
      });
    });
  }

  set(attrs, options?) {
    if (attrs.hasOwnProperty('currentMin')) {
      if (attrs.currentMin > this.get('currentMax')) {
        attrs.currentMax = +attrs.currentMin;
        attrs.currentMin = this.get('currentMax');
      }
    }
    if (attrs.hasOwnProperty('currentMax')) {
      if (attrs.currentMax < this.get('currentMin')) {
        attrs.currentMin = +attrs.currentMax;
        attrs.currentMax = this.get('currentMin');
      }
    }
    // The new currentMin can't be smaller than the initial min.
    if (attrs.hasOwnProperty('currentMin') && this.has('min') && attrs.currentMin < this.get('min')) {
      attrs.currentMin = this.get('min');
    }
    // The new currentMax can't be bigger than the initial max.
    if (attrs.hasOwnProperty('currentMax') && this.has('max') && attrs.currentMax > this.get('max')) {
      attrs.currentMax = this.get('max');
    }
    return super.set(attrs, options);
  }

  parse(attrs) {
    super.parse(attrs);
    attrs.min = attrs.currentMin = this.convertLimit2Year(attrs.options[0].lowerLimit);
    attrs.max = attrs.currentMax = this.convertLimit2Year(attrs.options[0].upperLimit);
    delete attrs.options;
    return attrs;
  }

  // CUSTOM METHODS
  /*
  Convert the lower and upper limit string to a year.
  For example "20141213" returns 2014; "8000101" returns 800.

  @method convertLimit2Year
  @param {number} limit - Lower or upper limit, for example: 20141213
  @returns {number} A year, for example: 2014
  */
  convertLimit2Year(limit) {
    var year;
    year = limit + '';
    if (year.length === 8) {
      year = year.substr(0, 4);
    } else if (year.length === 7) {
      year = year.substr(0, 3);
    } else {
      throw new Error("RangeFacet: lower or upper limit is not 7 or 8 chars!");
    }
    return +year;
  }

  /*
  Convert a year to a lower or upper limit string
  For example: 2014 returns "20141231"; 800 returns "8000101".

  @method convertLimit2Year
  @param {number} year - A year
  @param {boolean} from - If from is true, the limit start at januari 1st, else it ends at december 31st
  @returns {number} A limit, for example: 20140101
  */
  _convertYear2Limit(year, from = true) {
    var limit;
    limit = year + '';
    limit += from ? "0101" : "1231";
    return +limit;
  }

  getLowerLimit() {
    return this._convertYear2Limit(this.get('currentMin'));
  }

  getUpperLimit() {
    return this._convertYear2Limit(this.get('currentMax'), false);
  }

  reset() {
    return this.set({
      currentMin: this.get('min'),
      currentMax: this.get('max'),
      lowerLimit: this.get('min'),
      upperLimit: this.get('max')
    });
  }

  // Given a year, return the left position in px.
  getLeftFromYear(year) {
    var hhw, ll, sw, ul;
    ll = this.get('min');
    ul = this.get('max');
    sw = this.get('sliderWidth');
    hhw = this.get('handleWidth') / 2;
    return (((year - ll) / (ul - ll)) * sw) - hhw;
  }

  // Given a left position in px, return the corresponding year.
  // Inverse of @getLeftFromYear
  getYearFromLeft(left) {
    var hhw, ll, sw, ul;
    ll = this.get('min');
    ul = this.get('max');
    hhw = this.get('handleWidth') / 2;
    sw = this.get('sliderWidth');
    return Math.round((((left + hhw) / sw) * (ul - ll)) + ll);
  }

  dragMin = (pos) => {
    var handelWidthHalf;
    handelWidthHalf = this.get('handleWidth') / 2;
    if (((-handelWidthHalf) <= pos && pos <= this.get('handleMaxLeft'))) {
      return this.set({
        handleMinLeft: pos
      });
    }
  }

  dragMax = (pos) => {
    if ((this.get('handleMinLeft') < pos && pos <= this.get('sliderWidth') - (this.get('handleWidth') / 2))) {
      return this.set({
        handleMaxLeft: pos
      });
    }
  }
};

var FacetModel, RangeFacet, _, boundMethodCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) {
    throw new Error('Bound instance method accessed before binding');
} };
RangeFacet = class RangeFacet extends FacetModel {
    constructor() {
        super(...arguments);
        this.dragMin = this.dragMin.bind(this);
        this.dragMax = this.dragMax.bind(this);
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
    set(attrs, options) {
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
        if (attrs.hasOwnProperty('currentMin') && this.has('min') && attrs.currentMin < this.get('min')) {
            attrs.currentMin = this.get('min');
        }
        if (attrs.hasOwnProperty('currentMax') && this.has('max') && attrs.currentMax > this.get('max')) {
            attrs.currentMax = this.get('max');
        }
        return super.set();
    }
    parse(attrs) {
        super.parse();
        attrs.min = attrs.currentMin = this.convertLimit2Year(attrs.options[0].lowerLimit);
        attrs.max = attrs.currentMax = this.convertLimit2Year(attrs.options[0].upperLimit);
        delete attrs.options;
        return attrs;
    }
    convertLimit2Year(limit) {
        var year;
        year = limit + '';
        if (year.length === 8) {
            year = year.substr(0, 4);
        }
        else if (year.length === 7) {
            year = year.substr(0, 3);
        }
        else {
            throw new Error("RangeFacet: lower or upper limit is not 7 or 8 chars!");
        }
        return +year;
    }
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
    getLeftFromYear(year) {
        var hhw, ll, sw, ul;
        ll = this.get('min');
        ul = this.get('max');
        sw = this.get('sliderWidth');
        hhw = this.get('handleWidth') / 2;
        return (((year - ll) / (ul - ll)) * sw) - hhw;
    }
    getYearFromLeft(left) {
        var hhw, ll, sw, ul;
        ll = this.get('min');
        ul = this.get('max');
        hhw = this.get('handleWidth') / 2;
        sw = this.get('sliderWidth');
        return Math.round((((left + hhw) / sw) * (ul - ll)) + ll);
    }
    dragMin(pos) {
        var handelWidthHalf;
        boundMethodCheck(this, RangeFacet);
        handelWidthHalf = this.get('handleWidth') / 2;
        if (((-handelWidthHalf) <= pos && pos <= this.get('handleMaxLeft'))) {
            return this.set({
                handleMinLeft: pos
            });
        }
    }
    dragMax(pos) {
        boundMethodCheck(this, RangeFacet);
        if ((this.get('handleMinLeft') < pos && pos <= this.get('sliderWidth') - (this.get('handleWidth') / 2))) {
            return this.set({
                handleMaxLeft: pos
            });
        }
    }
};
export default RangeFacet;

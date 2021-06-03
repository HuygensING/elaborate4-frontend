import Facet from "./main";
export default class BooleanFacet extends Facet {
    set(attrs, options) {
        if (attrs === 'options') {
            options = this.parseOptions(options);
        }
        else if (attrs.hasOwnProperty('options')) {
            attrs.options = this.parseOptions(attrs.options);
        }
        return super.set(attrs, options);
    }
    parseOptions(options) {
        var ref;
        options = (ref = this.get('options')) != null ? ref : options;
        if (options.length === 1) {
            options.push({
                name: (!JSON.parse(options[0].name)).toString(),
                count: 0
            });
        }
        return options;
    }
}

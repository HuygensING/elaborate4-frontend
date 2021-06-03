var Backbone, Facet, config;
Facet = (function () {
    class Facet extends Backbone.Model {
        defaults() {
            return {
                name: null,
                title: null,
                type: null,
                options: null
            };
        }
    }
    ;
    Facet.prototype.idAttribute = 'name';
    return Facet;
}).call(this);
export default Facet;

var Backbone, Config, _, basePath, envConfig, us;
basePath = window.BASE_URL;
if (basePath === '/') {
    basePath = '';
}
Config = class Config extends Backbone.Model {
    url() {
        return `${basePath}/data/config.json`;
    }
    defaults() {
        return _.extend(envConfig, {
            basePath: basePath,
            appRootElement: '#app',
            entryTermSingular: 'entry',
            entryTermPlural: 'entries',
            searchPath: "api/search",
            resultRows: 25,
            annotationsIndexPath: `${basePath}/data/annotation_index.json`,
            roles: {
                'READER': 10,
                'USER': 20,
                'PROJECTLEADER': 30,
                'ADMIN': 40
            },
            activeTextLayerId: null,
            activeTextLayerIsAnnotationLayer: null
        });
    }
    parse(data) {
        var entry, i, j, len, len1, ref, ref1, textlayer, tls;
        ref = data.entries;
        for (i = 0, len = ref.length; i < len; i++) {
            entry = ref[i];
            entry._id = +entry.datafile.replace('.json', '');
            entry.thumbnails = data.thumbnails[entry._id];
        }
        tls = [];
        ref1 = data.textLayers;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
            textlayer = ref1[j];
            tls.push({
                id: textlayer
            });
        }
        data.textlayers = tls;
        return data;
    }
    set(attrs, options) {
        var sanitizeTextLayer;
        sanitizeTextLayer = (textLayer) => {
            var splitLayer;
            splitLayer = textLayer.split(' ');
            if (splitLayer[splitLayer.length - 1] === 'annotations') {
                splitLayer.pop();
                textLayer = splitLayer.join(' ');
                this.set('activeTextLayerIsAnnotationLayer', true);
            }
            else {
                this.set('activeTextLayerIsAnnotationLayer', false);
            }
            return us.slugify(textLayer);
        };
        if (attrs === 'activeTextLayerId' && (options != null)) {
            options = sanitizeTextLayer(options);
        }
        else if (attrs.hasOwnProperty('activeTextLayerId' && (attrs.activeTextLayerId != null))) {
            attrs.activeTextLayerId = sanitizeTextLayer(attrs[activeTextLayerId]);
        }
        return super.set();
    }
    slugToLayer(slug) {
        var i, layer, len, ref;
        ref = this.get('textLayers') || [];
        for (i = 0, len = ref.length; i < len; i++) {
            layer = ref[i];
            if (slug === us.slugify(layer)) {
                return layer;
            }
        }
    }
};
export default new Config();

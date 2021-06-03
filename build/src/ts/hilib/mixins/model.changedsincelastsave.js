export default function (attrs) {
    return {
        changedSinceLastSave: null,
        initChangedSinceLastSave: function () {
            var attr, i, len, results;
            this.on('sync', () => {
                return this.changedSinceLastSave = null;
            });
            results = [];
            for (i = 0, len = attrs.length; i < len; i++) {
                attr = attrs[i];
                results.push(this.on(`change:${attr}`, (model, options) => {
                    if (this.changedSinceLastSave == null) {
                        return this.changedSinceLastSave = model.previousAttributes()[attr];
                    }
                }));
            }
            return results;
        },
        cancelChanges: function () {
            var attr, i, len;
            for (i = 0, len = attrs.length; i < len; i++) {
                attr = attrs[i];
                this.set(attr, this.changedSinceLastSave);
            }
            return this.changedSinceLastSave = null;
        }
    };
}
;

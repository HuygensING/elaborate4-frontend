var $, Backbone, Fn, Form, Views, _, validation, hasProp = {}.hasOwnProperty, boundMethodCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) {
    throw new Error('Bound instance method accessed before binding');
} };
Views = {
    import: Base, from, "../base": 
};
Form = (function () {
    class Form extends Views.Base {
        constructor() {
            super(...arguments);
            this.addSubform = this.addSubform.bind(this);
            this.renderSubform = this.renderSubform.bind(this);
        }
        initialize(options1 = {}) {
            var base, ref;
            this.options = options1;
            super.initialize();
            _.extend(this, validation);
            if ((base = this.options).saveOnSubmit == null) {
                base.saveOnSubmit = true;
            }
            if (this.subformConfig == null) {
                this.subformConfig = this.options.subformConfig;
            }
            if (this.subformConfig == null) {
                this.subformConfig = {};
            }
            if (this.Model == null) {
                this.Model = this.options.Model;
            }
            if (this.Model == null) {
                this.Model = Backbone.Model;
            }
            this.tplData = (ref = this.options.tplData) != null ? ref : {};
            if (this.tpl == null) {
                this.tpl = this.options.tpl;
            }
            if (this.tpl == null) {
                throw 'Unknow template!';
            }
            this.on('createModels:finished', this.render, this);
            this.createModels();
            this.validatorInit();
            return this.addListeners();
        }
        preRender() { }
        render() {
            var View, attr, ref, rtpl;
            this.preRender();
            this.tplData.viewId = this.cid;
            if (this.model != null) {
                this.tplData.model = this.model;
            }
            if (this.collection != null) {
                this.tplData.collection = this.collection;
            }
            if (this.tpl == null) {
                throw 'Unknow template!';
            }
            rtpl = _.isString(this.tpl) ? _.template(this.tpl, this.tplData) : this.tpl(this.tplData);
            this.$el.html(rtpl);
            if (this.subforms == null) {
                this.subforms = {};
            }
            ref = this.subforms;
            for (attr in ref) {
                if (!hasProp.call(ref, attr))
                    continue;
                View = ref[attr];
                this.addSubform(attr, View);
            }
            this.$('textarea').each((index, textarea) => {
                return textarea.style.height = textarea.scrollHeight + 6 > 32 ? textarea.scrollHeight + 6 + 'px' : '32px';
            });
            this.postRender();
            return this;
        }
        postRender() { }
        events() {
            var evs;
            evs = {};
            evs[`keyup [data-model-id='${this.model.cid}'] textarea`] = "inputChanged";
            evs[`keyup [data-model-id='${this.model.cid}'] input`] = "inputChanged";
            evs[`change [data-model-id='${this.model.cid}'] input[type=\"checkbox\"]`] = "inputChanged";
            evs[`change [data-model-id='${this.model.cid}'] select`] = "inputChanged";
            evs[`keydown [data-model-id='${this.model.cid}'] textarea`] = "textareaKeyup";
            evs["click input[type=\"submit\"]"] = "submit";
            evs["click button[name=\"submit\"]"] = "submit";
            evs["click button[name=\"cancel\"]"] = "cancel";
            return evs;
        }
        inputChanged(ev) {
            var model, value;
            model = this.model != null ? this.model : this.getModel(ev);
            value = ev.currentTarget.type === 'checkbox' ? ev.currentTarget.checked : ev.currentTarget.value;
            if (ev.currentTarget.name !== '') {
                return model.set(ev.currentTarget.name, value);
            }
        }
        textareaKeyup(ev) {
            ev.currentTarget.style.height = '32px';
            return ev.currentTarget.style.height = ev.currentTarget.scrollHeight + 6 + 'px';
        }
        saveModel(validate = true) {
            return this.model.save([], {
                validate: validate,
                success: (model, response, options) => {
                    var target;
                    this.trigger('save:success', model, response, options);
                    target = typeof ev !== "undefined" && ev !== null ? this.$(ev.currentTarget) : this.$('button[name="submit"]');
                    target.removeClass('loader');
                    return target.addClass('disabled');
                },
                error: (model, xhr, options) => {
                    return this.trigger('save:error', model, xhr, options);
                }
            });
        }
        submit(ev) {
            var invalids, target;
            ev.preventDefault();
            target = this.$(ev.currentTarget);
            if (!(target.hasClass('loader') || target.hasClass('disabled'))) {
                target.addClass('loader');
                if (this.options.saveOnSubmit) {
                    return this.saveModel();
                }
                else {
                    invalids = this.model.validate(this.model.attributes);
                    if (invalids != null) {
                        return this.model.trigger('invalid', this.model, invalids);
                    }
                    else {
                        return this.trigger('submit', this.model);
                    }
                }
            }
        }
        cancel(ev) {
            ev.preventDefault();
            return this.trigger('cancel');
        }
        customAdd() {
            return console.error('Form.customAdd is not implemented!');
        }
        reset() {
            var target;
            target = this.$('button[name="submit"]');
            target.removeClass('loader');
            target.addClass('disabled');
            this.stopListening(this.model);
            this.model = this.model.clone();
            this.model.clear({
                silent: true
            });
            this.model.set(this.model.defaults());
            this.validatorInit();
            this.addListeners();
            this.delegateEvents();
            this.el.querySelector('[data-model-id]').setAttribute('data-model-id', this.model.cid);
            return this.el.reset();
        }
        createModels() {
            var base;
            if (this.model == null) {
                if ((base = this.options).value == null) {
                    base.value = {};
                }
                this.model = new this.Model(this.options.value);
                if (this.model.isNew()) {
                    return this.trigger('createModels:finished');
                }
                else {
                    return this.model.fetch({
                        success: () => {
                            return this.trigger('createModels:finished');
                        }
                    });
                }
            }
            else {
                return this.trigger('createModels:finished');
            }
        }
        addListeners() {
            this.listenTo(this.model, 'change', () => {
                return this.triggerChange();
            });
            return this.listenTo(this.model, 'invalid', (model, errors, options) => {
                var error, found, i, len;
                if (this.options.validationAttributes != null) {
                    found = false;
                    for (i = 0, len = errors.length; i < len; i++) {
                        error = errors[i];
                        if (this.options.validationAttributes.indexOf(error.name) > -1) {
                            found = true;
                        }
                    }
                    if (!found) {
                        this.$('button[name="submit"]').addClass('loader');
                        return this.saveModel(false);
                    }
                }
            });
        }
        triggerChange() {
            var object;
            object = this.model != null ? this.model : this.collection;
            return this.trigger('change', object.toJSON(), object);
        }
        addSubform(attr, View) {
            boundMethodCheck(this, Form);
            return this.renderSubform(attr, View, this.model);
        }
        renderSubform(attr, View, model) {
            var htmlSafeAttr, placeholders, value, view;
            boundMethodCheck(this, Form);
            value = attr.indexOf('.') > -1 ? Fn.flattenObject(model.attributes)[attr] : model.get(attr);
            if (value == null) {
                console.error('Subform value is undefined!', this.model);
            }
            view = new View({
                value: value,
                config: this.subformConfig[attr]
            });
            this.subviews.push(view);
            htmlSafeAttr = attr.split('.').join('_');
            placeholders = this.el.querySelectorAll(`[data-cid='${model.cid}'] .${htmlSafeAttr}-placeholder`);
            if (placeholders.length > 1) {
                _.each(placeholders, (placeholder) => {
                    var el;
                    el = Fn.closest(placeholder, '[data-cid]');
                    if (el.getAttribute('data-cid') === model.cid && placeholder.innerHTML === '') {
                        return placeholder.appendChild(view.el);
                    }
                });
            }
            else {
                placeholders[0].appendChild(view.el);
            }
            this.listenTo(view, 'change', (data) => {
                return model.set(attr, data);
            });
            this.listenTo(view, 'customAdd', this.customAdd);
            return this.listenTo(view, 'change:data', (models) => {
                return this.subformConfig[attr].data = this.subformConfig[attr].data.reset(models);
            });
        }
        destroy() {
            var i, len, ref, view;
            ref = this.subviews;
            for (i = 0, len = ref.length; i < len; i++) {
                view = ref[i];
                view.destroy();
            }
            return this.remove();
        }
    }
    ;
    Form.prototype.tagName = 'form';
    Form.prototype.className = 'hilib';
    return Form;
}).call(this);
export default Form;

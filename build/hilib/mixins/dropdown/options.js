export default {
    dropdownOptionsInitialize: function () {
        return this.resetCurrentOption();
    },
    resetCurrentOption: function () {
        return this.currentOption = null;
    },
    setCurrentOption: function (model) {
        this.currentOption = model;
        return this.trigger('currentOption:change', this.currentOption);
    },
    prev: function () {
        var previousIndex;
        previousIndex = this.indexOf(this.currentOption) - 1;
        if (previousIndex < 0) {
            previousIndex = this.length - 1;
        }
        return this.setCurrentOption(this.at(previousIndex));
    },
    next: function () {
        var nextIndex;
        nextIndex = this.indexOf(this.currentOption) + 1;
        if (nextIndex > (this.length - 1)) {
            nextIndex = 0;
        }
        return this.setCurrentOption(this.at(nextIndex));
    }
};

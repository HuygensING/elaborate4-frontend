var History;
History = (function () {
    class History {
        update() {
            if (window.location.pathname !== '/login') {
                this.history.push(window.location.pathname);
            }
            return sessionStorage.setItem('history', JSON.stringify(this.history));
        }
        clear() {
            return sessionStorage.removeItem('history');
        }
        last() {
            return this.history[this.history.length - 1];
        }
    }
    ;
    History.prototype.history = [];
    return History;
}).call(this);
export default new History();

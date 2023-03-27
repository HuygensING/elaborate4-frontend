class History {
  history = []

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

};

export const history = new History();

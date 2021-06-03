class Token {
    token;
    set(token, type = 'SimpleAuth') {
        this.token = token;
        sessionStorage.setItem('huygens_token_type', type);
        return sessionStorage.setItem('huygens_token', this.token);
    }
    getType() {
        return sessionStorage.getItem('huygens_token_type');
    }
    get() {
        if (this.token == null) {
            this.token = sessionStorage.getItem('huygens_token');
        }
        return this.token;
    }
    clear() {
        sessionStorage.removeItem('huygens_token');
        return sessionStorage.removeItem('huygens_token_type');
    }
}
;
export default new Token();

import xhr from "xhr";

export default {
	docroot: "",

	performXhr(opts, callback) {
		xhr(opts, callback);
	},

	getConfig(callback) {
		this.performXhr({
			method: "GET",
			uri: this.docroot + "/data/config.json"
		}, function(err, resp, body) {
			callback(JSON.parse(body));
		});
	}
};

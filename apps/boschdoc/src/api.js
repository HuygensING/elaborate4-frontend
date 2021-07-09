import xhr from "xhr";

// export default {
// 	performXhr(opts, callback) {
// 		xhr(opts, callback);
// 	},

export function getConfig(callback) {
	xhr({
		method: "GET",
		uri: `/data/config.json`
	}, function(err, resp, body) {
		callback(JSON.parse(body));
	});
}

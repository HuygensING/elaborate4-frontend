import api from "../api";

export function setResults(results) {
	results._next = results._next ? results._next.replace(`${api.docroot}//api`, `${api.docroot}/api`) : null;
	results._prev = results._prev ? results._prev.replace(`${api.docroot}//api`, `${api.docroot}/api`) : null;
	results.ids = results.results.map((r) => { return r.id; });
	return function(dispatch) {
		dispatch({
			type: "SET_RESULTS",
			data: results
		});
	};
}

export function getNextResultPage(url) {
	return function(dispatch) {
		api.performXhr({
			method: "GET",
			uri: url
		}, function(err, resp, data) {
			dispatch({
				type: "NEXT_PAGES_RECEIVE",
				data: JSON.parse(data)
			});
		});
	};
}


export function setLanguage(lang) {
	return function(dispatch) {
		localStorage.setItem("lang", lang);
		dispatch({
			type: "LANGUAGE_TOGGLE",
			data: {current: lang}
		});
	};
}

let cached = {};

export function setController(controller, id, activeTab, annotationId) {
	return function(dispatch) {
		if(id) {
			if(cached[id]) {
				dispatch({
					type: "SET_CONTROLLER",
					data: {
						current: controller,
						id: id,
						activeTab: activeTab,
						annotationId: annotationId,
						data: cached[id]
					}
				});
			} else {
				api.performXhr({
					method: "GET",
					uri: api.docroot + "/data/" + id + ".json"
				}, function(err, resp, data) {
					cached[id] = JSON.parse(data);
					dispatch({
						type: "SET_CONTROLLER",
						data: {
							current: controller,
							id: id,
							activeTab: activeTab,
							annotationId: annotationId,
							data: JSON.parse(data)
						}
					});
				});
			}

		} else {
			dispatch({
				type: "SET_CONTROLLER",
				data: {
					current: controller,
					id: id,
					activeTab: activeTab,
					annotationId: annotationId,
					data: {}
				}
			});
		}
	};
}

import xhr from "xhr";

export function setResults(results) {
	results._next = results._next?.replace(`//api`, `/api`)
	results._prev = results._prev?.replace(`//api`, `/api`)

	results.ids = results.results.map(r => r.id)

	return function(dispatch) {
		dispatch({
			type: "SET_RESULTS",
			data: results
		});
	};
}

export function getNextResultPage(url) {
	return function(dispatch) {
		xhr({
			method: "GET",
			uri: url.replace('https://boschdoc.huygens.knaw.nl/draft', '')
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
		localStorage.setItem("lang", lang)

		dispatch({
			type: "LANGUAGE_TOGGLE",
			data: {current: lang}
		})
	}
}

let cached = {};

export function setSearchController() {
	return function(dispatch) {
		dispatch({
			type: "SET_CONTROLLER",
			data: {
				current: 'search',
			}
		})
	}
}

export function setDocumentController(
	id: string,
	activeTab: string,
	annotationId: string
) {
	return function(dispatch) {
		const shared = {
			current: 'document',
			id,
			activeTab,
			annotationId,
		}

		// Set controller from cache
		if (cached[id]) {
			dispatch({
				type: "SET_CONTROLLER",
				data: {
					...shared,
					data: cached[id]
				}
			})
			return
		}

		// Set controller from fetched data
		xhr({
			method: "GET",
			uri: `/data/${id}.json`
		}, function(err, resp, data) {
			cached[id] = JSON.parse(data);

			dispatch({
				type: "SET_CONTROLLER",
				data: {
					...shared,
					data: JSON.parse(data)
				}
			})
		})
	}
}

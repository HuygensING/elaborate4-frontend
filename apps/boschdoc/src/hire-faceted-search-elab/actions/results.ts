const cache = {}

async function getResults(url: string) {
	const resultResponse = await fetch(url)
	const resultJson = await resultResponse.json()
	return resultJson
}

async function postResults(query, headers, rows) {
	const response = await fetch(
		`${BACKEND_API_URL}search`,
		{
			headers: Object.assign(headers, {
				"Content-Type": "application/json"
			}),
			method: "POST",
			body: query,
		}
	)
	const resultLocation = response.headers.get('Location')
	return await getResults(`${resultLocation}?rows=${rows}`)
};

export function fetchResults() {
	return function (dispatch, getState) {
		dispatch({type: "CLEAR_LIST"});

		let state = getState();
		let query = state.queries.all.length ?
			state.queries.all[state.queries.all.length - 1] :
			state.queries.default;

		let stringifiedQuery = JSON.stringify(query);

		if (cache.hasOwnProperty(stringifiedQuery)) {
			dispatch({
				type: "RECEIVE_RESULTS", 
				response: cache[stringifiedQuery]
			})
		}

		postResults(
			stringifiedQuery,
			state.config.headers || {},
			state.config.rows
		).then(results => {
				cache[stringifiedQuery] = results
			dispatch({
				type: "RECEIVE_RESULTS", 
				response: results
			})
		})
	};
}

export function fetchNextResults(url) {
	return function (dispatch) {
		dispatch({type: "REQUEST_RESULTS"});

		if (cache.hasOwnProperty(url)) {
			dispatch({
				type: "RECEIVE_RESULTS_FROM_URL",
				response: cache[url]
			})
		}

		getResults(url)
			.then(results => {
				cache[url] = results
				dispatch({
					type: "RECEIVE_NEXT_RESULTS",
					response: results
				})
			})
	}
}

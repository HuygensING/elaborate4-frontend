let initialState = {
	id: null,
	current: "search",
	activeTab: "transcription",
	annotationId: null,
	data: {},
	query: null
};


export default function(state=initialState, action) {
	switch (action.type) {
		case "SET_CONTROLLER":
			return {...state, ...action.data};
		case "SET_THEMES":
			console.log("SET_THEMES", action.themes);
			return {...state, query: {facetValues: [{name: "mv_metadata_thema_s", values: action.themes}]}};
		default:
			return state;
	}
}
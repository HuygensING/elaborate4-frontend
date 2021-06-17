let initialState = {
	current: localStorage.getItem("lang") || "nl"
};


export default function(state=initialState, action) {
	switch (action.type) {
		case "LANGUAGE_TOGGLE":
			return {...state, ...action.data};
		default:
			return state;
	}
}
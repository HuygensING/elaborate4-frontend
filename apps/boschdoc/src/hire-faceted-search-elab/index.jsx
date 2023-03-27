import React from "react";
import isEqual from "lodash.isequal";

import Facets from "./components/facets";
import Results from "./components/results";
import Loader from "./components/icons/loader-three-dots";

import {fetchResults, fetchNextResults} from "./actions/results";
import {selectFacetValue, newSearch, setSort, changeSearchTerm, setFacetValues} from "./actions/queries";

import {createStore, applyMiddleware} from "redux";
import reducers from "./reducers";
import thunkMiddleware from "redux-thunk";

import './index.styl'

// const logger = store => next => action => {
// 	if (action.hasOwnProperty("type")) {
// 		console.log(action.type, action);
// 	}

//   return next(action);
// };

let createStoreWithMiddleware = applyMiddleware(/*logger, */thunkMiddleware)(createStore);

class FacetedSearch extends React.Component {
	constructor(props) {
		super(props);
		this.store = createStoreWithMiddleware(reducers);
		this.store.dispatch({
			type: "SET_QUERY_DEFAULTS",
			config: this.props.config
		});

		/**
		 * Overwrite the baseURL with the root of the site.
		 * Site used to be hard coded under /draft, but let's 
		 * try to solve that with the web server config 
		 */
		this.store.dispatch({
			type: "SET_CONFIG_DEFAULTS",
			config: {
				...this.props.config,
				baseURL: '/'
			}
		});

		this.store.dispatch({
			type: "SET_LABELS",
			labels: this.props.labels
		});

		this.state = this.store.getState();
	}

	componentDidMount() {
		this.unsubscribe = this.store.subscribe(() =>
			this.setState(this.store.getState())
		);

		this.store.dispatch(fetchResults());
	}

	componentWillReceiveProps(nextProps) {
		if (!isEqual(this.state.labels, nextProps.labels)) {
			this.store.dispatch({
				type: "SET_LABELS",
				labels: nextProps.labels
			});
		}

		// Set the next query. Use case: on forced rerender or
		// when passing query from one search to another.
		if (nextProps.query != null) {
			this.setQuery(nextProps.query);
		}
	}

	componentWillUpdate(nextProps, nextState) {
		let resultsChanged = this.state.results.last !== nextState.results.last;

		if (resultsChanged) {
			this.props.onChange(nextState.results.last, nextState.queries.last);
		}
	}

	componentWillUnmount() {
		this.unsubscribe();
	}

	setQuery(nextQuery) {
		// TODO: should set entire query!
		if (nextQuery.facetValues && !isEqual(nextQuery.facetValues, this.state.queries.last.facetValues)) {
			this.store.dispatch(setFacetValues(nextQuery.facetValues));
		}
	}

	handleFetchNextResults(url) {
		this.store.dispatch(fetchNextResults(url));
	}

	handleSelectFacetValue(facetName, value, remove) {
		this.store.dispatch(selectFacetValue(facetName, value, remove));
	}

	render() {
		if (this.state.results.all.length === 0) {
			return (
				<div className="hire-faceted-search">
					<Loader className="loader" />
				</div>
			);
		}

		return (
			<div className="hire-faceted-search">
				<Facets
					facetList={this.props.facetList}
					labels={this.state.labels}
					onChangeSearchTerm={(value) =>
						this.store.dispatch(changeSearchTerm(value))
					}
					onNewSearch={() =>
						this.store.dispatch(newSearch())
					}
					onSelectFacetValue={(...args) =>
						this.store.dispatch(selectFacetValue(...args))
					}
					queries={this.state.queries}
					results={this.state.results} />
				<Results
					config={this.state.config}
					labels={this.state.labels}
					onChangeSearchTerm={(value) =>
						this.store.dispatch(changeSearchTerm(value))
					}
					onFetchNextResults={(url) =>
						this.store.dispatch(fetchNextResults(url))
					}
					onSelect={(item) =>
						this.props.onSelect(item)
					}
					onSelectFacetValue={(...args) =>
						this.store.dispatch(selectFacetValue(...args))
					}
					onSetSort={(field) =>
						this.store.dispatch(setSort(field))
					}
					queries={this.state.queries}
					results={this.state.results} />
			</div>
		);
	}
}

FacetedSearch.defaultProps = {
	facetList: [],
	labels: {}
}

export default FacetedSearch;

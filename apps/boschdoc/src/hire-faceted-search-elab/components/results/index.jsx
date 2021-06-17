import React from "react";
import debounce from "lodash.debounce";
import isEqual from "lodash.isequal";

import Result from "./result";
import ResultsSortMenu from "./sort-menu";
import CurrentQuery from "./current-query";

import Loader from "../icons/loader-three-dots";

import './index.styl'

let inViewport = function(el) {
	let rect = el.getBoundingClientRect();

	return rect.height > 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
};

class Results extends React.Component {
	constructor(props) {
		super(props);

		this.onScroll = debounce(this.onScroll, 300).bind(this);
	}

	componentDidMount() {
		window.addEventListener("scroll", this.onScroll);
	}

	componentWillUnmount() {
		window.removeEventListener("scroll", this.onScroll);
	}

	onScroll() {
		let nth = (this.props.results.last.results.length - this.props.config.rows) + 1;

		let listItem = React.findDOMNode(this).querySelector(`.hire-faceted-search-result-list > li:nth-child(${nth})`);
		if (listItem && this.props.results.last.hasOwnProperty("_next") && inViewport(listItem)) {
			let url = this.props.results.last._next.replace("draft//api", "draft/api");
			this.props.onFetchNextResults(url);
		}

	}

	dataToComponents(results) {
		return results.map((data, index) =>
			<Result
				data={data}
				key={index + Math.random()}
				labels={this.props.labels}
				onSelect={this.props.onSelect} />
		);
	}

	render() {
		let loader = (this.props.results.requesting) ?
			<Loader className="loader" /> :
			null;

		return (
			<div className="hire-faceted-search-results">
				<header>
					<h3>{this.props.results.last.numFound} {this.props.labels.resultsFound}</h3>
					<ResultsSortMenu
						labels={this.props.labels}
						onSetSort={this.props.onSetSort}
						values={this.props.queries.last.sortParameters} />
					<CurrentQuery
						labels={this.props.labels}
						onChangeSearchTerm={this.props.onChangeSearchTerm}
						onSelectFacetValue={this.props.onSelectFacetValue}
						queries={this.props.queries}
						results={this.props.results} />
				</header>
				<ul className="hire-faceted-search-result-list">
					{this.dataToComponents(this.props.results.last.results)}
				</ul>
				{loader}
			</div>
		);
	}
}

/** (\w+)\.propTypes = \{
	config: PropTypes.object,
	labels: PropTypes.object,
	onChangeSearchTerm: PropTypes.func,
	onFetchNextResults: PropTypes.func,
	onSelect: PropTypes.func,
	onSelectFacetValue: PropTypes.func,
	onSetSort: PropTypes.func,
	queries: PropTypes.object,
	results: PropTypes.object
};**/

export default Results;

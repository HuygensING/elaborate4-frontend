import React from "react";

import FacetValue from "./facet-value";

import './index.styl'

class CurrentQuery extends React.Component {
	toLabel(name) {
		return (this.props.labels.facetTitles.hasOwnProperty(name)) ?
			this.props.labels.facetTitles[name] :
			name;
	}

	render() {
		let query = this.props.queries.last;

		let searchTerm = (query.term !== "") ?
			<li className="search-term">
				<label>Search term</label>
				<span onClick={this.props.onChangeSearchTerm.bind(this, "")}>{query.term}</span>
			</li> :
			null;

		let facets = query.facetValues
			.map((selectedFacet, index) => {
				let facetTitle;
				let filteredFacets = (this.props.results.last.facets.filter((facet) =>
					facet.name === selectedFacet.name
				));

				if (filteredFacets.length) {
					facetTitle = filteredFacets[0].title;
				} else {
					return new Error("CurrentQuery: facet not found!");
				}

				let facetValues = selectedFacet.values
					.map((value, index2) =>
						<FacetValue
							facetName={selectedFacet.name}
							key={index2}
							onSelectFacetValue={this.props.onSelectFacetValue}
							value={value} />);

				return (
					<li
						className="hire-faceted-search-selected-facet"
						key={index}>
						<label>{this.toLabel(facetTitle)}</label>
						<ul>
							{facetValues}
						</ul>
					</li>);
		});


		return (
			<ul className="hire-faceted-search-current-query">
				{searchTerm}
				{facets}
			</ul>
		);
	}
}

/** (\w+)\.propTypes = \{
	labels: PropTypes.object,
	onChangeSearchTerm: PropTypes.func,
	onSelectFacetValue: PropTypes.func,
	queries: PropTypes.object,
	results: PropTypes.object
};**/

export default CurrentQuery;

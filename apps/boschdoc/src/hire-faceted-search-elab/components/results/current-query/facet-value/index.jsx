import React from "react";

class FacetValue extends React.Component {
	render() {
		return (
			<li
				className="hire-faceted-search-selected-facet-value"
				onClick={this.props.onSelectFacetValue.bind(this, this.props.facetName, this.props.value, true)}>
				{this.props.value}
			</li>
		);
	}
}

/** (\w+)\.propTypes = \{
	facetName: PropTypes.string,
	onSelectFacetValue: PropTypes.func,
	value: PropTypes.string
};**/

export default FacetValue;

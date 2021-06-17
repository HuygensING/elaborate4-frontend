import React from "react";

import CheckedIcon from "../icons/checked";
import UncheckedIcon from "../icons/unchecked";

class ListFacetListItem extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			checked: false
		};
	}

	componentWillReceiveProps(nextProps) {
		this.setState({
			checked: nextProps.checked
		});
	}

	handleClick() {
		this.props.onSelectFacetValue(this.props.facetName, this.props.name, this.props.checked);

		this.setState({
			checked: !this.state.checked
		});
	}

	render() {
		let icon = this.state.checked ?
			<CheckedIcon /> :
			<UncheckedIcon />;

		return (
			<li
				className="hire-list-facet-list-item"
				onClick={this.handleClick.bind(this)}>
				{icon}
				<label title={this.props.name}>{this.props.name}</label>
				<span className="count">{this.props.count}</span>
			</li>
		);
	}
}

ListFacetListItem.defaultProps = {
	count: 0,
	checked: false,
	facetName: "",
	name: ""
};

/** (\w+)\.propTypes = \{
	checked: PropTypes.bool,
	count: PropTypes.number,
	facetName: PropTypes.string,
	name: PropTypes.string,
	onSelectFacetValue: PropTypes.func
};
**/

export default ListFacetListItem;



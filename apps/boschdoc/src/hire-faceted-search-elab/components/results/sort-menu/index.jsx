import React from "react";
import cx from "classnames";

import './index.styl'

class ResultsSortMenu extends React.Component {

	constructor(props) {
		super(props);

		this.state = {
			optionsVisible: false,
			level: props.values.length ? props.values[0] : null
		};
	}

	componentWillReceiveProps(nextProps) {
		this.setState({
			optionsVisible: false,
			level: nextProps.values.length ? nextProps.values[0] : null
		});
	}

	handleButtonClick() {
		this.setState({
			optionsVisible: !this.state.optionsVisible
		});
	}

	handleOptionClick(level) {
		// queriesActions.setSortParameter(level.fieldname);
		this.props.onSetSort(level.fieldname);

		this.setState({
			optionsVisible: false,
			level: level
		});
	}

	toLabel(name) {
		return (this.props.labels.facetTitles.hasOwnProperty(name)) ?
			this.props.labels.facetTitles[name] :
			name;
	}

	render() {
		if (!this.props.values.length) {
			return null;
		}

		let values = this.props.values.map((level, index) =>
			<li
				key={index}
				onClick={this.handleOptionClick.bind(this, level)}>
				{this.toLabel(level.fieldname)}
			</li>
		);

		return (
			<div className="hire-faceted-search-results-sort-menu">
				<button
					onClick={this.handleButtonClick.bind(this)}>
					{this.props.labels.sortBy}: {this.toLabel(this.state.level.fieldname)}
				</button>
				<ul
					className={cx({visible: this.state.optionsVisible})}>
					{values}
				</ul>
			</div>
		);
	}
}

ResultsSortMenu.defaultProps = {
};

/** (\w+)\.propTypes = \{
	labels: PropTypes.object,
	onSetSort: PropTypes.func,
	values: PropTypes.array
};**/

export default ResultsSortMenu;

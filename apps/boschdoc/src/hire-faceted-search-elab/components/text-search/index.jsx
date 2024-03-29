// TODO add searching class to .search-icon when async query is busy

import React from "react";
import cx from "classnames";

import SearchIcon from "../icons/search";

import './index.styl'

class TextSearch extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			value: "",
			searching: false
		}
	}

	componentWillReceiveProps(nextProps) {
		this.setState({
			searching: false,
			value: nextProps.value
		});
	}

	handleInputChange(ev) {
		this.setState({
			value: ev.target.value
		});
	}

	handleInputKeyDown(ev) {
		if (ev.keyCode === 13) {
			this.handleSubmit();
		}
	}

	handleSubmit() {
		this.setState({
			searching: true
		});

		this.props.onChangeSearchTerm(this.state.value);
	}

	render() {
		return (
			<li className="hire-faceted-search-text-search">
				<input
					onKeyDown={this.handleInputKeyDown.bind(this)}
					onChange={this.handleInputChange.bind(this)}
					value={this.state.value} />
				<div className={cx(
					"search-icon", {
						active: this.state.value !== "",
						searching: this.state.searching
					})}
						onClick={this.handleSubmit.bind(this)}>
						<div className="center-vertical">
							<SearchIcon />
						</div>
				</div>
			</li>
		);
	}
}

TextSearch.defaultProps = {

};

/** (\w+)\.propTypes = \{
	onChangeSearchTerm: PropTypes.func
};**/

export default TextSearch;

import React from "react"
import cx from "classnames"

class Tabs extends React.Component {
	handleClick(index) {
		if (this.props.onChange) {
			let tabLabel = React.Children.toArray(this.props.children)[index].props.label;
			this.props.onChange(tabLabel, index);
		}
	}

	render() {
		let labels = React.Children.toArray(this.props.children)
			.map((tab, index) => tab != null ?
				<li
					className={cx({active: tab.props.active})}
					key={index}
					onClick={this.handleClick.bind(this, index)}>
					<span className="label">
						{tab.props.label}
					</span>
				</li> :
				null
			)

		return (
			<div className="hire-tabs">
				<ul>{labels}</ul>
				{this.props.children}
			</div>
		);
	}
}

/** (\w+)\.propTypes = \{
	// children: elementOrArrayOfElement,
	onChange: React.PropTypes.func
};**/

export default Tabs;

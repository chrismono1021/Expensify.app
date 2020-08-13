import React from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import Text from '../../components/Text';
import {Link, withRouter} from '../../lib/Router';
import IONKEYS from '../../IONKEYS';
import styles from '../../style/StyleSheet';
import WithIon from '../../components/WithIon';

const propTypes = {
    // The ID of the report for this link
    reportID: PropTypes.number.isRequired,

    // The name of the report to use as the text for this link
    reportName: PropTypes.string.isRequired,

    // These are from withRouter
    // eslint-disable-next-line react/forbid-prop-types
    match: PropTypes.object.isRequired,

    // Toggles the hamburger menu open and closed
    toggleHamburger: PropTypes.func.isRequired,
};

class SidebarLink extends React.Component {
    constructor(props) {
        super(props);

        this.toggleHamburger = this.props.toggleHamburger.bind(this);
    }

    render() {
        const paramsReportID = parseInt(this.props.match.params.reportID, 10);
        const isReportActive = paramsReportID === this.props.reportID;
        const linkWrapperActiveStyle = isReportActive && styles.sidebarLinkWrapperActive;
        const linkActiveStyle = isReportActive ? styles.sidebarLinkActive : styles.sidebarLink;
        const textActiveStyle = isReportActive ? styles.sidebarLinkActiveText : styles.sidebarLinkText;
        const textActiveUnreadStyle = this.state && this.state.isUnread
            ? [textActiveStyle, styles.sidebarLinkTextUnread] : [textActiveStyle];
        return (
            <View style={[styles.sidebarListItem, linkWrapperActiveStyle]}>
                <Link to={`/${this.props.reportID}`} style={linkActiveStyle}>
                    <View style={[styles.sidebarLinkInner]}>
                        <Text onPress={this.toggleHamburger} numberOfLines={1} style={textActiveUnreadStyle}>
                            {this.props.reportName}
                        </Text>
                    </View>
                </Link>
            </View>
        );
    }
}
SidebarLink.propTypes = propTypes;

export default withRouter(WithIon({
    isUnread: {
        // Bind to ONLY the report object, not the comments (that's why a $ is added at the end of the key name)
        key: `${IONKEYS.REPORT}_%DATAFROMPROPS%$`,
        path: 'hasUnread',
        defaultValue: false,
        pathForProps: 'reportID',
    }
})(SidebarLink));

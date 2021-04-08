import React from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReportActionPropTypes from './ReportActionPropTypes';
import ReportActionItemMessage from './ReportActionItemMessage';
import ReportActionItemFragment from './ReportActionItemFragment';
import styles from '../../../styles/styles';
import CONST from '../../../CONST';
import ReportActionItemDate from './ReportActionItemDate';
import Avatar from '../../../components/Avatar';
import ReportActionItemIOUPreview from '../../../components/ReportActionItemIOUPreview';
import ONYXKEYS from '../../../ONYXKEYS';
import personalDetailsPropType from '../../personalDetailsPropType';

const propTypes = {
    // All the data of the action
    action: PropTypes.shape(ReportActionPropTypes).isRequired,

    // Is this the most recent IOU Action?
    isMostRecentIOUReport: PropTypes.bool.isRequired,

    // All of the personalDetails
    personalDetails: PropTypes.objectOf(personalDetailsPropType).isRequired,

    // The report currently being looked at
    report: PropTypes.shape({

        // IOU report ID associated with current report
        iouReportID: PropTypes.number,
    }).isRequired,
};

const ReportActionItemSingle = ({action, report, isMostRecentIOUReport, personalDetails}) => {
    const {avatar, displayName} = personalDetails[action.actorEmail] || {};
    const avatarUrl = action.automatic
        ? `${CONST.CLOUDFRONT_URL}/images/icons/concierge_2019.svg`

        // Use avatar in personalDetails if we have one then fallback to avatar provided by the action
        : (avatar || action.avatar);

    // Since the display name for a report action message is delivered with the report history as an array of fragments
    // we'll need to take the displayName from personal details and have it be in the same format for now. Eventually,
    // we should stop referring to the report history items entirely for this information.
    const personArray = displayName ? [{type: 'TEXT', text: displayName}] : action.person;
    return (
        <View style={[styles.chatItem]}>
            <Avatar
                style={[styles.actionAvatar]}
                source={avatarUrl}
            />
            <View style={[styles.chatItemRight]}>
                <View style={[styles.chatItemMessageHeader]}>
                    {_.map(personArray, (fragment, index) => (
                        <ReportActionItemFragment
                            key={`person-${action.sequenceNumber}-${index}`}
                            fragment={fragment}
                            tooltipText={action.actorEmail}
                            isAttachment={action.isAttachment}
                            isLoading={action.loading}
                        />
                    ))}
                    <ReportActionItemDate timestamp={action.timestamp} />
                </View>
                {action.actionName === 'IOU'
                    ? (
                        <ReportActionItemIOUPreview
                            report={report}
                            action={action}
                            isMostRecentIOUReport={isMostRecentIOUReport}
                        />
                    )
                    : <ReportActionItemMessage action={action} />}
            </View>
        </View>
    );
};

ReportActionItemSingle.propTypes = propTypes;
export default withOnyx({
    personalDetails: {
        key: ONYXKEYS.PERSONAL_DETAILS,
    },
})(ReportActionItemSingle);

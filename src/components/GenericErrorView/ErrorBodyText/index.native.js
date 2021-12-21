import React from 'react';
import ExpensifyText from '../../ExpensifyText';
import withLocalize, {withLocalizePropTypes} from '../../withLocalize';
import TextLink from '../../TextLink';
import CONST from '../../../CONST';
import styles from '../../../styles/styles';

const propTypes = {
    ...withLocalizePropTypes,
};

const ErrorBodyText = props => (
    <ExpensifyText>
        {props.translate('genericErrorView.body.helpTextMobile')}
        <TextLink href={CONST.NEW_EXPENSIFY_URL} style={[styles.link]}>
            {props.translate('genericErrorView.body.helpTextWeb')}
        </TextLink>
    </ExpensifyText>
);

ErrorBodyText.propTypes = propTypes;
export default withLocalize(ErrorBodyText);

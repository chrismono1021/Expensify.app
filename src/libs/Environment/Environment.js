import Config from 'react-native-config';
import lodashGet from 'lodash/get';
import CONST from '../../CONST';
import getEnvironment from './getEnvironment';

function isDevelopment() {
    return lodashGet(Config, 'ENVIRONMENT', CONST.ENVIRONMENT.DEV) === CONST.ENVIRONMENT.DEV;
}

export {
    getEnvironment,
    isDevelopment,
};

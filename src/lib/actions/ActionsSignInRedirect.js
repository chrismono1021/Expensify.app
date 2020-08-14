import Ion from '../Ion';
import IONKEYS from '../../IONKEYS';
import ROUTES from '../../ROUTES';

/**
 * Redirects to the sign in page and handles adding any exitTo params to the URL.
 * Normally this method would live in ActionsSession.js, but that would cause a circular dependency with Network.js.
 *
 * @returns {Promise}
 */
function redirectToSignIn() {
    return Ion.set(IONKEYS.APP_REDIRECT_TO, ROUTES.SIGNIN);
}

export default redirectToSignIn;

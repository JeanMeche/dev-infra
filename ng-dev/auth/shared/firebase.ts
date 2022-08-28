import {
  GoogleAuthProvider,
  getAuth,
  signInWithCredential,
  linkWithCredential,
  GithubAuthProvider,
} from 'firebase/auth';
import {bold, Log} from '../../utils/logging.js';
import {Prompt} from '../../utils/prompt.js';
import {hasTokenStoreFile} from './ng-dev-token.js';
import {
  deviceCodeOAuthDance,
  authorizationCodeOAuthDance,
  GithubOAuthDanceConfig,
  GoogleOAuthDanceConfig,
} from './oauth.js';

export async function loginToFirebase() {
  /** The type of OAuth dance to do based on whether a session display is available. */
  const oAuthDance = process.env.DISPLAY ? authorizationCodeOAuthDance : deviceCodeOAuthDance;
  try {
    // Only present intial information about usage of login when it appears that the user has
    // not logged into the service in the past.
    if (!(await hasTokenStoreFile())) {
      Log.warn(Array(80).fill('#').join(''));
      Log.warn('The ng-dev auth service uses Google OAuth credentials to log in and create a');
      Log.warn('short lived credential used for authenticating with the ng-dev service.');
      Log.warn('');
      Log.warn('In addition to logging in using Google credentials, upon first login you will be');
      Log.warn('prompted to associate your Github account to your login, allowing the service to');
      Log.warn('perform requests on your your behalf.');
      Log.warn(Array(80).fill('#').join(''));
      if (!(await Prompt.confirm('Continue to login?', true))) {
        return false;
      }
    }

    Log.log(`Please log in using the instructions below with your google.com credentials:`);

    /** The id and access tokens for Google from the oauth login. */
    const {idToken, accessToken} = await oAuthDance(GoogleOAuthDanceConfig);
    /** The credential generated by the GoogleAuthProvider from the OAuth tokens. */
    const googleCredential = GoogleAuthProvider.credential(idToken, accessToken);
    /** The newly signed in user. */
    const {user} = await signInWithCredential(getAuth(), googleCredential);

    // If the user already has a github account linked to their account, the login is complete.
    if (user.providerData.find((provider) => provider.providerId === 'github.com')) {
      Log.debug('Skipping Github linking as the users account is already linked.');
      return true;
    }

    Log.log('');
    Log.log(`There is no Github account currently linked to ${bold(user.email)} in the service,`);
    Log.log('please login using the instructions below to link your Github account.');
    Log.log('');

    /** The access token for Github from the oauth login. */
    const {accessToken: githubAccessToken} = await oAuthDance(GithubOAuthDanceConfig);

    // Link the Github account to the account for the currently logged in user.
    await linkWithCredential(user, GithubAuthProvider.credential(githubAccessToken));
    return true;
  } catch (e) {
    if (e instanceof Error) {
      Log.error(`${e.name}: ${e.message}`);
    } else {
      Log.error(e);
    }
    return false;
  }
}
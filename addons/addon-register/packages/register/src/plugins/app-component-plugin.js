import _ from 'lodash';
import App from '../parts/App';

const nativeUserPool = 'cognito_user_pool';

// eslint-disable-next-line no-unused-vars, consistent-return
function getAppComponent({ location, appContext }) {
  const configs = _.get(appContext, 'authenticationProviderPublicConfigsStore.authenticationProviderPublicConfigs', []);
  const nativeUserPoolConfig = configs.find(({ type }) => type === nativeUserPool) || {};
  const customRegister = _.get(nativeUserPoolConfig, 'customRegister', false);

  if (customRegister) {
    return App;
  }
}

export default { getAppComponent };

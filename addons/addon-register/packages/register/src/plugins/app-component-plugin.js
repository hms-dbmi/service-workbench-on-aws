import App from '../parts/App';
import _ from 'lodash';

const nativeUserPool = 'cognito_user_pool';

const findConfigType = (type, configs) => configs.find(c => c.type === type) || {};

// eslint-disable-next-line no-unused-vars
function getAppComponent({ location, appContext }) {
  const configs = _.get(appContext, 'authenticationProviderPublicConfigsStore.authenticationProviderPublicConfigs', []);
  const nativeUserPoolConfig = findConfigType(nativeUserPool, configs);
  const customRegister = _.get(nativeUserPoolConfig, 'customRegister', false);

  if(customRegister){
    return App;
  }
}

export default { getAppComponent };

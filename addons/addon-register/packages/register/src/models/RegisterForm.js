/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License").
 *  You may not use this file except in compliance with the License.
 *  A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 *  or in the "license" file accompanying this file. This file is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *  express or implied. See the License for the specific language governing
 *  permissions and limitations under the License.
 */

import dvr from 'mobx-react-form/lib/validators/DVR';
import Validator from 'validatorjs';
import MobxReactForm from 'mobx-react-form';

const registerUserFormFields = {
  email: {
    label: 'Email',
    placeholder: 'Email',
    // The regex check for email must be the same as the one applied for native pool presignup lambda 
    rules: [ 'string', 'required', 'regex:/^([^.%+!$&*=^|~#%{}]+)[a-zA-Z0-9\\._%+!$&*=^|~#%{}/\\-]+([^.!]+)@([^-.!](([a-zA-Z0-9\\-]+\\.){1,}([a-zA-Z]{2,63})))/' ]
  },
  firstName: {
    label: 'First Name',
    placeholder: 'First Name',
    rules: 'string|required|between:1,500'
  },
  lastName: {
    label: 'Last Name',
    placeholder: 'Last Name',
    rules: 'string|required|between:1,500'
  },
  terms: {
    label: 'I am 18 years or older and agree to the {TBD with FISMA Government agreement}',
    placeholder: 'Terms & Conditions',
    rules: 'boolean|accepted'
  }
};

function getRegisterFormFields() {
  return registerUserFormFields;
}

function getRegisterForm() {
  const plugins = { dvr: dvr(Validator) }; // , vjf: validator };
  return new MobxReactForm({ fields: registerUserFormFields }, { plugins });
}

export { getRegisterFormFields, getRegisterForm };

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
import _ from 'lodash';
import validate from '@aws-ee/base-ui/dist/models/forms/Validate';
import { branding } from '@aws-ee/base-ui/dist/helpers/settings';

const registerUserFormFields = {
  email: {
    label: 'Email',
    placeholder: 'Email',
    rules: [
      'string',
      'required',
      // The regex check for email must be the same as the one applied for native pool presignup lambda
      'regex:/^([^.%+!$&*=^|~#%{}]+)[a-zA-Z0-9\\._%+!$&*=^|~#%{}/\\-]+([^.!]+)@([^-.!](([a-zA-Z0-9\\-]+\\.){1,}([a-zA-Z]{2,63})))/',
    ],
  },
  firstName: {
    label: 'First Name',
    placeholder: 'First Name',
    rules: 'string|required|between:1,500',
  },
  lastName: {
    label: 'Last Name',
    placeholder: 'Last Name',
    rules: 'string|required|between:1,500',
  },
  terms: {
    label: branding.register.tos,
    placeholder: 'Terms & Conditions',
    rules: 'boolean|accepted',
  },
};

function getRegisterFormFields() {
  return registerUserFormFields;
}

async function formValidationErrors(data) {
  const fields = getRegisterFormFields();
  const validationResult = await validate(data, fields);
  const validation = {
    message: '',
    errors: validationResult.errors,
    failed: validationResult.fails(),
  };

  const fieldErrors = ['firstName', 'lastName', 'email']
    .filter(field => !_.isEmpty(validation.errors.get(field)))
    .map(field => fields[field].placeholder);

  // Return a user friendly message with fields that have not passed validation
  if (fieldErrors.length > 0) {
    const finalField = fieldErrors.pop();
    const fieldString = fieldErrors.length > 0 ? `${fieldErrors.join(', ')} and ${finalField}` : finalField;

    validation.message = `Please populate ${fieldString}.`;
  } else if (!data.terms) {
    validation.message = 'You must accept the terms of service to register.';
  }
  return validation;
}

export { getRegisterFormFields, formValidationErrors };

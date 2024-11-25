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
  affiliation: {
    label: 'AIM-AHEAD Affiliation',
    rules: 'string|required',
    type: 'dropdown',
    help: 'Which AIM-AHEAD program do you belong to? If you are unsure about your AIM-AHEAD Affiliation, please contact your program coordinator.',
    options: [
      { key: 'federated-research-network-hub', value: 'federated-research-network-hub', text: 'Federated Research Network Hub' },
      { key: 'research-fellowship', value: 'research-fellowship', text: 'Research Fellowship' },
      { key: 'hub-specific-pilot-projects', value: 'hub-specific-pilot-projects', text: 'Hub-Specific Pilot Projects' },
      { key: 'consortium-development-project', value: 'consortium-development-project', text: 'Consortium Development Project' },
      { key: 'ai-ml-in-biomedical-research', value: 'ai-ml-in-biomedical-research', text: 'AI/ML in Biomedical Research and Clinical' },
      { key: 'practice-that-embodies-ethics', value: 'practice-that-embodies-ethics', text: 'Practice that Embodies Ethics and Equality (ABC-EE)' },
      { key: 'public-private-partnership', value: 'public-private-partnership', text: 'Public-Private Partnership to Improve Population Health Using Artificial Intelligence and Machine Learning (P4)' },
      { key: 'clinicians-leading-ingenuity', value: 'clinicians-leading-ingenuity', text: 'Clinicians Leading Ingenuity IN AI Quality (CLINIQ)' },
      { key: 'data-infrastructure', value: 'data-infrastructure', text: 'Data Infrastructure and Capacity Building (DICB)' },
      { key: 'consortium-member', value: 'consortium-member', text: 'Consortium Member' },
      { key: 'leadership-fellowship', value: 'leadership-fellowship', text: 'Leadership Fellowship' },
      { key: 'program-for-artifical-intelligence-readiness', value: 'program-for-artifical-intelligence-readiness', text: 'Program for Artificial Intelligence Readiness (PAIR)' },
      { key: 'other', value: 'other', text: 'Other / Not Sure' },
    ],
    placeholder: 'Select your affiliation'
  },
  piName: {
    label: 'Name of PI / Awardee for awarded research',
    placeholder: 'Name of PI / Awardee',
    help: 'Name of the Awardee - who is the program awardee? This may be the person who submitted the infoready application.',
    rules: 'string|required|between:1,500',
  },
  projectName: {
    label: 'Research Project Name',
    placeholder: 'Research Project Name',
    help: 'What is the name of your project? This should match the submitted title name in your infoready application.',
    rules: 'string|required|between:1,500',
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

  const fieldErrors = Object.keys(fields)
    .filter(field => !_.isEmpty(validation.errors.get(field)))
    .map(field => {
      const fieldDef = fields[field];
      return fieldDef.type === 'dropdown' ? `select ${fieldDef.label}` : fieldDef.placeholder;
    });

  // Return a user friendly message with fields that have not passed validation
  if (fieldErrors.length > 0) {
    const finalField = fieldErrors.pop();
    const fieldString = fieldErrors.length > 0 ? `${fieldErrors.join(', ')} and ${finalField}` : finalField;

    validation.message = `Please ${fieldString}.`;
  }
  return validation;
}

export { getRegisterFormFields, formValidationErrors };

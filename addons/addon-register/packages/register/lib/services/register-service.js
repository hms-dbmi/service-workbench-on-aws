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
const Service = require('@aws-ee/base-services-container/lib/service');
const { toUserNamespace } = require('@aws-ee/base-services/lib/user/helpers/user-namespace');
const { generateId } = require('@aws-ee/base-services/lib/helpers/utils');

const jsonSchema = require('../schemas/register-user.json');

const settingKeys = { tableName: 'dbUsers' };

class RegisterUserService extends Service {
  constructor() {
    super();
    this.dependency([
      'auditWriterService',
      'authenticationProviderConfigService',
      'dbService',
      'jsonSchemaValidationService',
      'userService',
    ]);
  }

  async register(requestContext, user) {
    // throws an error on validation that is caught in the controller
    // ../controllers/register-controller.js
    await this.validateUser(user);

    const userData = await this.formatUser(user);

    const existingUser = await this.getUserByPrincipal(userData);
    if (existingUser) {
      // Do not throw an error, log to console for auditing, and return as if it was a success.
      console.error(`Attempt to register a user who already exists. UID ${existingUser.uid}`);
      return;
    }

    const dbService = await this.service('dbService');
    const table = this.settings.get(settingKeys.tableName);
    const result = await dbService.helper
      .updater()
      .table(table)
      .condition('attribute_not_exists(uid)')
      .key({ uid: userData.uid })
      .item(userData)
      .update();

    await this.audit(requestContext, { action: 'register-user', body: result });
  }

  async formatUser(user) {
    const authConfigService = await this.service('authenticationProviderConfigService');
    const authProviders = await authConfigService.getAuthenticationProviderConfigs();
    const providerConfig = authProviders[0].config;

    const { lastName, firstName, email } = user;
    const identityProviderName =
      providerConfig.federatedIdentityProviders.length === 0
        ? providerConfig.title
        : providerConfig.federatedIdentityProviders[0].name;
    const authenticationProviderId = providerConfig.id;
    const ns = toUserNamespace(authenticationProviderId, identityProviderName);
    const uid = await generateId('u-');
    const createdAt = new Date().toISOString();

    return {
      uid,
      createdAt,
      createdBy: '_system_',
      email: email.toLowerCase(),
      username: email.toLowerCase(),
      encryptedCreds: 'N/A',
      firstName,
      lastName,
      identityProviderName,
      authenticationProviderId,
      isAdmin: false,
      isExternalUser: true,
      isNativePoolUser: false,
      isSamlAuthenticatedUser: true,
      ns,
      projectId: [],
      rev: 0,
      status: 'pending',
      userRole: 'researcher',
    };
  }

  async getUserByPrincipal({ username, authenticationProviderId, identityProviderName }) {
    const userService = await this.service('userService');
    return userService.findUserByPrincipal({
      username,
      authenticationProviderId,
      identityProviderName,
    });
  }

  async validateUser(input) {
    const jsonSchemaValidationService = await this.service('jsonSchemaValidationService');
    await jsonSchemaValidationService.ensureValid(input, jsonSchema);
  }

  async audit(requestContext, auditEvent) {
    const auditWriterService = await this.service('auditWriterService');
    // Calling "writeAndForget" instead of "write" to allow main call to continue without waiting for audit logging
    // and not fail main call if audit writing fails for some reason
    // If the main call also needs to fail in case writing to any audit destination fails then switch to "write" method as follows
    // return auditWriterService.write(requestContext, auditEvent);
    return auditWriterService.writeAndForget(requestContext, auditEvent);
  }
}

module.exports = RegisterUserService;

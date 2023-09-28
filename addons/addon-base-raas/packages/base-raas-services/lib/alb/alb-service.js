/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
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

const _ = require('lodash');
const { v4: uuid } = require('uuid');
const Service = require('@aws-ee/base-services-container/lib/service');
const { runAndCatch } = require('@aws-ee/base-services/lib/helpers/utils');
const environmentStatusEnum = require('@aws-ee/environment-sc-workflow-steps/lib/helpers/environment-status-enum');

const createSchema = require('../schema/create-load-balancer.json');
const updateSchema = require('../schema/update-load-balancer.json');

const settingKeys = {
  tableName: 'dbLoadBalancers',
  accountIdIndexName: 'dbLoadBalancersAccountIdIndex',
  maximumWorkspacesPerAlb: 'maximumWorkspacesPerAlb',
  domainName: 'domainName',
  isAppStreamEnabled: 'isAppStreamEnabled',
  loggingBucketName: 'loggingBucketName',
};

class ALBService extends Service {
  constructor() {
    super();
    this.dependency([
      'aws',
      'auditWriterService',
      'indexesService',
      'projectService',
      'deploymentStoreService',
      'awsAccountsService',
      'cfnTemplateService',
      'dbService',
      'jsonSchemaValidationService',
    ]);
  }

  async init() {
    await super.init();
    const [dbService] = await this.service(['dbService']);
    const table = this.settings.get(settingKeys.tableName);

    this._getter = () => dbService.helper.getter().table(table);
    this._updater = () => dbService.helper.updater().table(table);
    this._query = () => dbService.helper.query().table(table);
    this._deleter = () => dbService.helper.deleter().table(table);
    this._scanner = () => dbService.helper.scanner().table(table);

    this.accountIdIndex = this.settings.get(settingKeys.accountIdIndexName);
    this.maximumWorkspacesPerAlb = Number(this.settings.get(settingKeys.maximumWorkspacesPerAlb));
  }

  async find(requestContext, { id, fields = [] }) {
    const result = await this._getter()
      .key({ id })
      .projection(fields)
      .get();

    return this._fromDbToDataObject(result);
  }

  async create(requestContext, rawData) {
    // Validate input
    const [validationService] = await this.service(['jsonSchemaValidationService']);
    await validationService.ensureValid(rawData, createSchema);

    // For now, we assume that 'createdBy' and 'updatedBy' are always users and not groups
    const by = _.get(requestContext, 'principalIdentifier.uid');
    // Generate environment ID
    const id = uuid();
    // Prepare the db object
    const date = new Date().toISOString();
    const dbObject = this._fromRawToDbObject(rawData, {
      rev: 0,
      createdAt: date,
      updatedAt: date,
      createdBy: by,
      updatedBy: by,
    });

    // Time to save the the db object
    const result = await runAndCatch(
      async () => {
        return this._updater()
          .condition('attribute_not_exists(id)') // yes we need this
          .key({ id })
          .item(dbObject)
          .update();
      },
      async () => {
        throw this.boom.badRequest(`load balancer with id "${id}" already exists`, true);
      },
    );

    // Write audit event
    await this.audit(requestContext, { action: 'create-load-balancer', body: result });

    return result;
  }

  async update(requestContext, rawData) {
    // Validate input
    const [validationService] = await this.service(['jsonSchemaValidationService']);
    await validationService.ensureValid(rawData, updateSchema);

    // For now, we assume that 'updatedBy' is always a user and not a group
    const by = _.get(requestContext, 'principalIdentifier.uid');
    const date = new Date().toISOString();
    const { id, rev } = rawData;

    // Prepare the db object
    const dbObject = _.omit(this._fromRawToDbObject(rawData, { updatedBy: by, updatedAt: date }), ['rev']);

    // Time to save the the db object
    const result = await runAndCatch(
      async () => {
        return this._updater()
          .condition('attribute_exists(id)') // yes we need this
          .key({ id })
          .rev(rev)
          .item(dbObject)
          .update();
      },
      async () => {
        // There are two scenarios here:
        // 1 - The load balancer does not exist
        // 2 - The "rev" does not match
        // We will display the appropriate error message accordingly
        const existing = await this.find(requestContext, { id, fields: ['id', 'updatedBy'] });
        if (existing) {
          throw this.boom.badRequest(
            `load balancer information changed just before your request is processed, please try again`,
            true,
          );
        }
        throw this.boom.notFound(`load balancer with id "${id}" does not exist`, true);
      },
    );

    // Write audit event
    await this.audit(requestContext, { action: 'update-load-balancer', body: result });

    return result;
  }

  async delete(requestContext, { id }) {
    const result = await runAndCatch(
      async () => {
        return this._deleter()
          .condition('attribute_exists(id)') // yes we need this
          .key({ id })
          .delete();
      },
      async () => {
        throw this.boom.notFound(`load balancer with id "${id}" does not exist`, true);
      },
    );

    // Write audit event
    await this.audit(requestContext, { action: 'delete-load-balancer', body: { id } });

    return result;
  }

  /**
   * Method to get the count of workspaces that are dependent on ALB
   *
   * @param requestContext
   * @param loadBalancerId
   * @returns {Promise<int>}
   */
  async albDependentWorkspacesCount(requestContext, loadBalancerId) {
    const albDetails = await this.find(requestContext, { id: loadBalancerId });
    return _.get(albDetails, 'albDependentWorkspacesCount', 0);
  }

  /**
   * Method to get the available ALB to use for an environment
   * Returns null if no ALB is available with free space
   *
   * @param requestContext
   * @param projectId
   * @returns {Promise<>}
   */
  async getAvailableAlb(requestContext, environmentScService, projectId) {
    const accountId = await this.findAwsAccountId(requestContext, projectId);
    const loadBalancers = await this.listLoadBalancersForAccount(requestContext, { accountId });
    for (const loadBalancer of loadBalancers) {
      const pendingEnvForLoadBalancer = await this.getPendingEnvForLoadBalancer(
        requestContext,
        environmentScService,
        loadBalancer.id,
      );
      if (loadBalancer.albDependentWorkspacesCount + pendingEnvForLoadBalancer < this.maximumWorkspacesPerAlb) {
        return loadBalancer;
      }
    }
    return null;
  }

  /**
   * Method to list all the load balancers available for an account
   * Returns empty array if no ALB is available
   *
   * @param requestContext
   * @param accountId
   * @param fields
   * @returns {Promise<{}>}
   */
  async listLoadBalancersForAccount(requestContext, { accountId }, fields = []) {
    const result = await this._query()
      .index(this.accountIdIndex)
      .key('awsAccountId', accountId)
      .limit(4000)
      .projection(fields)
      .query();

    return result;
  }

  /**
   * Method to get count of environments in PENDING state using the given load balancer
   * Returns zero if no environment is in pending state
   *
   * @param requestContext
   * @param environmentScService
   * @param loadBalancerId
   * @returns {Promise<{}>}
   */
  async getPendingEnvForLoadBalancer(requestContext, environmentScService, loadBalancerId) {
    const envs = await environmentScService.listEnvWithStatus(requestContext, environmentStatusEnum.PENDING);
    const pendingEnvs = envs.filter(env => {
      return env.loadBalancerId === loadBalancerId;
    });
    return pendingEnvs.length;
  }

  /**
   * Method to get the input parameters for ALB stack creation.
   * The method reads cfn template using the cfnTemplateService
   *
   * @param requestContext
   * @param resolvedVars
   * @param resolvedInputParams
   * @param projectId
   * @returns {Promise<{}>}
   */
  async getStackCreationInput(requestContext, resolvedVars, resolvedInputParams, projectId) {
    const awsAccountDetails = await this.findAwsAccountDetails(requestContext, projectId);
    const [cfnTemplateService] = await this.service(['cfnTemplateService']);
    const [template] = await Promise.all([cfnTemplateService.getTemplate('application-load-balancer')]);
    const cfnParams = [];
    const certificateArn = _.find(resolvedInputParams, o => o.Key === 'ACMSSLCertARN');
    const ALBSubnet1 = _.find(resolvedInputParams, o => o.Key === 'ALBSubnet1');
    const ALBSubnet2 = _.find(resolvedInputParams, o => o.Key === 'ALBSubnet2');
    const LoadBalancerType = _.find(resolvedInputParams, o => o.Key === 'LoadBalancerType');
    const isAppStreamEnabled = _.find(resolvedInputParams, o => o.Key === 'IsAppStreamEnabled');

    const addParam = (key, v) => cfnParams.push({ ParameterKey: key, ParameterValue: v });
    addParam('Namespace', resolvedVars.namespace);
    addParam('ACMSSLCertARN', certificateArn.Value);
    addParam('ALBSubnet1', ALBSubnet1.Value);
    addParam('ALBSubnet2', ALBSubnet2.Value);
    addParam('LoadBalancerType', LoadBalancerType.Value);
    addParam('VPC', awsAccountDetails.vpcId);
    addParam('IsAppStreamEnabled', isAppStreamEnabled.Value);
    addParam(
      'AppStreamSG',
      _.isUndefined(awsAccountDetails.appStreamSecurityGroupId)
        ? 'AppStreamNotConfigured'
        : awsAccountDetails.appStreamSecurityGroupId,
    );
    addParam(
      'PublicRouteTableId',
      _.isUndefined(awsAccountDetails.appStreamSecurityGroupId) ? awsAccountDetails.publicRouteTableId : 'N/A',
    );
    addParam('LoggingBucket', this.settings.get(settingKeys.loggingBucketName));

    const input = {
      StackName: resolvedVars.namespace,
      Parameters: cfnParams,
      TemplateBody: template,
      Tags: [
        {
          Key: 'Description',
          Value: 'Created by SWB for the AWS account',
        },
      ],
    };
    return input;
  }

  /**
   * Method to find the AWS account details for a project.
   *
   * @param requestContext
   * @param projectId
   * @returns {Promise<>}
   */
  async findAwsAccountDetails(requestContext, projectId) {
    const awsAccountId = await this.findAwsAccountId(requestContext, projectId);
    const [awsAccountsService] = await this.service(['awsAccountsService']);
    const awsAccountDetails = await awsAccountsService.mustFind(requestContext, { id: awsAccountId });
    return awsAccountDetails;
  }

  /**
   * Method to find the AWS account ID for a project.
   *
   * @param requestContext
   * @param projectId
   * @returns {Promise<string>}
   */
  async findAwsAccountId(requestContext, projectId) {
    const [indexesService, projectService] = await this.service(['indexesService', 'projectService']);
    const project = await projectService.mustFind(requestContext, { id: projectId });
    const { indexId } = project;
    // Get the aws account information
    const { awsAccountId } = await indexesService.mustFind(requestContext, { id: indexId });
    return awsAccountId;
  }

  checkIfAppStreamEnabled() {
    return this.settings.getBoolean(settingKeys.isAppStreamEnabled);
  }

  /**
   * Method to create listener rule. The method creates rule using the ALB SDK client.
   * Tags are read form the resolvedVars so the billing will happen properly
   *
   * @param prefix
   * @param requestContext
   * @param resolvedVars
   * @param targetGroupArn
   * @param albDetails
   * @returns {Promise<string>}
   */
  async createListenerRule(prefix, requestContext, resolvedVars, targetGroupArn, albDetails) {
    const isAppStreamEnabled = this.checkIfAppStreamEnabled();
    const listenerArn = albDetails.listenerArn;
    const priority = await this.calculateRulePriority(requestContext, resolvedVars, albDetails.listenerArn);
    const subdomain = this.getHostname(prefix, resolvedVars.envId);
    let params;
    if (isAppStreamEnabled) {
      params = {
        ListenerArn: listenerArn,
        Priority: priority,
        Actions: [
          {
            TargetGroupArn: targetGroupArn,
            Type: 'forward',
          },
        ],
        Conditions: [
          {
            Field: 'host-header',
            HostHeaderConfig: {
              Values: [subdomain],
            },
          },
        ],
        Tags: resolvedVars.tags,
      };
    } else {
      params = {
        ListenerArn: listenerArn,
        Priority: priority,
        Actions: [
          {
            TargetGroupArn: targetGroupArn,
            Type: 'forward',
          },
        ],
        Conditions: [
          {
            Field: 'host-header',
            HostHeaderConfig: {
              Values: [subdomain],
            },
          },
          {
            Field: 'source-ip',
            SourceIpConfig: {
              Values: [resolvedVars.cidr],
            },
          },
        ],
        Tags: resolvedVars.tags,
      };
    }
    const albClient = await this.getAlbSdk(requestContext, resolvedVars);
    let response = null;
    try {
      response = await albClient.createRule(params).promise();

      // Get current rule count on ALB and set it in DB
      const albRules = await albClient.describeRules({ ListenerArn: listenerArn }).promise();
      await this.updateAlbDependentWorkspaceCount(requestContext, albDetails, albRules.Rules.length);
    } catch (err) {
      throw new Error(`Error creating rule. Rule creation failed with message - ${err.message}`);
    }
    return response.Rules[0].RuleArn;
  }

  /**
   * Method to delete listener rule. The method deletes rule using the ALB SDK client.
   * Since this needs to reflect the up-to-date rule count on the ALB,
   * ultimate environment termination status is not relevant
   *
   * @param requestContext
   * @param resolvedVars
   * @param ruleArn
   * @param listenerArn
   * @param albDetails
   * @returns {Promise<>}
   */
  async deleteListenerRule(requestContext, resolvedVars, ruleArn, listenerArn, albDetails) {
    const params = {
      RuleArn: ruleArn,
    };
    const albClient = await this.getAlbSdk(requestContext, resolvedVars);
    let response = null;
    try {
      // Check if rule exists, only then perform deletion
      response = await albClient.deleteRule(params).promise();

      // Get current rule count on ALB and set it in DB
      const albRules = await albClient.describeRules({ ListenerArn: listenerArn }).promise();
      await this.updateAlbDependentWorkspaceCount(requestContext, albDetails, albRules.Rules.length);
    } catch (err) {
      throw new Error(`Error deleting rule. Rule deletion failed with message - ${err.message}`);
    }
    return response;
  }

  /**
   * Method to update the count of alb dependent workspaces in database
   * Rules limit per load balancer (not counting default rules): 100
   * One default rule exists for the ALB for port 443, so subtracting that to form workspace count
   *
   * @param requestContext
   * @param albDetails
   * @param currRuleCount
   * @returns {Promise<>}
   */
  async updateAlbDependentWorkspaceCount(requestContext, albDetails, currRuleCount) {
    const id = albDetails.id;
    const existing = await this.find(requestContext, { id, fields: ['id', 'rev'] });
    const count = currRuleCount - 1;
    const dbEntry = {
      id: albDetails.id,
      rev: existing.rev || 0,
      albDependentWorkspacesCount: count,
    };
    const result = await this.update(requestContext, dbEntry);
    await this.audit(requestContext, { action: `update-alb-count-account-${albDetails.id}`, body: result });
  }

  /**
   * Method to calculate the priority for the listener rule. The method gets the existing rules prirority
   * and adds 1 to the maximum value
   *
   * @param requestContext
   * @param resolvedVars
   * @param listenerArn
   * @returns {Promise<int>}
   */
  async calculateRulePriority(requestContext, resolvedVars, listenerArn) {
    const params = {
      ListenerArn: listenerArn,
    };
    const albClient = await this.getAlbSdk(requestContext, resolvedVars);
    let response = null;
    try {
      response = await albClient.describeRules(params).promise();
      const rules = response.Rules;
      // Returns list of priorities, returns 0 for default rule
      const priorities = _.map(rules, rule => {
        return rule.IsDefault ? 0 : _.toInteger(rule.Priority);
      });
      return _.max(priorities) + 1;
    } catch (err) {
      throw new Error(`Error calculating rule priority. Rule describe failed with message - ${err.message}`);
    }
  }

  /**
   * Method to get the hostname for the environment
   *
   * @param prefix
   * @param id
   * @returns {Promise<string>}
   */
  getHostname(prefix, id) {
    const domainName = this.settings.get(settingKeys.domainName);
    return `${prefix}-${id}.${domainName}`;
  }

  /**
   * Method to get the EC2 SDK client for the target aws account
   *
   * @param requestContext
   * @param resolvedVars
   * @returns {Promise<>}
   */
  async getEc2Sdk(requestContext, resolvedVars) {
    const [aws] = await this.service(['aws']);
    const roleArn = await this.getTargetAccountRoleArn(requestContext, resolvedVars.projectId);
    const externalId = resolvedVars.externalId;
    const ec2Client = await aws.getClientSdkForRole({
      roleArn,
      clientName: 'EC2',
      options: { apiVersion: '2015-12-10' },
      externalId,
    });
    return ec2Client;
  }

  /**
   * Method to get the ALB SDK client for the target aws account
   *
   * @param requestContext
   * @param resolvedVars
   * @returns {Promise<>}
   */
  async getAlbSdk(requestContext, resolvedVars) {
    const [aws] = await this.service(['aws']);
    const roleArn = await this.getTargetAccountRoleArn(requestContext, resolvedVars.projectId);
    const externalId = resolvedVars.externalId;
    const albClient = await aws.getClientSdkForRole({
      roleArn,
      clientName: 'ELBv2',
      options: { apiVersion: '2015-12-10' },
      externalId,
    });
    return albClient;
  }

  /**
   * Method to get the ALB HostedZone ID for the target aws account
   *
   * @param requestContext
   * @param resolvedVars
   * @returns {Promise<>}
   */
  async getAlbHostedZoneID(requestContext, resolvedVars, albArn) {
    const albClient = await this.getAlbSdk(requestContext, resolvedVars);
    const params = { LoadBalancerArns: [albArn] };
    const response = await albClient.describeLoadBalancers(params).promise();
    return response.LoadBalancers[0].CanonicalHostedZoneId;
  }

  /**
   * Method to get role arn for the target aws account
   *
   * @param requestContext
   * @param projectId
   * @returns {Promise<string>}
   */
  async getTargetAccountRoleArn(requestContext, projectId) {
    const { roleArn } = await this.findAwsAccountDetails(requestContext, projectId);
    return roleArn;
  }

  async audit(requestContext, auditEvent) {
    const auditWriterService = await this.service('auditWriterService');
    // Calling "writeAndForget" instead of "write" to allow main call to continue without waiting for audit logging
    // and not fail main call if audit writing fails for some reason
    // If the main call also needs to fail in case writing to any audit destination fails then switch to "write" method as follows
    // return auditWriterService.write(requestContext, auditEvent);
    return auditWriterService.writeAndForget(requestContext, auditEvent);
  }

  /**
   * Method to modify rule. The method modify the rule using the ALB SDK client.
   * Tags are read form the resolvedVars so the billing will happen properly
   *
   * @param requestContext
   * @param resolvedVars
   * @returns {Promise<D & {$response: Response<D, E>}>}
   */
  async modifyRule(requestContext, resolvedVars) {
    const subdomain = this.getHostname(resolvedVars.prefix, resolvedVars.envId);
    const isAppStreamEnabled = this.checkIfAppStreamEnabled();
    try {
      let params;
      if (isAppStreamEnabled) {
        params = {
          Conditions: [
            {
              Field: 'host-header',
              HostHeaderConfig: {
                Values: [subdomain],
              },
            },
          ],
          RuleArn: resolvedVars.ruleARN,
        };
      } else {
        params = {
          Conditions: [
            {
              Field: 'host-header',
              HostHeaderConfig: {
                Values: [subdomain],
              },
            },
            {
              Field: 'source-ip',
              SourceIpConfig: {
                Values: resolvedVars.cidr,
              },
            },
          ],
          RuleArn: resolvedVars.ruleARN,
        };
      }
      const { externalId } = await this.findAwsAccountDetails(requestContext, resolvedVars.projectId);
      resolvedVars.externalId = externalId;
      const albClient = await this.getAlbSdk(requestContext, resolvedVars);
      const response = await albClient.modifyRule(params).promise();
      return response;
    } catch (e) {
      if (e.message) {
        throw this.boom.unauthorized(
          `Error 443 port CIDRs Blocks. Rule modify failed with message - ${e.message}`,
          true,
        );
      }
      return e.message;
    }
  }

  /**
   * Method to describe rule. The method describe the rule using the ALB SDK client.
   * Tags are read form the resolvedVars so the billing will happen properly
   *
   * @param requestContext
   * @param resolvedVars
   * @returns {Promise<D & {$response: Response<D, E>}>}
   */
  async describeRules(requestContext, resolvedVars) {
    try {
      const params = {
        RuleArns: [resolvedVars.ruleARN],
      };
      const { externalId } = await this.findAwsAccountDetails(requestContext, resolvedVars.projectId);
      resolvedVars.externalId = externalId;
      const albClient = await this.getAlbSdk(requestContext, resolvedVars);
      const response = await albClient.describeRules(params).promise();
      const ruleConditions = response.Rules[0].Conditions;
      const ruleSourceIpConfig = ruleConditions.find(obj => obj.Field === 'source-ip');
      const { SourceIpConfig } = ruleSourceIpConfig;
      const sourceIps = SourceIpConfig.Values;
      return sourceIps;
    } catch (e) {
      if (e.message) throw this.boom.unauthorized(`${e.message}`, true);
      return e.message;
    }
  }

  // Do some properties renaming to prepare the object to be saved in the database
  _fromRawToDbObject(rawObject, overridingProps = {}) {
    const dbObject = { ...rawObject, ...overridingProps };
    return dbObject;
  }

  // Do some properties renaming to restore the object that was saved in the database
  _fromDbToDataObject(rawDb, overridingProps = {}) {
    if (_.isNil(rawDb)) return rawDb; // important, leave this if statement here, otherwise, your update methods won't work correctly
    if (!_.isObject(rawDb)) return rawDb;

    const dataObject = { ...rawDb, ...overridingProps };
    return dataObject;
  }
}

module.exports = ALBService;

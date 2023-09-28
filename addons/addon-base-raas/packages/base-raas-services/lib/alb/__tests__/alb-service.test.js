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

const ServicesContainer = require('@aws-ee/base-services-container/lib/services-container');
const JsonSchemaValidationService = require('@aws-ee/base-services/lib/json-schema-validation-service');

// Mocked dependencies
jest.mock('@aws-ee/base-services/lib/db-service');
const DbServiceMock = require('@aws-ee/base-services/lib/db-service');

jest.mock('@aws-ee/base-services/lib/aws/aws-service');
const AwsServiceMock = require('@aws-ee/base-services/lib/aws/aws-service');

jest.mock('@aws-ee/base-services/lib/audit/audit-writer-service');
const AuditServiceMock = require('@aws-ee/base-services/lib/audit/audit-writer-service');

jest.mock('@aws-ee/base-services/lib/settings/env-settings-service');
const SettingsServiceMock = require('@aws-ee/base-services/lib/settings/env-settings-service');

jest.mock('../../indexes/indexes-service');
const IndexServiceMock = require('../../indexes/indexes-service');

jest.mock('../../project/project-service');
const ProjectServiceMock = require('../../project/project-service');

jest.mock('../../../../../../addon-base-post-deployment/packages/base-post-deployment/lib/deployment-store-service');
const DeploymentStoreServiceMock = require('../../../../../../addon-base-post-deployment/packages/base-post-deployment/lib/deployment-store-service');

jest.mock('../../aws-accounts/aws-accounts-service');
const AwsAccountsServiceMock = require('../../aws-accounts/aws-accounts-service');

jest.mock('../../cfn-templates/cfn-template-service');
const CfnTemplateServiceMock = require('../../cfn-templates/cfn-template-service');

jest.mock('../../environment/service-catalog/environment-sc-service');
const EnvironmentScServiceMock = require('../../environment/service-catalog/environment-sc-service');

const ALBService = require('../alb-service');

describe('ALBService', () => {
  let service = null;
  let projectService = null;
  let cfnTemplateService = null;
  let environmentScService = null;
  let albClient = null;
  let ec2Client = null;
  let settings;
  const requestContext = {
    principal: {
      isAdmin: true,
      status: 'active',
    },
  };
  const albDetails = {
    id: 'alb-id',
    awsAccoundId: null,
    albStackName: null,
    albArn: 'arn:test-arn',
    listenerArn: null,
    albDnsName: null,
    albDependentWorkspacesCount: 1,
  };
  beforeAll(async () => {
    // Initialize services container and register dependencies
    const container = new ServicesContainer();
    container.register('jsonSchemaValidationService', new JsonSchemaValidationService());
    container.register('albService', new ALBService());
    container.register('aws', new AwsServiceMock());
    container.register('indexesService', new IndexServiceMock());
    container.register('projectService', new ProjectServiceMock());
    container.register('deploymentStoreService', new DeploymentStoreServiceMock());
    container.register('awsAccountsService', new AwsAccountsServiceMock());
    container.register('cfnTemplateService', new CfnTemplateServiceMock());
    container.register('environmentScService', new EnvironmentScServiceMock());
    container.register('auditWriterService', new AuditServiceMock());
    container.register('settings', new SettingsServiceMock());
    container.register('dbService', new DbServiceMock());

    await container.initServices();

    // Get instance of the service we are testing
    service = await container.find('albService');
    projectService = await container.find('projectService');
    cfnTemplateService = await container.find('cfnTemplateService');
    settings = await container.find('settings');
    environmentScService = await container.find('environmentScService');
    settings.get = jest.fn(() => 'samplelogbucket');

    // Skip authorization
    service.assertAuthorized = jest.fn();
    service.maximumWorkspacesPerAlb = 2;
  });

  beforeEach(async () => {
    albClient = {
      createRule: jest.fn(),
      deleteRule: jest.fn(),
      describeRules: jest.fn(),
    };
    ec2Client = {
      describeSubnets: jest.fn(),
    };
    service.getAlbSdk = jest.fn().mockResolvedValue(albClient);
    service.getEc2Sdk = jest.fn().mockResolvedValue(ec2Client);
    service.checkIfAppStreamEnabled = jest.fn(() => {
      return false;
    });
    service.find = jest.fn(() => {
      return albDetails;
    });
  });

  afterEach(() => {
    // Restore all the mocks crated using spy to original funciton behaviour
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('alb dependent workspace count function', () => {
    it('should return the count if load balancer is found', async () => {
      // OPERATE
      const count = await service.albDependentWorkspacesCount(requestContext, 'alb-id');
      // CEHCK
      expect(count).toEqual(1);
    });

    it('should return 0 if deployment item is not found', async () => {
      service.find = jest.fn(() => {
        return null;
      });
      // OPERATE
      const count = await service.albDependentWorkspacesCount(requestContext, 'alb-id');
      // CHECK
      expect(count).toEqual(0);
    });
  });

  describe('getAvailableAlb', () => {
    it('should fail because project id is not valid', async () => {
      projectService.mustFind.mockImplementationOnce(() => {
        throw service.boom.notFound(`project with id "test-id" does not exist`, true);
      });
      // OPERATE
      try {
        await service.getAvailableAlb(requestContext, environmentScService, 'test-id');
      } catch (err) {
        // CHECK
        expect(err.message).toEqual('project with id "test-id" does not exist');
      }
    });

    it('should return null if no load balancer exists', async () => {
      service.findAwsAccountId = jest.fn(() => {
        return 'sampleAwsAccountId';
      });
      jest.spyOn(service, 'listLoadBalancersForAccount').mockImplementationOnce(() => {
        return [];
      });
      const response = await service.getAvailableAlb(requestContext, environmentScService, 'test-id');

      // CHECK
      expect(response).toEqual(null);
    });

    it('should return alb details if there is a free space', async () => {
      service.findAwsAccountId = jest.fn(() => {
        return 'sampleAwsAccountId';
      });
      jest.spyOn(service, 'listLoadBalancersForAccount').mockImplementationOnce(() => {
        return [{ id: 'alb-id', albDependentWorkspacesCount: 1 }];
      });
      jest.spyOn(service, 'getPendingEnvForLoadBalancer').mockImplementationOnce(() => {
        return 0;
      });
      const response = await service.getAvailableAlb(requestContext, environmentScService, 'test-id');

      // CHECK
      expect(response).toEqual({ id: 'alb-id', albDependentWorkspacesCount: 1 });
    });

    it('should return null if there is no free space', async () => {
      service.findAwsAccountId = jest.fn(() => {
        return 'sampleAwsAccountId';
      });
      jest.spyOn(service, 'listLoadBalancersForAccount').mockImplementationOnce(() => {
        return [{ id: 'alb-id', albDependentWorkspacesCount: 1 }];
      });
      jest.spyOn(service, 'getPendingEnvForLoadBalancer').mockImplementationOnce(() => {
        return 1;
      });
      const response = await service.getAvailableAlb(requestContext, environmentScService, 'test-id');

      // CHECK
      expect(response).toEqual(null);
    });
  });

  describe('update alb dependent workspace count function', () => {
    it('should pass and update count if the input is valid', async () => {
      const updatedAlbDetails = {
        id: 'alb-id',
        albStackName: null,
        albArn: 'arn:test-arn',
        listenerArn: null,
        albDnsName: null,
        albDependentWorkspacesCount: 1,
      };
      service.find = jest.fn(() => {
        return albDetails;
      });
      service.update = jest.fn(() => {
        return { id: 'id-alb' };
      });
      service.audit = jest.fn();
      // OPERATE
      const totalRules = 2; // including one default rule
      await service.updateAlbDependentWorkspaceCount({}, updatedAlbDetails, totalRules);

      // CHECK
      expect(service.update).toHaveBeenCalledWith(
        {},
        {
          id: 'alb-id',
          rev: 0,
          albDependentWorkspacesCount: 1,
        },
      );
    });

    it('should call audit on success', async () => {
      service.find = jest.fn(() => {
        return albDetails;
      });
      service.update = jest.fn(() => {
        return { id: 'id-alb' };
      });
      service.audit = jest.fn();
      // OPERATE
      await service.updateAlbDependentWorkspaceCount({}, { id: 'alb-id' }, 1);

      // CHECK
      expect(service.audit).toHaveBeenCalledWith(
        {},
        { action: 'update-alb-count-account-alb-id', body: { id: 'id-alb' } },
      );
    });
  });

  describe('getStackCreationInput', () => {
    const resolvedVars = { namespace: 'namespace' };

    it('should pass and return the stack creation input with success for AppStream', async () => {
      service.checkIfAppStreamEnabled = jest.fn(() => {
        return true;
      });
      const resolvedInputParams = [
        { Key: 'ACMSSLCertARN', Value: 'Value' },
        { Key: 'IsAppStreamEnabled', Value: 'true' },
        { Key: 'ALBSubnet1', Value: 'Value' },
        { Key: 'ALBSubnet2', Value: 'Value' },
        { Key: 'LoadBalancerType', Value: 'Value' },
      ];
      service.findAwsAccountDetails = jest.fn(() => {
        return {
          subnetId: 'subnet-0a661d9f417ecff3f',
          vpcId: 'vpc-096b034133955abba',
          appStreamSecurityGroupId: 'sampleAppStreamSgId',
        };
      });
      cfnTemplateService.getTemplate.mockImplementationOnce(() => {
        return ['template'];
      });
      const apiResponse = {
        StackName: resolvedVars.namespace,
        Parameters: [
          {
            ParameterKey: 'Namespace',
            ParameterValue: 'namespace',
          },
          {
            ParameterKey: 'ACMSSLCertARN',
            ParameterValue: 'Value',
          },
          {
            ParameterKey: 'ALBSubnet1',
            ParameterValue: 'Value',
          },
          {
            ParameterKey: 'ALBSubnet2',
            ParameterValue: 'Value',
          },
          {
            ParameterKey: 'LoadBalancerType',
            ParameterValue: 'Value',
          },
          {
            ParameterKey: 'VPC',
            ParameterValue: 'vpc-096b034133955abba',
          },
          {
            ParameterKey: 'IsAppStreamEnabled',
            ParameterValue: 'true',
          },
          {
            ParameterKey: 'AppStreamSG',
            ParameterValue: 'sampleAppStreamSgId',
          },
          {
            ParameterKey: 'PublicRouteTableId',
            ParameterValue: 'N/A',
          },
          {
            ParameterKey: 'LoggingBucket',
            ParameterValue: 'samplelogbucket',
          },
        ],
        TemplateBody: ['template'],
        Tags: [
          {
            Key: 'Description',
            Value: 'Created by SWB for the AWS account',
          },
        ],
      };
      const response = await service.getStackCreationInput({}, resolvedVars, resolvedInputParams, 'project_id');
      expect(response).toEqual(apiResponse);
    });
    it('should pass and return the stack creation input with success', async () => {
      const resolvedInputParams = [
        { Key: 'ACMSSLCertARN', Value: 'Value' },
        { Key: 'IsAppStreamEnabled', Value: 'false' },
        { Key: 'ALBSubnet1', Value: 'Value' },
        { Key: 'ALBSubnet2', Value: 'Value' },
        { Key: 'LoadBalancerType', Value: 'Value' },
      ];
      service.findAwsAccountDetails = jest.fn(() => {
        return {
          subnetId: 'subnet-0a661d9f417ecff3f',
          vpcId: 'vpc-096b034133955abba',
          publicRouteTableId: 'rtb-sampleRouteTableId',
        };
      });
      cfnTemplateService.getTemplate.mockImplementationOnce(() => {
        return ['template'];
      });
      const apiResponse = {
        StackName: resolvedVars.namespace,
        Parameters: [
          {
            ParameterKey: 'Namespace',
            ParameterValue: 'namespace',
          },
          {
            ParameterKey: 'ACMSSLCertARN',
            ParameterValue: 'Value',
          },
          {
            ParameterKey: 'ALBSubnet1',
            ParameterValue: 'Value',
          },
          {
            ParameterKey: 'ALBSubnet2',
            ParameterValue: 'Value',
          },
          {
            ParameterKey: 'LoadBalancerType',
            ParameterValue: 'Value',
          },
          {
            ParameterKey: 'VPC',
            ParameterValue: 'vpc-096b034133955abba',
          },
          {
            ParameterKey: 'IsAppStreamEnabled',
            ParameterValue: 'false',
          },
          {
            ParameterKey: 'AppStreamSG',
            ParameterValue: 'AppStreamNotConfigured',
          },
          {
            ParameterKey: 'PublicRouteTableId',
            ParameterValue: 'rtb-sampleRouteTableId',
          },
          {
            ParameterKey: 'LoggingBucket',
            ParameterValue: 'samplelogbucket',
          },
        ],
        TemplateBody: ['template'],
        Tags: [
          {
            Key: 'Description',
            Value: 'Created by SWB for the AWS account',
          },
        ],
      };
      const response = await service.getStackCreationInput({}, resolvedVars, resolvedInputParams, 'project_id');
      expect(response).toEqual(apiResponse);
    });

    it('should fail because project id is not valid', async () => {
      const resolvedInputParams = [
        { Key: 'ACMSSLCertARN', Value: 'Value' },
        { Key: 'IsAppStreamEnabled', Value: 'false' },
        { Key: 'ALBSubnet1', Value: 'Value' },
        { Key: 'ALBSubnet2', Value: 'Value' },
        { Key: 'LoadBalancerType', Value: 'Value' },
      ];
      projectService.mustFind.mockImplementationOnce(() => {
        throw service.boom.notFound(`project with id "test-id" does not exist`, true);
      });
      try {
        await service.getStackCreationInput({}, resolvedVars, resolvedInputParams, '');
      } catch (err) {
        expect(err.message).toEqual('project with id "test-id" does not exist');
      }
    });
  });

  describe('createListenerRule', () => {
    const prefix = 'rstudio';
    const resolvedVars = {
      projectId: 'bio-research-vir2',
      envId: '018bb1e1-6bd3-49d9-b608-051cfb180882',
      cidr: '10.0.0.0/32',
      tags: [{ Key: 'key', Value: 'value' }],
    };
    const createAPIResponse = {
      Rules: [
        {
          RuleArn:
            'arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/9683b2d02a6cabee',
        },
      ],
    };
    const describeAPIResponse = {
      Rules: [
        {
          RuleArn:
            'arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/9683b2d02a6cabee',
        },
      ],
    };
    const targetGroupArn =
      'rn:aws:elasticloadbalancing:us-east-2:977461429431:targetgroup/devrgsaas-sg/f4c2a2df084e5df4';

    it('should pass if system is trying to create listener rule for AppStream', async () => {
      service.checkIfAppStreamEnabled = jest.fn(() => {
        return true;
      });
      const subdomain = 'rtsudio-test.example.com';
      const priority = 1;
      const params = {
        ListenerArn: albDetails.listenerArn,
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
      service.updateAlbDependentWorkspaceCount = jest.fn();
      albClient.describeRules = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return describeAPIResponse;
          },
        };
      });
      albClient.createRule = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return createAPIResponse;
          },
        };
      });
      service.getAlbSdk = jest.fn().mockResolvedValue(albClient);
      service.getHostname = jest.fn(() => {
        return subdomain;
      });
      jest.spyOn(service, 'calculateRulePriority').mockImplementationOnce(() => {
        return priority;
      });
      await service.createListenerRule(prefix, requestContext, resolvedVars, targetGroupArn, albDetails);
      expect(albClient.createRule).toHaveBeenCalledWith(params);
      expect(albClient.createRule).toHaveBeenCalled();
    });

    it('should pass if system is trying to create listener rulefor non-AppStream', async () => {
      service.updateAlbDependentWorkspaceCount = jest.fn();
      const subdomain = 'rtsudio-test.example.com';
      const priority = 1;
      const params = {
        ListenerArn: albDetails.listenerArn,
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
      albClient.describeRules = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return describeAPIResponse;
          },
        };
      });
      albClient.createRule = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return createAPIResponse;
          },
        };
      });
      service.getAlbSdk = jest.fn().mockResolvedValue(albClient);
      service.getHostname = jest.fn(() => {
        return subdomain;
      });
      jest.spyOn(service, 'calculateRulePriority').mockImplementationOnce(() => {
        return priority;
      });
      await service.createListenerRule(prefix, requestContext, resolvedVars, targetGroupArn, albDetails);
      expect(albClient.createRule).toHaveBeenCalledWith(params);
      expect(albClient.createRule).toHaveBeenCalled();
    });

    it('should pass and return the arn with success', async () => {
      service.updateAlbDependentWorkspaceCount = jest.fn();
      const validateARN =
        'arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/9683b2d02a6cabee';
      albClient.describeRules = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return describeAPIResponse;
          },
        };
      });
      albClient.createRule = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return createAPIResponse;
          },
        };
      });
      service.getAlbSdk = jest.fn().mockResolvedValue(albClient);
      service.find = jest.fn(() => {
        return albDetails;
      });
      service.getHostname = jest.fn(() => {
        return 'rtsudio-test.example.com';
      });
      jest.spyOn(service, 'calculateRulePriority').mockImplementationOnce(() => {
        return 1;
      });
      const response = await service.createListenerRule(
        prefix,
        requestContext,
        resolvedVars,
        targetGroupArn,
        albDetails,
      );
      expect(albClient.createRule).toHaveBeenCalled();
      expect(response).toBe(validateARN);
    });

    it('should fail when create rule API call throws error', async () => {
      service.updateAlbDependentWorkspaceCount = jest.fn();
      albClient.describeRules = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return describeAPIResponse;
          },
        };
      });
      albClient.createRule = jest.fn().mockImplementation(() => {
        throw new Error(`Error creating rule. Rule creation failed with message - Too many rules`);
      });
      service.getAlbSdk = jest.fn().mockResolvedValue(albClient);
      service.getHostname = jest.fn(() => {
        return 'rtsudio-test.example.com';
      });
      jest.spyOn(service, 'calculateRulePriority').mockImplementationOnce(() => {
        return 1;
      });
      try {
        await service.createListenerRule(prefix, requestContext, resolvedVars, targetGroupArn, albDetails);
      } catch (err) {
        expect(err.message).toContain('Error creating rule. Rule creation failed with message - Too many rules');
      }
    });
  });

  describe('deleteListenerRule', () => {
    const describeAPIResponse = {
      Rules: [
        {
          RuleArn:
            'arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/9683b2d02a6cabee',
        },
      ],
    };
    it('should pass and return empty object with success', async () => {
      service.findAwsAccountId = jest.fn(() => {
        return 'sampleAwsAccountId';
      });
      service.updateAlbDependentWorkspaceCount = jest.fn();
      albClient.describeRules = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return describeAPIResponse;
          },
        };
      });
      albClient.deleteRule = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return {};
          },
        };
      });
      service.getAlbSdk = jest.fn().mockResolvedValue(albClient);
      const response = await service.deleteListenerRule({}, {}, '', 'sampleListenerArn');
      expect(response).toEqual({});
    });

    it('should fail when delete rule API call throws error', async () => {
      service.findAwsAccountId = jest.fn(() => {
        return 'sampleAwsAccountId';
      });
      service.updateAlbDependentWorkspaceCount = jest.fn();
      albClient.describeRules = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return describeAPIResponse;
          },
        };
      });
      albClient.deleteRule = jest.fn().mockImplementation(() => {
        throw new Error(`Error deleting rule. Rule deletion failed with message - Rule not found`);
      });
      try {
        await service.deleteListenerRule({}, {}, '', 'sampleListenerArn');
      } catch (err) {
        expect(err.message).toContain('Error deleting rule. Rule deletion failed with message - Rule not found');
      }
    });
  });

  describe('modifyRule', () => {
    it('should pass for AppStream', async () => {
      service.checkIfAppStreamEnabled = jest.fn(() => {
        return true;
      });
      const resolvedVars = {
        projectId: 'bio-research-vir2',
        envId: '018bb1e1-6bd3-49d9-b608-051cfb180882',
        prefix: 'rstudio',
        ruleARN:
          'arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/9683b2d02a6cabee',
      };
      const subdomain = 'rtsudio-test.example.com';
      const params = {
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
      service.getHostname = jest.fn(() => {
        return subdomain;
      });
      service.findAwsAccountDetails = jest.fn(() => {
        return {
          externalId: 'subnet-0a661d9f417ecff3f',
        };
      });
      albClient.modifyRule = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return {};
          },
        };
      });
      service.getAlbSdk = jest.fn().mockResolvedValue(albClient);
      const response = await service.modifyRule({}, resolvedVars);
      expect(albClient.modifyRule).toHaveBeenCalledWith(params);
      expect(response).toEqual({});
    });

    it('should pass for non-AppStream', async () => {
      const resolvedVars = {
        projectId: 'bio-research-vir2',
        envId: '018bb1e1-6bd3-49d9-b608-051cfb180882',
        cidr: ['10.0.0.0/32'],
        prefix: 'rstudio',
        ruleARN:
          'arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/9683b2d02a6cabee',
      };
      const subdomain = 'rtsudio-test.example.com';
      const params = {
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
      service.getHostname = jest.fn(() => {
        return subdomain;
      });
      service.findAwsAccountDetails = jest.fn(() => {
        return {
          externalId: 'subnet-0a661d9f417ecff3f',
        };
      });
      albClient.modifyRule = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return {};
          },
        };
      });
      service.getAlbSdk = jest.fn().mockResolvedValue(albClient);
      const response = await service.modifyRule({}, resolvedVars);
      expect(albClient.modifyRule).toHaveBeenCalledWith(params);
      expect(response).toEqual({});
    });

    it('should fail when user passed empty cidr and return error message', async () => {
      const resolvedVars = {
        projectId: 'bio-research-vir2',
        envId: '018bb1e1-6bd3-49d9-b608-051cfb180882',
        cidr: [],
        prefix: 'rstudio',
        ruleARN:
          'arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/9683b2d02a6cabee',
      };
      albClient.modifyRule = jest.fn().mockImplementation(() => {
        throw new Error(`Error modify rule. Rule modify failed with message - A condition value cannot be empty`);
      });
      try {
        await service.modifyRule({}, resolvedVars);
      } catch (err) {
        expect(err.message).toContain(
          'Error modify rule. Rule modify failed with message - A condition value cannot be empty',
        );
      }
    });
  });

  describe('describeRules', () => {
    it('should pass and return array of string value with success', async () => {
      service.findAwsAccountDetails = jest.fn(() => {
        return {
          externalId: 'subnet-0a661d9f417ecff3f',
        };
      });
      albClient.describeRules = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return {
              Rules: [{ Conditions: [{ Field: 'source-ip', SourceIpConfig: { Values: ['10.0.0.0/32'] } }] }],
            };
          },
        };
      });
      service.getAlbSdk = jest.fn().mockResolvedValue(albClient);
      const response = await service.describeRules({}, { cidr: [], projectId: '' });
      expect(albClient.describeRules).toHaveBeenCalled();
      expect(response).toEqual(['10.0.0.0/32']);
    });
  });

  describe('calculateRulePriority', () => {
    it('should fail when describe rule API call throws error', async () => {
      albClient.describeRules = jest.fn().mockImplementation(() => {
        throw new Error(`Error calculating rule priority. Rule describe failed with message - Rule not found`);
      });
      try {
        await service.calculateRulePriority({}, {}, '');
      } catch (err) {
        expect(err.message).toContain(
          'Error calculating rule priority. Rule describe failed with message - Rule not found',
        );
      }
    });

    it('should return 1 when only only default rule exists in API response', async () => {
      albClient.describeRules = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return { Rules: [{ IsDefault: true }] };
          },
        };
      });
      const response = await service.calculateRulePriority({}, {}, '');
      expect(response).toEqual(1);
    });

    it('should maximum priority + 1', async () => {
      albClient.describeRules = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return {
              Rules: [{ IsDefault: true }, { IsDefault: false, Priority: 1 }, { IsDefault: false, Priority: 2 }],
            };
          },
        };
      });
      const response = await service.calculateRulePriority({}, {}, '');
      expect(response).toEqual(3);
    });
  });

  describe('getAlbHostedZoneID', () => {
    it('should provide ALB hosted zone ID', async () => {
      const albHostedZoneId = 'sampleAlbHostedZoneId';
      albClient.describeLoadBalancers = jest.fn().mockImplementation(() => {
        return {
          promise: () => {
            return { LoadBalancers: [{ CanonicalHostedZoneId: albHostedZoneId }] };
          },
        };
      });
      const response = await service.getAlbHostedZoneID({}, {}, '');
      expect(response).toEqual(albHostedZoneId);
    });
  });
});

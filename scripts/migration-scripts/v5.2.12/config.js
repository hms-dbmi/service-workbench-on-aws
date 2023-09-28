module.exports = {
  aws_remote_config: {
    region: "us-east-1",
    accessKeyId: "",
    secretAccessKey: "",
  },
  swbTables: {
    deploymentStore: "<STAGE>-<REGION_SHORT_NAME>-<SOLUTION_NAME>-DeploymentStore",
    loadBalancers: "<STAGE>-<REGION_SHORT_NAME>-<SOLUTION_NAME>-LoadBalancers",
    indexes: "<STAGE>-<REGION_SHORT_NAME>-<SOLUTION_NAME>-Indexes",
    environment: "<STAGE>-<REGION_SHORT_NAME>-<SOLUTION_NAME>-EnvironmentsSc",
    awsAccount:"<STAGE>-<REGION_SHORT_NAME>-<SOLUTION_NAME>-AwsAccounts"
  },
  admin: {
    uid: ""
  },
};

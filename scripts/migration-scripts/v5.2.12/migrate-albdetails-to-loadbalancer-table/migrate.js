const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const config = require("../config.js");
// Configure the AWS SDK with your credentials and region
AWS.config.update({
  region: config.aws_remote_config.region,
  accessKeyId: config.aws_remote_config.accessKeyId,
  secretAccessKey: config.aws_remote_config.secretAccessKey,
});

const dynamodb = new AWS.DynamoDB();
const args = process.argv.slice(2);

// Set default value for dryRun
let dryRun = true;
args.forEach((arg) => {
  const [key, value] = arg.split("=");
  if (key === "--dryRun" && value === "false") {
    dryRun = false;
  }
});

///the parameters for the query
const accountParams = {
  TableName: config.swbTables.deploymentStore,
  KeyConditionExpression: "#type = :type",
  ExpressionAttributeNames: {
    "#type": "type",
  },
  ExpressionAttributeValues: {
    ":type": { S: "account-workspace-details" },
  },
};

// Retrieving details from DynamoDB table
function retrieveDetails(callback) {
  dynamodb.query(accountParams, (err, data) => {
    if (err) {
      console.error("Error retrieving account-workspace details:", err.message);
      callback(err);
    } else {
      const details = data.Items.map((item) =>
        AWS.DynamoDB.Converter.unmarshall(item)
      );
      callback(null, details);
    }
  });
}

// Insert details into "test-va-swb-LoadBalancers" table
async function insertDetails(details) {
  if (details.length === 0) {
    console.log("No account workspace details found.");
    return;
  }
  let successfulInsertions = 0;

  details.forEach((detail) => {
    const { createdAt, updatedAt, value } = detail;
    const {
      id: awsAccountId,
      albStackName,
      albArn,
      listenerArn,
      albDnsName,
      albSecurityGroup,
      albHostedZoneId,
      albDependentWorkspacesCount,
    } = JSON.parse(value);
     
    if (albArn === null || albArn === "") {
      console.log(
        `albArn is null for ${awsAccountId}  this item. Skipping update.`
      );
      return; // Skip updating this item and move on to the next one
    }
    const item = {
      id: { S: uuidv4() },
      awsAccountId: { S: awsAccountId },
      albStackName: { S: albStackName },
      albArn: { S: albArn },
      listenerArn: { S: listenerArn },
      albDnsName: { S: albDnsName },
      albSecurityGroup: { S: albSecurityGroup },
      albHostedZoneId: { S: albHostedZoneId },
      albDependentWorkspacesCount: {
        N: albDependentWorkspacesCount.toString(),
      },
      rev: { N: "1" },
      createdAt: { S: createdAt },
      updatedAt: { S: updatedAt },
      createdBy: { S: config.admin.uid },
      updatedBy: { S: config.admin.uid },
    };

    const params = {
      TableName: config.swbTables.loadBalancers,
      Item: item,
    };

    if (albHostedZoneId !== null && albHostedZoneId !== "") {
      params.Item.albHostedZoneId = { S: albHostedZoneId };
    } else {
      params.Item.albHostedZoneId = { NULL: true };
    }

    if (dryRun) {
      console.log(
        "Dry run - Details of LoadBalancer Item to be updated " , item
      );
    } else {
      dynamodb.putItem(params, async (err) => {
        if (err) {
          console.error("Error inserting  loadBalancer item:", err);
        } else {
          successfulInsertions++;
          await dynamodb.deleteItem({ TableName: config.swbTables.deploymentStore, Key: { type: { S: "account-workspace-details" }, id: { S: awsAccountId } } }).promise();
          console.log(`LoadBalancer details inserted successfully for awsAccountId : ${awsAccountId}`);
        }
      });
    }
  });
}

// Call the functions in sequence
retrieveDetails((err, details) => {
  if (!err) {
    insertDetails(details);
  }
});

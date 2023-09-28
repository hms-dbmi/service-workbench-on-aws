const AWS = require("aws-sdk");
const config = require("../config.js");

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

async function updateEnvironmentLoadBalancerIds() {
  try {
    // Query environment table for required fields
    const environmentData = await dynamodb
      .scan({
        TableName: config.swbTables.environment,
        ProjectionExpression: "id, indexId, outputs, #st",
        ExpressionAttributeNames: { "#st": "status" }
      })
      .promise();
    if (environmentData.Items.length === 0) {
      console.log("No environment data found.");
    } else {
      const environments = environmentData.Items.map((item) =>
        AWS.DynamoDB.Converter.unmarshall(item)
      );

      let updatedCount = 0;
      let rstudioCount = 0;
      const dryRunDetails = []; // Array to store details for dryRun

      // Iterate through each environment
      for (const environment of environments) {
        const { id, indexId, outputs, status } = environment;
        let filterRstudio = [];
        if (outputs ) {
          filterRstudio = outputs.filter(
            (output) =>
              output?.OutputKey === "MetaConnection1Type" &&
              output?.OutputValue === "RStudioV2"
          );
        }
        if (filterRstudio.length > 0) {
          if (status === "TERMINATED" || status === "FAILED") {
            console.log(`${id} is ${status}. Skipping the updation process.`);
            continue;
          }
          rstudioCount++;
          // Retrieve the awsAccountId based on indexId
          const indexData = await dynamodb
            .query({
              TableName: config.swbTables.indexes,
              ProjectionExpression: "awsAccountId",
              KeyConditionExpression: "id = :id",
              ExpressionAttributeValues: { ":id": { S: indexId } },
            })
            .promise();
          const awsAccountId = AWS.DynamoDB.Converter.unmarshall(
            indexData.Items[0]
          ).awsAccountId;

          // Retrieve the accountNumber based on awsAccountId
          const accountData = await dynamodb
            .query({
              TableName: config.swbTables.awsAccount,
              ProjectionExpression: "accountId",
              KeyConditionExpression: "id = :id",
              ExpressionAttributeValues: { ":id": { S: awsAccountId } },
            })
            .promise();
          const accountId = AWS.DynamoDB.Converter.unmarshall(
            accountData.Items[0]
          ).accountId;
          // Retrieve the loadBalancerId based on awsAccountId
          const loadBalancerData = await dynamodb
            .scan({
              TableName: config.swbTables.loadBalancers,
              ProjectionExpression: "id",
              FilterExpression: "awsAccountId = :awsAccountId",
              ExpressionAttributeValues: {
                ":awsAccountId": { S: awsAccountId },
              },
            })
            .promise();
          const loadBalancerId = AWS.DynamoDB.Converter.unmarshall(
            loadBalancerData.Items[0]
          ).id;

          dryRunDetails.push({
            environmentId: id,
            accountNo: accountId,
            awsAccountId,
            loadBalancerId,
          });
          // Update the environment item with the loadBalancerId
          const updateParams = {
            TableName: config.swbTables.environment,
            Key: { id: { S: id } },
            UpdateExpression: "SET #lbId = :loadBalancerId",
            ExpressionAttributeNames: { "#lbId": "loadBalancerId" },
            ExpressionAttributeValues: {
              ":loadBalancerId": { S: loadBalancerId },
              ":indexId": { S: indexId },
            },
            ConditionExpression:
              "attribute_exists(indexId) AND indexId = :indexId",
          };

          if (!dryRun) {
            updateResult = await dynamodb.updateItem(updateParams).promise();
            if (updateResult) {
              updatedCount++;
            } else {
              console.log(`Error updating item with id: ${id}`);
            }
          }
        } else {
          console.log(`${id} is not an RStudio product `);
        }
      }

      if (dryRun) {
        console.log(
          `Dry run - Total RStudio products to be updated: ${rstudioCount}`
        );
        console.log(
          "Dry run details of RStudio product to be updated:",
          dryRunDetails
        );
      } else {
        console.log(
          `Updated ${updatedCount} out of ${rstudioCount} Rstudio  Environments.`
        );
      }
    }
  } catch (error) {
    console.error("Error updating items:", error.message);
  }
}

updateEnvironmentLoadBalancerIds();

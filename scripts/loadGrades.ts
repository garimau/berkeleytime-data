import * as fs from "fs";
import {
  AthenaClient,
  GetQueryExecutionCommand,
  StartQueryExecutionCommand,
} from "@aws-sdk/client-athena";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { join } from "path";

class StudentEnrollment {
  private database = process.env.AWS_DATABASE;
  private s3Output = process.env.AWS_S3_OUTPUT;
  private regionName = process.env.AWS_REGION_NAME;
  private filename = process.env.AWS_FILENAME;
  private workGroup = process.env.AWS_WORKGROUP;

  private query: string;
  private athenaClient: AthenaClient;
  private s3Client: S3Client;

  constructor(query: string) {
    this.query = query;
    this.athenaClient = new AthenaClient({ region: this.regionName });
    this.s3Client = new S3Client({ region: this.regionName });
  }

  // Load the config details and start query execution
  async loadConf(query: string) {
    try {
      const command = new StartQueryExecutionCommand({
        QueryString: query,
        QueryExecutionContext: {
          Database: this.database,
        },
        ResultConfiguration: {
          OutputLocation: this.s3Output,
        },
        WorkGroup: this.workGroup,
      });

      const response = await this.athenaClient.send(command);

      console.log("Execution ID: " + response.QueryExecutionId);

      return response.QueryExecutionId;
    } catch (error) {
      console.error(error);

      return;
    }
  }

  // Run the Athena query and wait for the result
  async runQuery() {
    const queries = [this.query];

    for (const query of queries) {
      const queryExecutionId = await this.loadConf(query);
      if (!queryExecutionId) return;

      let queryStatus: string | undefined = undefined;

      try {
        // Check the status of the query execution
        while (
          queryStatus === "QUEUED" ||
          queryStatus === "RUNNING" ||
          !queryStatus
        ) {
          const command = new GetQueryExecutionCommand({
            QueryExecutionId: queryExecutionId,
          });

          const execution = await this.athenaClient.send(command);

          queryStatus = execution.QueryExecution?.Status?.State;
          console.log(queryStatus);

          if (queryStatus === "FAILED" || queryStatus === "CANCELLED") {
            throw new Error(
              `Athena query "${this.query}" failed or was cancelled: ${execution.QueryExecution?.Status?.StateChangeReason}`
            );
          }

          // Sleep for 10 seconds
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }

        console.log(`Query "${this.query}" finished.`);

        // Download the result from S3
        await this.downloadDataFile(queryExecutionId);
      } catch (err) {
        console.error(err);
      }
    }
  }

  // Download the result file from S3
  async downloadDataFile(queryId: string) {
    try {
      const parsedS3Output = new URL(this.s3Output as string);

      const bucket = parsedS3Output.host || "";

      const path = parsedS3Output.pathname
        ? parsedS3Output.pathname.replace(/^\//, "")
        : "";

      const objectKey = `${path}${queryId}.csv`;

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      });

      const response = await this.s3Client.send(command);

      const body = await response.Body?.transformToString();

      const file = fs.createWriteStream(join("out", this.filename as string));

      file.on("finish", () => {
        console.log(`Downloaded file to ${this.filename}`);
      });

      file.write(body);
      file.end();
    } catch (err) {
      console.error(err);
    }
  }
}

const main = async () => {
  const enrollment = new StudentEnrollment(
    `SELECT * FROM "lf_cs_curated"."student_grade_distribution_data" WHERE semester_year_term_cd = '2248' limit 250`
  );

  await enrollment.runQuery();
};

main().catch(console.error);

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const getPackageIDCost = async (req, res) => {
  try {
    // Extract and validate the required headers and parameters
    const authToken = req.header("X-Authorization"); // same as other call
    const validToken = process.env.AUTH_TOKEN; // same as other call
    const packageId = req.params.id; // get package id according to spec
    const includeDependency = req.query.dependency === "true"; // for if the cost includes dependencies

    // top add in again when not just testing
    // if (!authToken) {                                     // same as previous api structure
    //   return res
    //     .status(403)
    //     .send("Authentication failed due to invalid or missing AuthenticationToken.");
    // }
    // if (authToken !== validToken) {                       // same as previous api structure (but for costs)
    //   return res
    //     .status(401)
    //     .send("You do not have permission to access package costs.");
    // }
    // bottom add back in when not just testing

    if (!packageId) {
      // new because we need package ID acessible to get cost
      return res
        .status(400)
        .send("There is missing field(s) in the PackageID.");
    }

    const bucketName = process.env.S3_BUCKET; // s3 bucket must be referenced
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    const metadataKey = `${packageId}/metadata.json`; // retrieve metadata
    let packageMetadata;
    try {
      const metadataResponse = await s3Client.send(
        new GetObjectCommand({ Bucket: bucketName, Key: metadataKey })
      );
      const metadataBody = await metadataResponse.Body.transformToString();
      packageMetadata = JSON.parse(metadataBody);
    } catch (err) {
      if (err.name === "NoSuchKey") {
        return res.status(404).send("Package does not exist.");
      }
      console.error("Error retrieving package metadata:", err);
      return res.status(500).send("Error retrieving package metadata.");
    }

    // get the costs from the data
    const calculateTotalCost = async (id) => {
      const metadataKey = `${id}/metadata.json`;
      try {
        const metadataResponse = await s3Client.send(
          new GetObjectCommand({ Bucket: bucketName, Key: metadataKey })
        );
        const metadataBody = await metadataResponse.Body.transformToString();
        const packageData = JSON.parse(metadataBody);

        let totalCost = packageData.standaloneCost || 0;
        if (includeDependency && packageData.dependencies) {
          for (const depId of packageData.dependencies) {
            const depCost = await calculateTotalCost(depId);
            totalCost += depCost.totalCost;
          }
        }
        return {
          standaloneCost: packageData.standaloneCost || 0,

          totalCost,
        };
      } catch (err) {
        console.error(`Error calculating cost for package ${id}:`, err);
        throw new Error("Error calculating package cost.");
      }
    };

    // actually calculate costs
    try {
      const cost = await calculateTotalCost(packageId);

      const response = includeDependency
        ? {
            [packageId]: cost,
            ...(packageMetadata.dependencies || []).reduce(
              async (accPromise, depId) => {
                const acc = await accPromise;
                const depCost = await calculateTotalCost(depId); // we calculate the cost for each dependency
                return {
                  ...acc,
                  [depId]: depCost, // and we add the dependency cost to the total cost
                };
              },
              Promise.resolve({})
            ),
          }
        : { [packageId]: { totalCost: cost.totalCost } }; // total cost is just cost (no dependencies)
      return res.status(200).json(response);
    } catch (error) {
      console.error("Error calculating package cost:", error);
      return res
        .status(500)
        .send(
          "The package rating system choked on at least one of the metrics."
        ); // as per spec
    }
  } catch (error) {
    console.error("Error handling /package/:id/cost request:", error);
    res.status(500).send("An error occurred while processing the request."); // to cover the whole api structure as an error
  }
};

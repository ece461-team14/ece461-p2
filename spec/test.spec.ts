const fs = require('fs');
const path = require('path');

// This will step through the function and check the score for each individual function
// If the repo changes substantially the test values will need to be changed
describe("Individual Scores Test Suite", () => {
    const metricScoreFile = new URL(`file://${path.resolve(__dirname, '../instrumented/metric_score.js')}`);
    const repoURL = 'https://github.com/mrdoob/three.js/';
    let githubData;

    it(`should fetch GitHub data`, async() => {
        const { fetchGitHubData } = await import(metricScoreFile.href);
        githubData = await fetchGitHubData(repoURL);
        expect(githubData).toBeDefined();
    });

    it(`should check busFactorScore()`, async() => {
        const { fetchCollaboratorsCount, busFactorScore } = await import(metricScoreFile.href);
        const contributors = await fetchCollaboratorsCount(githubData.contributors_count);
        expect(contributors).toBeDefined();
        expect(contributors.length).toBeCloseTo(30);
        const busScore = await busFactorScore(contributors.length);
        expect(busScore).toBeDefined();
        expect(busScore).toEqual(1);
    });

    it(`should check correctnessScore()`, async() => {
        const { correctnessScore } = await import(metricScoreFile.href);
        const correctness = await correctnessScore(githubData.issues);
        expect(correctness).toBeDefined();
        expect(correctness).toBeCloseTo(0.14);
    });

    it(`should check rampUpScore()`, async() => {
        const { rampUpScore } = await import(metricScoreFile.href);
        const rampScore = await rampUpScore(repoURL);
        expect(rampScore).toBeDefined();
        expect(rampScore).toBeCloseTo(0.5);
    });

    it(`should check responsivenessScore()`, async() => {
        const { fetchIssues, responsivenessScore } = await import(metricScoreFile.href);
        const [openIssues, closedIssues] = await fetchIssues(repoURL);
        expect(openIssues).toBeDefined();
        expect(closedIssues).toBeDefined();
        const responsiveness = await responsivenessScore(openIssues, closedIssues);
        expect(responsiveness).toBeDefined();
        expect(responsiveness).toEqual(1);
    });

    it(`should check licenseScore()`, async() => {
        const { licenseScore } = await import(metricScoreFile.href);
        const license = await licenseScore(githubData);
        expect(license).toBeDefined();
        expect(license).toEqual(1);
    });

    it(`should check netScore()`, async() => {
        const { netScore } = await import(metricScoreFile.href);
        const net = await netScore(repoURL);
        expect(net).toBeDefined();
        expect(net.NetScore).toBeCloseTo(0.71);
    });
});

// Tests overall application for a variety of URLs
describe("Text Files Test Suite", () => {
    // Function to filter out keys containing "Latency"
    function filterLatency(obj) {
        let filteredObj = {};
        for (let key in obj) {
            if (!key.toLowerCase().includes('latency')) {
                filteredObj[key] = obj[key];
            }
        }
        return filteredObj;
    }

    // Start testing logic
    const testFilesDir = path.resolve(__dirname, 'testFiles');

    // Read all .txt files from the testFiles directory (excludes responses)
    const files = fs.readdirSync(testFilesDir).filter(file => !/^test\d+response\.txt$/.test(file));
    console.log('\nTest Files:\n', files);

    files.forEach(file => {
        const filePath = path.join(testFilesDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const responseFile = file.replace('.txt', 'response.txt');
        const responseFilePath = path.join(testFilesDir, responseFile);
        const responseContent = fs.readFileSync(responseFilePath, 'utf-8');

        it(`should process the content of ${file}`, async() => {
            expect(fileContent.length).toBeGreaterThan(0);  // Content length > 0

            // Dynamically import the ES module
            const fileUrl = new URL(`file://${path.resolve(__dirname, '../instrumented/app.js')}`);
            const { main } = await import(fileUrl.href);

            // Get response
            const response = await main(path.resolve(testFilesDir, file));
            expect(response).toBeDefined();  // Ensure the content is not empty

            // Check if response if valid JSON and matches response
            const ndjsonOutput = JSON.parse(response);
            const ndjsonTest = JSON.parse(responseContent);
            if (ndjsonTest.NetScore == -1) {
                expect(ndjsonOutput.NetScore).toEqual(-1);
            }
            else {
                // Remove latency entries as they fluctuate and are not conducive to testing
                const filteredTest = filterLatency(ndjsonTest);
                const filteredOutput = filterLatency(ndjsonOutput);
                expect(filteredOutput.toString()).toEqual(filteredTest.toString());
            }
        });
    });
});

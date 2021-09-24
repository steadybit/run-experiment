const core = require( '@actions/core');
const {SteadybitAPI} = require('./steadybitAPI.js');

async function run() {
    const baseURL = core.getInput('baseURL');
    const apiAccessToken = core.getInput('apiAccessToken');
    const experimentKey = core.getInput('experimentKey');
    const parallelExecution = core.getInput('parallel') === 'true';
    const maxRetries = parseInt(core.getInput('maxRetries'));
    const expectedState = core.getInput('expectedState');
    const expectedFailureReason = core.getInput('expectedFailureReason');

    const steadybitAPI = new SteadybitAPI(baseURL, apiAccessToken);

    try {
        const executionUrl = await steadybitAPI.runExperiment(experimentKey, parallelExecution, maxRetries);
        console.log(`Experiment ${experimentKey} is running, checking status...`);
        const result = await steadybitAPI.awaitExecutionState(executionUrl, expectedState, expectedFailureReason);
        console.log(`Experiment ${experimentKey} ended. ${result}`);
    } catch (error) {
        core.setFailed(`Experiment ${experimentKey} failed: ${error}`);
    }
}

run();

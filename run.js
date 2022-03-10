const core = require('@actions/core');

const { SteadybitAPI } = require('./steadybitAPI');

exports.run = async function run() {
    const baseURL = core.getInput('baseURL');
    const apiAccessToken = core.getInput('apiAccessToken');
    const experimentKey = core.getInput('experimentKey');
    const parallelExecution = core.getInput('parallel') === 'true';
    const maxRetries = parseInt(core.getInput('maxRetries'));
    const maxRetriesOnExpectationFailure = parseInt(core.getInput('maxRetriesOnExpectationFailure') || 0);
    const expectedState = core.getInput('expectedState');
    const expectedFailureReason = core.getInput('expectedFailureReason');

    const steadybitAPI = new SteadybitAPI(baseURL, apiAccessToken);

    let lastResult;
    let lastError;
    const maximumAttempts = Math.max(1, maxRetriesOnExpectationFailure);
    for (let attempt = 0; attempt < maximumAttempts && lastResult == null; attempt++) {
        lastResult = null;
        lastError = null;

        try {
            console.log(`Triggering experiment ${experimentKey} for attempt ${attempt + 1}/${maximumAttempts}.`);
            const executionUrl = await steadybitAPI.runExperiment(experimentKey,
                parallelExecution,
                maxRetries);
            console.log(`Experiment ${experimentKey} is running, checking status...`);
            lastResult = await steadybitAPI.awaitExecutionState(executionUrl,
                expectedState,
                expectedFailureReason);
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) {
        core.setFailed(`Experiment ${experimentKey} failed: ${lastError}`);
    } else {
        console.log(`Experiment ${experimentKey} ended. ${lastResult}`);
    }
}


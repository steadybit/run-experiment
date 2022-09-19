const core = require('@actions/core');

const { SteadybitAPI } = require('./steadybitAPI');
const { delay } = require('./util');

exports.run = async function run() {
    const baseURL = core.getInput('baseURL');
    const apiAccessToken = core.getInput('apiAccessToken');
    const experimentKey = core.getInput('experimentKey');
    const parallelExecution = core.getInput('parallel') === 'true';
    const maxRetries = parseInt(core.getInput('maxRetries'));
    const maxRetriesOnExpectationFailure = parseInt(core.getInput('maxRetriesOnExpectationFailure') || 0);
    const delayBetweenRetriesOnExpectationFailure = parseInt(core.getInput('delayBetweenRetriesOnExpectationFailure') || 0);
    const expectedState = core.getInput('expectedState');
    const expectedReason = core.getInput('expectedFailureReason') || core.getInput('expectedReason');

    const steadybitAPI = new SteadybitAPI(baseURL, apiAccessToken);

    let lastResult;
    let lastError;
    const maximumAttempts = Math.max(1, maxRetriesOnExpectationFailure);
    for (let attempt = 0; attempt < maximumAttempts && lastResult == null; attempt++) {
        lastResult = null;
        lastError = null;

        if (attempt > 0) {
            console.log(`Sleeping for ${delayBetweenRetriesOnExpectationFailure}ms before retrying.`);
            await delay(delayBetweenRetriesOnExpectationFailure);
        }

        try {
            console.log(`Triggering experiment ${experimentKey} for attempt ${attempt + 1}/${maximumAttempts}.`);
            const executionUrl = await steadybitAPI.runExperiment(experimentKey, parallelExecution, maxRetries);
            console.log(`Experiment ${experimentKey} is running, checking status...`);
            lastResult = await steadybitAPI.awaitExecutionState(executionUrl, expectedState, expectedReason);
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) {
        core.setFailed(`Experiment ${experimentKey} failed: ${lastError}`);
    } else {
        console.log(`Experiment ${experimentKey} ended. ${lastResult}`);
    }
};

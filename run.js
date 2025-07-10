const core = require('@actions/core');

const { SteadybitAPI } = require('./steadybitAPI');
const { delay } = require('./util');

exports.run = async function run() {
    try {
        core.info('Start collecting inputs for Steadybit experiment execution...');
        const baseURL = core.getInput('baseURL');
        const apiAccessToken = core.getInput('apiAccessToken');
        let experimentKey = core.getInput('experimentKey');
        const externalId = core.getInput('externalId');
        const parallelExecution = core.getInput('parallel') === 'true';
        const maxRetries = parseInt(core.getInput('maxRetries'));
        const maxRetriesOnExpectationFailure = parseInt(core.getInput('maxRetriesOnExpectationFailure') || 0);
        const delayBetweenRetriesOnExpectationFailure = parseInt(core.getInput('delayBetweenRetriesOnExpectationFailure') || 0);
        const expectedState = core.getInput('expectedState');
        const expectedReason = core.getInput('expectedFailureReason') || core.getInput('expectedReason');
        const getExperimentSummary = (experiment) =>
            `${experiment.key} ("${experiment.name.length > 20 ? `${experiment.name.substring(0, 20)}...` : experiment.name}")`;

        if (!apiAccessToken) {
            core.setFailed('apiAccessToken not provided.');
            return;
        }
        if (!experimentKey && !externalId) {
            core.setFailed('Neither experimentKey or externalId is provided.');
            return;
        }
        const steadybitAPI = new SteadybitAPI(baseURL, apiAccessToken);

        if (!experimentKey && externalId) {
            core.info(`Lookup Experiment Key for external Id ${externalId}.`);
            experimentKey = await steadybitAPI.lookupByExternalId(externalId);
        }

        core.info('Load experiment details...');
        const experiment = await steadybitAPI.getExperiment(experimentKey);

        let lastResult;
        let lastError;
        const maximumAttempts = Math.max(1, maxRetriesOnExpectationFailure);
        for (let attempt = 0; attempt < maximumAttempts && lastResult == null; attempt++) {
            lastResult = null;
            lastError = null;

            if (attempt > 0) {
                core.info(`Sleeping for ${delayBetweenRetriesOnExpectationFailure}ms before retrying.`);
                await delay(delayBetweenRetriesOnExpectationFailure);
            }

            try {
                core.info(`Triggering experiment ${getExperimentSummary(experiment)} for attempt ${attempt + 1}/${maximumAttempts}.`);
                const executionUrl = await steadybitAPI.runExperiment(experimentKey, parallelExecution, maxRetries);
                core.debug(`Experiment ${getExperimentSummary(experiment)} is running, checking status...`);
                lastResult = await steadybitAPI.awaitExecutionState(executionUrl, expectedState, expectedReason);
            } catch (error) {
                lastError = error;
            }
        }

        if (lastError) {
            core.setFailed(`Experiment ${getExperimentSummary(experiment)} failed: ${lastError}`);
        } else {
            core.info(`Experiment ${getExperimentSummary(experiment)} ended. ${lastResult}`);
        }
    } catch (error) {
        const debugInfo = {
            type: typeof error,
            constructor: error.constructor?.name,
            message: error.message,
            name: error.name,
            code: error.code,
            status: error.status,
            stack: error.stack,
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
        };

        if (error instanceof AggregateError) {
            core.setFailed(
                `Multiple errors during experiment execution:\n${error.errors.map((e) => e.message).join('\n')}\n\nDEBUG INFO:\n${JSON.stringify(debugInfo, null, 2)}`,
            );
        } else {
            core.setFailed(`Error during experiment execution: ${error.message}\n\nDEBUG INFO:\n${JSON.stringify(debugInfo, null, 2)}`);
        }
    }
};

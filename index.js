import { SteadybitAPI } from './steadybitAPI.js';

import core from '@actions/core';

const getReasonDetails = (reason) => {
    if (reason.response && reason.response.data) {
        if (reason.response.data.title) {
            return reason.response.data.title;
        }
        return JSON.stringify(reason.response.data);
    }
    return null;
};

function run() {
    const baseURL = core.getInput('baseURL');
    const apiAccessToken = core.getInput('apiAccessToken');
    const experimentKey = core.getInput('experimentKey');
    const expectedState = core.getInput('expectedState');
    const expectedFailureReason = core.getInput('expectedFailureReason');

    const steadybitAPI = new SteadybitAPI(baseURL, apiAccessToken);
    steadybitAPI.executeExperiment(experimentKey, expectedState, expectedFailureReason)
        .catch(reason => {
            const reasonDetails = getReasonDetails(reason);
            core.setFailed(`Experiment ${experimentKey} failed: ${reason}${reasonDetails ? `, Details: ${reasonDetails}` : ''}`);
        });
}

run();
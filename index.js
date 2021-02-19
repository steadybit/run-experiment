import { SteadybitAPI } from './steadybitAPI.js';

import core from '@actions/core';

function run() {
    const baseURL = core.getInput('baseURL');
    const apiAccessToken = core.getInput('apiAccessToken');
    const experimentKey = core.getInput('experimentKey');
    const expectedState = core.getInput('expectedState');
    const expectedFailureReason = core.getInput('expectedFailureReason');

    const steadybitAPI = new SteadybitAPI(baseURL, apiAccessToken);
    steadybitAPI.executeExperiment(experimentKey, expectedState, expectedFailureReason).catch(core.setFailed);
}

run();
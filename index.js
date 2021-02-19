import {SteadybitAPI} from './steadybitAPI.js';

import core from '@actions/core';

try {
    const baseURL = core.getInput('baseURL');
    const apiAccessToken = core.getInput('apiAccessToken');
    const experimentKey = core.getInput('experimentKey');

    const steadybitAPI = new SteadybitAPI(baseURL, apiAccessToken);
    steadybitAPI.executeExperiment(experimentKey)
        .catch(reason => core.setFailed(reason));
} catch (error) {
    core.setFailed(error.message);
}
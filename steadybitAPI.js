/*
 * Copyright 2023 steadybit GmbH. All rights reserved.
 */

const axios = require('axios');
const core = require('@actions/core');

const { delay } = require('./util');

exports.SteadybitAPI = class SteadybitAPI {
    allowParallelBackoffInterval = 30;
    executionStateQueryInterval = 3;

    constructor(baseURL, apiAccessToken, httpFactory = axios.create) {
        this.http = httpFactory({
            baseURL,
            headers: { Authorization: `accessToken ${apiAccessToken}`, 'Content-Type': 'application/json' },
        });
    }

    async runExperiment(experimentKey, allowParallel = false, retries = 3) {
        try {
            const response = await this.http.post(`/api/experiments/${experimentKey}/execute`, null, { params: { allowParallel: String(allowParallel) } });
            return response.headers.location;
        } catch (error) {
            const responseBody = error.response?.data;
            if (responseBody?.status === 422 && responseBody?.title.match(/Another.*running/) !== null && retries > 0) {
                core.info(`Another experiment is running, retrying in ${this.allowParallelBackoffInterval} seconds.`);
                await delay(this.allowParallelBackoffInterval * 1000);
                return this.runExperiment(experimentKey, allowParallel, retries - 1);
            } else {
                throw this._getErrorFromResponse(error);
            }
        }
    }

    async getExperiment(experimentKey) {
        try {
            const response = await this.http.get(`/api/experiments/${experimentKey}`);
            return response?.body;
        } catch (error) {
            throw this._getErrorFromResponse(error);
        }
    }

    async lookupByExternalId(externalId) {
        try {
            const response = await this.http.get(`/api/experiments`, { params: { externalId } });
            const experiments = response?.data.experiments;
            if (experiments && experiments.length === 1) {
                return experiments[0].key;
            } else {
                throw `Experiment with externalId '${externalId}' could not be found.`;
            }
        } catch (error) {
            throw this._getErrorFromResponse(error);
        }
    }

    async awaitExecutionState(url, expectedState, expectedReason) {
        try {
            const response = await this.http.get(url);
            const execution = response?.data;
            if (execution?.state === expectedState) {
                return this._executionEndedInExpectedState(execution, expectedReason);
            } else {
                return this._executionEndedInDifferentState(url, execution, expectedState, expectedReason);
            }
        } catch (error) {
            throw this._getErrorFromResponse(error);
        }
    }

    async _executionEndedInExpectedState(execution, expectedReason) {
        const executionReason = execution?.failureReason || execution?.reason;
        if (!expectedReason || expectedReason === executionReason) {
            return `Execution ${execution.id} ended with '${execution.state}${executionReason ? ` - ${executionReason}` : ''}'.`;
        } else {
            throw `Execution ${execution.id} ended with '${execution.state}'. Expected failure reason '${expectedReason}', but was '${executionReason}'`;
        }
    }

    async _executionEndedInDifferentState(url, execution, expectedState, expectedReason) {
        const executionReason = execution?.failureReason || execution?.reason;
        if (execution && execution.ended) {
            throw `Execution ${execution.id} ended with '${execution.state}${executionReason ? ` - ${executionReason}` : ''}' but expected '${expectedState}${
                expectedReason ? ` - ${expectedReason}` : ''
            }'`;
        } else {
            await delay(this.executionStateQueryInterval * 1000);
            return this.awaitExecutionState(url, expectedState, expectedReason);
        }
    }

    _getErrorFromResponse(error) {
        if (error.response && error.response.data) {
            return error.response.data.title ? error.response.data.title : JSON.stringify(error.response.data);
        }
        return error.toString();
    }
};

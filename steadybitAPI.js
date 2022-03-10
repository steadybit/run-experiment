const axios = require('axios');

async function delay(time, value) {
    return new Promise((resolve) => {
        setTimeout(resolve.bind(null, value), time);
    });
}

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
                console.log(`Another experiment is running, retrying in ${this.allowParallelBackoffInterval} seconds.`);
                await delay(this.allowParallelBackoffInterval * 1000);
                return this.runExperiment(experimentKey, allowParallel, retries - 1);
            } else {
                throw this._getErrorFromResponse(error);
            }
        }
    }

    async awaitExecutionState(url, expectedState, expectedFailureReason) {
        try {
            const response = await this.http.get(url);
            const execution = response?.data;
            if (execution?.state === expectedState) {
                return this._executionEndedInExpectedState(execution, expectedFailureReason);
            } else {
                return this._executionEndedInDifferentState(url, execution, expectedState, expectedFailureReason);
            }
        } catch (error) {
            throw this._getErrorFromResponse(error);
        }
    }

    async _executionEndedInExpectedState(execution, expectedFailureReason) {
        if (!expectedFailureReason || expectedFailureReason === execution.failureReason) {
            return `Execution ${execution.id} ended with '${execution.state}${execution.failureReason ? ` - ${execution.failureReason}` : ''}'.`;
        } else {
            throw `Execution ${execution.id} ended with '${execution.state}'. Expected failure reason '${expectedFailureReason}', but was '${execution.failureReason}'`;
        }
    }

    async _executionEndedInDifferentState(url, execution, expectedState, expectedFailureReason) {
        if (execution && execution.ended) {
            throw `Execution ${execution.id} ended with '${execution.state}${
                execution.failureReason ? ` - ${execution.failureReason}` : ''
            }' but expected '${expectedState}${expectedFailureReason ? ` - ${expectedFailureReason}` : ''}'`;
        } else {
            await delay(this.executionStateQueryInterval * 1000);
            return this.awaitExecutionState(url, expectedState, expectedFailureReason);
        }
    }

    _getErrorFromResponse(error) {
        if (error.response && error.response.data) {
            return error.response.data.title ? error.response.data.title : JSON.stringify(error.response.data);
        }
        return error.toString();
    }
}

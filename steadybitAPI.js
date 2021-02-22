import axios from 'axios';

class SteadybitHttpAPI {
    constructor(baseURL, apiAccessToken) {
        this.baseURL = baseURL;
        this.apiAccessToken = apiAccessToken;
    }

    postURI(uri, data) {
        return axios.post(`${this.baseURL}/api/${uri}`, data, { headers: { 'Authorization': `accessToken ${this.apiAccessToken}` } });
    }

    getURL(url) {
        return axios.get(url, { headers: { 'Authorization': `accessToken ${this.apiAccessToken}` } });
    }
}

export class SteadybitAPI {
    constructor(baseURL, apiAccessToken) {
        this.api = new SteadybitHttpAPI(baseURL, apiAccessToken);
    }

    executeExperiment(experimentKey, expectedState, expectedFailureReason) {
        return new Promise((resolve, reject) => {
            this.api.postURI(`experiments/${experimentKey}/execute`)
                .then(value => {
                    if (expectedState !== undefined) {
                        console.log(`Experiment ${experimentKey} execution created, checking status...`);
                        return this.awaitExecutionState(value.headers.location, expectedState, expectedFailureReason)
                            .then(resolve)
                            .catch(reject);
                    }
                }).catch(reject);
        });
    }

    awaitExecutionState(url, expectedState, expectedFailureReason) {
        return new Promise((resolve, reject) => {
            this.api.getURL(url)
                .then(response => {
                    const execution = response.data;
                    if (execution.attacksStarted && execution.state === expectedState) {
                        console.log(`Execution ${execution.id} in expected state ${execution.state}`);
                        if (expectedFailureReason !== '') {
                            if (expectedFailureReason === execution.failureReason) {
                                console.log(`Execution ${execution.id} has expected failure reason ${execution.failureReason}`);
                                resolve('Success, state and failureReason match');
                            } else {
                                console.log(`Execution ${execution.id} has different failure reason (expected ${expectedFailureReason}, actual ${execution.failureReason})`);
                                reject('Failed, state matches but failureReason differ')
                            }
                        } else {
                            resolve('Success, state match');
                        }
                    } else {
                        console.log(`Execution ${execution.id} in state ${execution.state}, expecting to be in ${expectedState} ${execution.estimatedEnd ? `(estimated end ${execution.estimatedEnd})` : ''}`);
                        if (execution.ended) {
                            reject('Failed, execution ended with different state');
                        } else {
                            setTimeout(() => this.awaitExecutionState(url, expectedState, expectedFailureReason)
                                .then(resolve)
                                .catch(reject), 1000);
                        }
                    }
                }).catch(reject);
        });
    }

}
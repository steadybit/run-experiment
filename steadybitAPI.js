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

    executeExperiment(experimentKey, expectedState) {
        return new Promise((resolve, reject) => {
            this.api.postURI(`experiments/${experimentKey}/execute`)
                .then(value => {
                    if (expectedState !== undefined) {
                        console.log(`Experiment ${experimentKey} execution created, checking status...`);
                        return this.awaitExecutionState(value.headers.location, expectedState)
                            .then(resolve)
                            .catch(reject);
                    }
                }).catch(reject);
        });
    }

    awaitExecutionState(url, expectedState) {
        return new Promise((resolve, reject) => {
            this.api.getURL(url)
                .then(response => {
                    const execution = response.data;
                    if (execution.state === expectedState) {
                        console.log(`Execution ${execution.id} in expected state ${execution.state}`);
                        resolve('Success');
                    } else {
                        console.log(`Execution ${execution.id} in state ${execution.state}, expecting to be in ${expectedState} ${execution.estimatedEnd ? `(estimated end ${execution.estimatedEnd})` : ''}`);
                        if (execution.ended) {
                            reject('Failed');
                        } else {
                            setTimeout(() => this.awaitExecutionState(url, expectedState).then(resolve).catch(reject), 1000);
                        }
                    }
                }).catch(reject);
        });
    }

}
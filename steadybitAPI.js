import axios from "axios";

class SteadybitHttpAPI {
  constructor(baseURL, apiAccessToken) {
    this.baseURL = baseURL;
    this.apiAccessToken = apiAccessToken;
  }

  postURI(uri, data) {
    return axios.post(`${this.baseURL}/api/${uri}`, data, {
      headers: { Authorization: `accessToken ${this.apiAccessToken}` }
    });
  }

  getURL(url) {
    return axios.get(url, {
      headers: { Authorization: `accessToken ${this.apiAccessToken}` }
    });
  }
}

export class SteadybitAPI {
  constructor(baseURL, apiAccessToken) {
    this.api = new SteadybitHttpAPI(baseURL, apiAccessToken);
  }

  runExperiment(experimentKey, expectedState, expectedFailureReason, parallel = false) {
    return new Promise((resolve, reject) => {
      this.api
        .postURI(`scenarios/${experimentKey}/run${parallel ? `?allowParallel=${parallel}` : ``}`)
        .then((value) => {
          console.log(`Experiment ${experimentKey} is running, checking status...`);
          return this.awaitExecutionState(value.headers.location, expectedState, expectedFailureReason).then(resolve).catch(reject);
        })
        .catch((reason) => {
          const response = reason.response.data;
          if (response.status === 422 && response.title && response.title.match(/Another.*running/) !== null) {
            console.log("Another experiment is running, retrying in 30 seconds");
            setTimeout(() => this.runExperiment(experimentKey, expectedState, expectedFailureReason).then(resolve).catch(reject), 30000);
          } else {
            reject(reason);
          }
        });
    });
  }

  awaitExecutionState(url, expectedState, expectedFailureReason) {
    return new Promise((resolve, reject) => {
      this.api
        .getURL(url)
        .then((response) => {
          const execution = response.data;
          if (execution.state === expectedState) {
            this.#executionEndedInExpectedState(execution, expectedFailureReason, resolve, reject);
          } else {
            this.#executionEndedInDifferentState(execution, expectedState, reject, url, expectedFailureReason, resolve);
          }
        })
        .catch(reject);
    });
  }

  #executionEndedInExpectedState(execution, expectedFailureReason, resolve, reject) {
    console.log(`Execution ended ${execution.id} in expected state ${execution.state}`);
    if (expectedFailureReason === "") {
      resolve("Success, state matches");
    } else if (expectedFailureReason === execution.failureReason) {
      console.log(`Execution ${execution.id} has expected failure reason ${execution.failureReason}`);
      resolve("Success, state and failureReason match");
    } else {
      console.log(`Execution ${execution.id} has different failure reason (expected ${expectedFailureReason}, actual ${execution.failureReason})`);
      reject(`State matches but failureReason differ: expected ${expectedFailureReason}, actual ${execution.failureReason}`);
    }
  }

  #executionEndedInDifferentState(execution, expectedState, reject, url, expectedFailureReason, resolve) {
    console.log(`Execution ${execution.id} in state ${execution.state}, expecting to be in ${expectedState}`);
    if (execution.ended) {
      reject(
        `Execution ended with different state: expected ${expectedState}, actual ${execution.state}${
          execution.failureReason ? ` - failure reason: ${execution.failureReason}` : ""
        }`
      );
    } else {
      setTimeout(() => this.awaitExecutionState(url, expectedState, expectedFailureReason).then(resolve).catch(reject), 1000);
    }
  }
}

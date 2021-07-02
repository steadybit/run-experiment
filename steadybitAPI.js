import axios from "axios";

class SteadybitHttpAPI {
  constructor(baseURL, apiAccessToken) {
    this.baseURL = baseURL;
    this.apiAccessToken = apiAccessToken;
  }

  postURI(uri, data) {
    return axios.post(`${this.baseURL}/api/${uri}`, data, {
      headers: { Authorization: `accessToken ${this.apiAccessToken}` },
    });
  }

  getURL(url) {
    return axios.get(url, {
      headers: { Authorization: `accessToken ${this.apiAccessToken}` },
    });
  }
}

export class SteadybitAPI {
  constructor(baseURL, apiAccessToken) {
    this.api = new SteadybitHttpAPI(baseURL, apiAccessToken);
  }

  executeExperiment(experimentKey, expectedState, expectedFailureReason) {
    return new Promise((resolve, reject) => {
      this.api
        .postURI(`experiments/${experimentKey}/execute`)
        .then((value) => {
          if (expectedState !== undefined) {
            console.log(
              `Experiment ${experimentKey} execution created, checking status...`
            );
            return this.awaitExecutionState(
              value.headers.location,
              true,
              expectedState,
              expectedFailureReason
            )
              .then(resolve)
              .catch(reject);
          }
        })
        .catch(reject);
    });
  }

  executeScenario(scenarioKey, expectedState, expectedFailureReason) {
    return new Promise((resolve, reject) => {
      this.api
        .postURI(`scenarios/${scenarioKey}/run`)
        .then((value) => {
          if (expectedState !== undefined) {
            console.log(
              `Scenario ${scenarioKey} execution created, checking status...`
            );
            return this.awaitExecutionState(
              value.headers.location,
              false,
              expectedState,
              expectedFailureReason
            )
              .then(resolve)
              .catch(reject);
          }
        })
        .catch(reject);
    });
  }

  awaitExecutionState(url, isExperiment, expectedState, expectedFailureReason) {
    return new Promise((resolve, reject) => {
      this.api
        .getURL(url)
        .then((response) => {
          const execution = response.data;
          if (execution.state === expectedState) {
            this.#executionEndedInExpectedState(
              execution,
              isExperiment,
              expectedFailureReason,
              resolve,
              reject
            );
          } else {
            this.#executionEndedInDifferentState(
              execution,
              expectedState,
              reject,
              url,
              expectedFailureReason,
              resolve
            );
          }
        })
        .catch(reject);
    });
  }

  #executionEndedInExpectedState(
    execution,
    isExperiment,
    expectedFailureReason,
    resolve,
    reject
  ) {
    if (execution.attacksStarted || !isExperiment) {
      console.log(
        `Execution ended ${execution.id} in expected state ${execution.state}`
      );
      if (expectedFailureReason === "") {
        resolve("Success, state matches");
      } else if (expectedFailureReason === execution.failureReason) {
        console.log(
          `Execution ${execution.id} has expected failure reason ${execution.failureReason}`
        );
        resolve("Success, state and failureReason match");
      } else {
        console.log(
          `Execution ${execution.id} has different failure reason (expected ${expectedFailureReason}, actual ${execution.failureReason})`
        );
        reject(
          `State matches but failureReason differ: expected ${expectedFailureReason}, actual ${execution.failureReason}`
        );
      }
    } else {
      reject(
        `Execution ended in expected state (${execution.state}) already before any attack was performed`
      );
    }
  }

  #executionEndedInDifferentState(
    execution,
    expectedState,
    reject,
    url,
    expectedFailureReason,
    resolve
  ) {
    console.log(
      `Execution ${execution.id} in state ${
        execution.state
      }, expecting to be in ${expectedState} ${
        execution.estimatedEnd
          ? `(estimated end ${execution.estimatedEnd})`
          : ""
      }`
    );
    if (execution.ended) {
      reject(
        `Execution ended with different state: expected ${expectedState}, actual ${execution.state}`
      );
    } else {
      setTimeout(
        () =>
          this.awaitExecutionState(url, expectedState, expectedFailureReason)
            .then(resolve)
            .catch(reject),
        1000
      );
    }
  }
}

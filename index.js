import { SteadybitAPI } from "./steadybitAPI.js";

import core from "@actions/core";

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
  const baseURL = core.getInput("baseURL");
  const apiAccessToken = core.getInput("apiAccessToken");
  const experimentKey = core.getInput("experimentKey");
  const expectedState = core.getInput("expectedState");
  const expectedFailureReason = core.getInput("expectedFailureReason");
  const parallelExecution = core.getInput("parallel") === "true";
  const maxRetries = core.getInput("maxRetries");

  const steadybitAPI = new SteadybitAPI(baseURL, apiAccessToken);
  const executionPromise = steadybitAPI.runExperiment(experimentKey, expectedState, expectedFailureReason, parallelExecution, maxRetries);

  executionPromise.catch((reason) => {
    const reasonDetails = getReasonDetails(reason);
    const summary = `Experiment ${experimentKey}`;
    core.setFailed(`${summary} failed: ${reason}${reasonDetails ? `, Details: ${reasonDetails}` : ""}`);
  });
}

run();

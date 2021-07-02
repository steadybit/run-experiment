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
  const scenarioKey = core.getInput("scenarioKey");
  const experimentKey = core.getInput("experimentKey");
  const expectedState = core.getInput("expectedState");
  const expectedFailureReason = core.getInput("expectedFailureReason");

  if (!scenarioKey && !experimentKey) {
    core.setFailed(
      "Please provide either experimentKey or scenarioKey of the experiment/scenario to be executed."
    );
  }

  const steadybitAPI = new SteadybitAPI(baseURL, apiAccessToken);
  const executionPromise = scenarioKey
    ? steadybitAPI.executeScenario(
        scenarioKey,
        expectedState,
        expectedFailureReason
      )
    : steadybitAPI.executeExperiment(
        experimentKey,
        expectedState,
        expectedFailureReason
      );

  executionPromise.catch((reason) => {
    const reasonDetails = getReasonDetails(reason);
    const summary = scenarioKey
      ? `Scenario ${scenarioKey}`
      : `Experiment ${experimentKey}`;
    core.setFailed(
      `${summary} failed: ${reason}${
        reasonDetails ? `, Details: ${reasonDetails}` : ""
      }`
    );
  });
}

run();

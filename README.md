# Run Experiment action

Runs an experiment and checks the status of the experiment while executing

## Inputs

### `apiAccessToken`

**Required** Access Token to be used for accessing steadybit API.

### `baseURL`

Base URL of steadybit. Default`"https://platform.steadybit.io"`

### `experimentKey`

Key of the experiment to be executed. **Required** if you don't provide the `externalId` to lookup your experiment.

### `externalId`

External ID of the experiment to be executed. Alternative to lookup the experiment by `experimentKey`

### `expectedState`

The expected state of the experiment after attacks started to mark Action successful. Default`"COMPLETED"`

### `expectedFailureReason`

The expected failure reason of the experiment to mark Action successful. Default`""`

### `maxRetriesOnExpectationFailure`

An optional of retries to attempt when `expectedState` does not match the actual state. Default `"0"`.

### `delayBetweenRetriesOnExpectationFailure`

Number of milliseconds to wait between experiment executions when an experiment has to be retried due to expectation failures. Default `"60000"`.

### `maxRetriesOnValidationFailure`

Number of retries when the experiment fails validation (e.g., missing targets). On intermediate retries the execution is not persisted (`forcePersist=false`) so you only get validation errors. On the last attempt the execution is always persisted (`forcePersist=true`) so you get a visible execution even if validation still fails. Default `"0"` (no retry).

### `delayBetweenRetriesOnValidationFailure`

Number of seconds to wait between retries on validation failure. Default `"15"`.

## Outputs

### `executionId`

The ID of the experiment execution.

### `executionUrl`

The URL of the experiment execution.

### `executionState`

The final state of the experiment execution (e.g. `COMPLETED`, `FAILED`, `RUNNING`).

### `executionReason`

The reason or failure reason of the experiment execution, if any.

## Example usage

```
- name: Run Experiment (EXPERIMENT-1)
uses: steadybit/run-experiment@v1
with:
  apiAccessToken: ${{ secrets.STEADYBIT_API_ACCESS_TOKEN }}
  experimentKey: 'EXPERIMENT-1'
```

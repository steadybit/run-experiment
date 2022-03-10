# Run Experiment action

Runs an experiment and checks the status of the experiment while executing

## Inputs

### `apiAccessToken`

**Required** Access Token to be used for accessing steadybit API.

### `baseURL`

Base URL of steadybit. Default`"https://platform.steadybit.io"`

### `experimentKey`

**Required** Key of the experiment to be executed.

### `expectedState`

The expected state of the experiment after attacks started to mark Action successful. Default`"COMPLETED"`

### `expectedFailureReason`

The expected failure reason of the experiment to mark Action successful. Default`""`

### `maxRetriesOnExpectationFailure`

An optional of retries to attempt when `expectedState` does not match the actual state. Default `"0"`.

### `delayBetweenRetriesOnExpectationFailure`

Number of milliseconds to wait between experiment executions when an experiment has to be retried due to expectation failures. Default `"60000"`.

## Outputs

None for now

## Example usage

```
- name: Run Experiment (EXPERIMENT-1)
uses: steadybit/run-experiment@v1
with:
  apiAccessToken: ${{ secrets.STEADYBIT_API_ACCESS_TOKEN }}
  experimentKey: 'EXPERIMENT-1'
```

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

## Outputs

None for now

## Example usage

```
- name: Run Experiment (EXPERIMENT-1)
uses: steadybit/experiment-github-actions@v1
with:
  apiAccessToken: ${{ secrets.STEADYBIT_API_ACCESS_TOKEN }}
  experimentKey: 'EXPERIMENT-1'
```

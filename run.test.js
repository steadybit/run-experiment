import { jest } from '@jest/globals';
import { when } from 'jest-when';

jest.unstable_mockModule('./steadybitAPI.js', () => {
    const mockInstance = {
        runExperiment: jest.fn(),
        getExperiment: jest.fn(),
        lookupByExternalId: jest.fn(),
        awaitExecutionState: jest.fn(),
    };

    return {
        mockInstance,
        SteadybitAPI: function () {
            return mockInstance;
        },
    };
});

jest.unstable_mockModule('@actions/core', () => ({
    debug: jest.fn(),
    getInput: jest.fn(),
    info: jest.fn(),
    setFailed: jest.fn(),
    setOutput: jest.fn(),
}));

const { mockInstance } = await import('./steadybitAPI.js');
const core = await import('@actions/core');
const { run } = await import('./run.js');

describe('run', () => {
    beforeEach(() => {
        mockInstance.runExperiment.mockReset();
        mockInstance.getExperiment.mockReset();
        mockInstance.lookupByExternalId.mockReset();
        mockInstance.awaitExecutionState.mockReset();
        core.setFailed.mockReset();
        core.setOutput.mockReset();
        core.getInput.mockReset();
    });

    it('should lookup by external id', async () => {
        // Given
        when(core.getInput).calledWith('externalId').mockReturnValue('EXT-ID');
        when(core.getInput).calledWith('apiAccessToken').mockReturnValue('token');
        when(mockInstance.lookupByExternalId).calledWith('EXT-ID').mockReturnValue('KEY1');
        mockInstance.runExperiment.mockResolvedValue('https://example.com/api/executions/123');
        mockInstance.getExperiment.mockResolvedValue({ name: 'Experiment from Jest', key: 'KEY1' });
        mockInstance.awaitExecutionState.mockResolvedValueOnce({ id: 123, state: 'COMPLETED', reason: undefined });

        // When
        await run();

        // Then
        expect(core.setFailed).toHaveBeenCalledTimes(0);
        expect(core.setOutput).toHaveBeenCalledWith('executionId', 123);
        expect(core.setOutput).toHaveBeenCalledWith('executionUrl', 'https://example.com/api/executions/123');
        expect(core.setOutput).toHaveBeenCalledWith('executionState', 'COMPLETED');
        expect(mockInstance.runExperiment).toHaveBeenCalledTimes(1);
        expect(mockInstance.awaitExecutionState).toHaveBeenCalledTimes(1);
    });

    it('should retry experiments until they succeed', async () => {
        // Given
        when(core.getInput).calledWith('apiAccessToken').mockReturnValue('token');
        when(core.getInput).calledWith('experimentKey').mockReturnValue('KEY-1');
        when(core.getInput).calledWith('maxRetries').mockReturnValue('3');
        when(core.getInput).calledWith('maxRetriesOnExpectationFailure').mockReturnValue('3');
        mockInstance.runExperiment.mockRejectedValueOnce(new Error()).mockResolvedValue('https://example.com/api/executions/123');
        mockInstance.getExperiment.mockResolvedValue({ name: 'Experiment from Jest', key: 'KEY1' });
        mockInstance.awaitExecutionState.mockRejectedValueOnce(new Error()).mockResolvedValueOnce({ id: 123, state: 'COMPLETED', reason: undefined });

        // When
        await run();

        // Then
        expect(core.setFailed).toHaveBeenCalledTimes(0);
        expect(mockInstance.runExperiment).toHaveBeenCalledTimes(3);
        expect(mockInstance.awaitExecutionState).toHaveBeenCalledTimes(2);
    });

    it('should give up retrying eventually', async () => {
        // Given
        when(core.getInput).calledWith('apiAccessToken').mockReturnValue('token');
        when(core.getInput).calledWith('experimentKey').mockReturnValue('KEY-1');
        when(core.getInput).calledWith('maxRetries').mockReturnValue('3');
        when(core.getInput).calledWith('maxRetriesOnExpectationFailure').mockReturnValue('3');
        mockInstance.runExperiment.mockRejectedValueOnce(new Error()).mockResolvedValue('https://example.com/api/executions/123');
        mockInstance.getExperiment.mockResolvedValue({ name: 'Experiment from Jest', key: 'KEY1' });
        mockInstance.awaitExecutionState.mockRejectedValue(new Error());

        // When
        await run();

        // Then
        expect(core.setFailed).toHaveBeenCalledTimes(1);
    });

    it('should not attempt retries', async () => {
        // Given
        when(core.getInput).calledWith('apiAccessToken').mockReturnValue('token');
        when(core.getInput).calledWith('experimentKey').mockReturnValue('KEY-1');
        mockInstance.runExperiment.mockResolvedValue('https://example.com/api/executions/123');
        mockInstance.getExperiment.mockResolvedValue({ name: 'Experiment from Jest', key: 'KEY1' });
        mockInstance.awaitExecutionState.mockRejectedValue(new Error());

        // When
        await run();

        // Then
        expect(core.setFailed).toHaveBeenCalledTimes(1);
        expect(mockInstance.runExperiment).toHaveBeenCalledTimes(1);
        expect(mockInstance.awaitExecutionState).toHaveBeenCalledTimes(1);
    });

    it('should expose the execution outputs when the experiment fails', async () => {
        // Given
        when(core.getInput).calledWith('apiAccessToken').mockReturnValue('token');
        when(core.getInput).calledWith('experimentKey').mockReturnValue('KEY-1');
        mockInstance.runExperiment.mockResolvedValue('https://example.com/api/executions/131253');
        mockInstance.getExperiment.mockResolvedValue({ name: 'Experiment from Jest', key: 'KEY1' });
        const error = new Error("Execution 131253 ended with 'ERRORED - Failed to prepare.' but expected 'COMPLETED'");
        error.execution = { id: 131253, state: 'ERRORED', reason: 'Failed to prepare.' };
        mockInstance.awaitExecutionState.mockRejectedValue(error);

        // When
        await run();

        // Then
        expect(core.setFailed).toHaveBeenCalledTimes(1);
        expect(core.setOutput).toHaveBeenCalledWith('executionId', 131253);
        expect(core.setOutput).toHaveBeenCalledWith('executionState', 'ERRORED');
        expect(core.setOutput).toHaveBeenCalledWith('executionReason', 'Failed to prepare.');
        expect(core.setOutput).toHaveBeenCalledWith('executionUrl', 'https://example.com/api/executions/131253');
    });

    it('should record the error message as executionReason when there is no execution', async () => {
        // Given
        when(core.getInput).calledWith('apiAccessToken').mockReturnValue('token');
        when(core.getInput).calledWith('experimentKey').mockReturnValue('KEY-1');
        mockInstance.runExperiment.mockResolvedValue('https://example.com/api/executions/123');
        mockInstance.getExperiment.mockResolvedValue({ name: 'Experiment from Jest', key: 'KEY1' });
        mockInstance.awaitExecutionState.mockRejectedValue('Too Many Requests');

        // When
        await run();

        // Then
        expect(core.setFailed).toHaveBeenCalledTimes(1);
        expect(core.setOutput).toHaveBeenCalledWith('executionReason', 'Too Many Requests');
    });
});

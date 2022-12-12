jest.mock('./steadybitAPI', () => {
    const mockInstance = {
        runExperiment: jest.fn(),
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

jest.mock('@actions/core');

const { mockInstance } = require('./steadybitAPI');
const core = require('@actions/core');
const { run } = require('./run');
const { when } = require('jest-when');

describe('run', () => {
    beforeEach(() => {
        mockInstance.runExperiment.mockReset();
        mockInstance.lookupByExternalId.mockReset();
        mockInstance.awaitExecutionState.mockReset();
        core.setFailed.mockReset();
        core.getInput.mockReset();
    });

    it('should lookup by external id', async () => {
        // Given
        when(core.getInput).calledWith('externalId').mockReturnValue('EXT-ID');
        when(core.getInput).calledWith('apiAccessToken').mockReturnValue('token');
        when(mockInstance.lookupByExternalId).calledWith('EXT-ID').mockReturnValue('KEY1');
        mockInstance.runExperiment.mockResolvedValue('https://example.com/api/executions/123');
        mockInstance.awaitExecutionState.mockResolvedValueOnce('great success!');

        // When
        await run();

        // Then
        expect(core.setFailed).toHaveBeenCalledTimes(0);
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
        mockInstance.awaitExecutionState.mockRejectedValueOnce(new Error()).mockResolvedValueOnce('great success!');

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
        mockInstance.awaitExecutionState.mockRejectedValue(new Error());

        // When
        await run();

        // Then
        expect(core.setFailed).toHaveBeenCalledTimes(1);
        expect(mockInstance.runExperiment).toHaveBeenCalledTimes(1);
        expect(mockInstance.awaitExecutionState).toHaveBeenCalledTimes(1);
    });
});

jest.mock('./steadybitAPI', () => {
    const mockInstance = {
        runExperiment: jest.fn(),
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

describe('run', () => {
    beforeEach(() => {
        mockInstance.runExperiment.mockReset();
        mockInstance.awaitExecutionState.mockReset();
        core.setFailed.mockReset();
        core.getInput.mockReset();
    });

    it('should retry experiments until they succeed', async () => {
        // Given
        core.getInput.mockReturnValue('3');
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
        core.getInput.mockReturnValue('3');
        mockInstance.runExperiment.mockRejectedValueOnce(new Error()).mockResolvedValue('https://example.com/api/executions/123');
        mockInstance.awaitExecutionState.mockRejectedValue(new Error());

        // When
        await run();

        // Then
        expect(core.setFailed).toHaveBeenCalledTimes(1);
    });

    it('should not attempt retries', async () => {
        // Given
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

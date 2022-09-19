const { SteadybitAPI } = require('./steadybitAPI.js');

describe('SteadybitAPI', () => {
    const httpMock = {
        post: jest.fn(),
        get: jest.fn(),
    };
    const api = new SteadybitAPI('http://test', 'XXX', () => httpMock);
    api.allowParallelBackoffInterval = 0.001;
    api.executionStateQueryInterval = 0.001;

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should run experiment', async () => {
        httpMock.post.mockResolvedValue({ headers: { location: 'http://test/api/executions/123' } });

        const url = await api.runExperiment('EX-1');

        expect(url).toBe('http://test/api/executions/123');
        expect(httpMock.post).toHaveBeenCalledWith(`/api/experiments/EX-1/execute`, null, { params: { allowParallel: 'false' } });
    });

    it('should throw on failed experiment run', async () => {
        httpMock.post.mockRejectedValue({ response: { status: 500, data: { error: 'test error' } } });

        await expect(api.runExperiment('EX-1')).rejects.toBe('{"error":"test error"}');
    });

    it('should retry on parallel experiment running', async () => {
        httpMock.post.mockRejectedValueOnce({ response: { data: { status: 422, title: 'Another experiment is running' } } });
        httpMock.post.mockRejectedValueOnce({ response: { data: { status: 422, title: 'Another experiment is running' } } });
        httpMock.post.mockResolvedValueOnce({ headers: { location: 'http://test/api/executions/123' } });

        const url = await api.runExperiment('EX-1');

        expect(url).toBe('http://test/api/executions/123');

        expect(httpMock.post).toHaveBeenCalledWith(`/api/experiments/EX-1/execute`, null, { params: { allowParallel: 'false' } });
        expect(httpMock.post).toHaveBeenCalledTimes(3);
    });

    it('should await execution state successfully', async () => {
        httpMock.get.mockResolvedValueOnce({ status: 503, data: undefined });
        httpMock.get.mockResolvedValueOnce({ status: 200, data: { id: 123, state: 'RUNNING' } });
        httpMock.get.mockResolvedValueOnce({ status: 200, data: { id: 123, state: 'COMPLETED', ended: '2021-09-24T12:35:00Z' } });

        const result = await api.awaitExecutionState('http://test/api/executions/123', 'COMPLETED');

        expect(result).toBe("Execution 123 ended with 'COMPLETED'.");
        expect(httpMock.get).toHaveBeenCalledWith(`http://test/api/executions/123`);
        expect(httpMock.get).toHaveBeenCalledTimes(3);
    });

    it('should await execution state unsuccessfully', async () => {
        httpMock.get.mockResolvedValue({ data: { id: 123, state: 'FAILED', ended: '2021-09-24T12:35:00Z', reason: 'test' } });

        await expect(api.awaitExecutionState('http://test/api/executions/123', 'COMPLETED')).rejects.toBe(
            "Execution 123 ended with 'FAILED - test' but expected 'COMPLETED'"
        );
    });
});

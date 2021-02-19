import axios from 'axios';



class SteadybitHttpAPI {
    constructor(baseURL, apiAccessToken) {
        this.baseURL = baseURL;
        this.apiAccessToken = apiAccessToken;
    }

    post(uri, data) {
        return axios.post(`${this.baseURL}/api/${uri}`, data, { headers: { 'Authorization': `accessToken ${this.apiAccessToken}` } });
    }

    get(uri) {
        return axios.get(`${this.baseURL}/api/${uri}`, { headers: { 'Authorization': `accessToken ${this.apiAccessToken}` } });
    }
}

export class SteadybitAPI {
    constructor(baseURL, apiAccessToken) {
        this.httpApi = new SteadybitHttpAPI(baseURL, apiAccessToken);
    }

    executeExperiment(experimentKey) {
        return this.httpApi.post(`experiments/${experimentKey}/execute`);
    }
}
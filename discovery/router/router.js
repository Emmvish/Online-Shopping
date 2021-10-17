const axios = require('axios')

const services = require('../services/services')

const router = async (service, route, method, query, data, authHeader = null) => {
    let response;
    try {
        const requestObj = {
            method,
            headers: { },
            url: services[service] + route,
            params: {
                ...query
            },
            data
        }
        if(!!authHeader) {
            requestObj.headers.Authorization = authHeader;
        } 
        response = await axios(requestObj);
    } catch (e) {
        response = e.response
    }
    return { data: response.data, status: response.status }
}

module.exports = router;

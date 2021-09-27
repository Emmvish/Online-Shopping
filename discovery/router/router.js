const axios = require('axios')

const services = require('../services/services')

const router = async (service, route, method, query, data, authHeader = null) => {
    let response;
    try {
        if(!!authHeader) {
            response = await axios({
                method,
                headers: {
                    Authorization: authHeader
                },
                url: services[service] + route,
                params: {
                    ...query
                },
                data
            })
        } else {
            response = await axios({
                method,
                url: services[service] + route,
                params: {
                    ...query
                },
                data
            })
        }
    } catch (e) {
        response = e.response
    }
    return response;
}

module.exports = router;
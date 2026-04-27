/**
 * IoT Models Index
 * Exports all IoT-related Sequelize models
 */

const IoTLiveDataPR = require("./IoTLiveDataPR");
const IoTLiveDataFE = require("./IoTLiveDataFE");
const IoTLiveDataFH = require("./IoTLiveDataFH");
const IoTDeviceAssetMap = require("./IoTDeviceAssetMap");

module.exports = {
    IoTLiveDataPR,
    IoTLiveDataFE,
    IoTLiveDataFH,
    IoTDeviceAssetMap,
};

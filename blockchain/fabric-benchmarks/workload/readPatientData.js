"use strict";

const { WorkloadModuleBase } = require("@hyperledger/caliper-core");

class ReadPatientDataWorkload extends WorkloadModuleBase {
    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        this.chaincodeId = roundArguments.chaincodeId;
        this.contractId = roundArguments.contractId;
        this.functionName = "getAssetByID"; // Your existing read function
        this.args = roundArguments.args;
    }

    async submitTransaction() {
        try {
            await this.sutAdapter.sendRequests({
                contractId: this.contractId,
                contractFunction: this.functionName,
                contractArguments: this.args, // Pass patient ID as argument
                chaincodeId: this.chaincodeId,
                timeout: 30
            });
        } catch (error) {
            console.error(`Error in read transaction: ${error}`);
        }
    }
}

function createWorkloadModule() {
    return new ReadPatientDataWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;

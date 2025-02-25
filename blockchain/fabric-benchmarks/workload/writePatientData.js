"use strict";

const { WorkloadModuleBase } = require("@hyperledger/caliper-core");

class WritePatientDataWorkload extends WorkloadModuleBase {
    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        this.chaincodeId = roundArguments.chaincodeId;
        this.contractId = roundArguments.contractId;
        this.functionName = "CreatePatientData"; // Your existing write function
        this.args = roundArguments.args;
    }

    async submitTransaction() {
        try {
            await this.sutAdapter.sendRequests({
                contractId: this.contractId,
                contractFunction: this.functionName,
                contractArguments: this.args, // Pass patient data
                chaincodeId: this.chaincodeId,
                timeout: 30
            });
        } catch (error) {
            console.error(`Error in write transaction: ${error}`);
        }
    }
}

function createWorkloadModule() {
    return new WritePatientDataWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;

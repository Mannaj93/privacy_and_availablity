'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class ReadPatientWorkload extends WorkloadModuleBase {
    async submitTransaction() {
        const patientID = 'patient_' + Math.floor(Math.random() * 100);
        await this.sutAdapter.sendRequests({
            contractId: 'myChainCode',  // Your chaincode name
            contractFunction: 'getAssetByID',
            invokerIdentity: 'Admin@org1.example.com',
            contractArguments: [patientID],
            readOnly: true
        });
    }
}

function createWorkloadModule() {
    return new ReadPatientWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;

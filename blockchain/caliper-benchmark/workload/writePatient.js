'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class WritePatientWorkload extends WorkloadModuleBase {
    async submitTransaction() {
        const patientID = 'patient_' + Math.floor(Math.random() * 100);
        const patientData = JSON.stringify({
            id: patientID,
            name: "John Doe",
            age: 30,
            diagnosis: "Flu",
            doctor: "Dr. Smith",
            timestamp: new Date().toISOString()
        });

        await this.sutAdapter.sendRequests({
            contractId: 'myChainCode',  // Your chaincode name
            contractFunction: 'CreatePatientData',
            invokerIdentity: 'Admin@org1.example.com',
            contractArguments: [patientData]
        });
    }
}

function createWorkloadModule() {
    return new WritePatientWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;

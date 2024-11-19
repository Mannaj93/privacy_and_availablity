import { Table } from 'reactstrap';
import React, { useEffect, useState } from 'react'

import ContractListView from './ContractListView.js';
import axios from 'axios';
import { headers } from 'helper/config.js';

function InProgressContract() {
    const [patientData, setPatientData] = useState([]);
    useEffect(() => {
        getPatient()
    }
        , [])

    const getPatient = async () => {
        let resp = await axios.get('http://10.212.175.105:3000/v1/patient?pageSize=100', headers())
        console.log("---------", resp.data)
        setPatientData((resp?.data?.payload?.data) || []
        )
    }





    const headers1 = ['Name', 'Government ID', 'Date of Birth'];
    const fields = ['name', 'govId', 'dob'];
    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Patient Information</h2>
            <Table striped bordered hover responsive className="shadow-lg">
                <thead className="bg-gray-200">
                    <tr>
                        {headers1.map((header, index) => (
                            <th key={index} className="p-2">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {patientData.map((patient) => (
                        <tr key={patient.id}>
                            {fields.map((field, index) => (
                                <td key={index} className="p-2">{patient[field]}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}

export default InProgressContract


const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { Gateway, Wallets } = require('fabric-network');
const { getContractObject, getWalletPath, getCCP, getAgreementsWithPagination } = require('../utils/blockchainUtils');
const {
  NETWORK_ARTIFACTS_DEFAULT,
  BLOCKCHAIN_DOC_TYPE,
  PATIENT_STATUS,
  FILTER_TYPE,
  ORG_DEPARTMENT,
} = require('../utils/Constants');
const { getUUID } = require('../utils/uuid');
const { getSignedUrl } = require('../utils/fileUpload');
//const { ConfigurationServicePlaceholders } = require('aws-sdk/lib/config_service_placeholders');
const THIRTY_DAYS = 2592000000;

// If we are sure that max records are limited, we can use any max number
const DEFAULT_MAX_RECORDS = 100
const utf8Decoder = new TextDecoder();


/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<patient>}
 */
const createPatientdata = async (patientData, user) => {
  let gateway;
  let client
  try {
    let dateTime = new Date();
    let orgName = `org${user.orgId}`;
    patientData = {
      fcn: 'CreatePatientData',
      data: {
        id: getUUID(),
        createBy: user.email,
        updatedBy: user.email,
        createAt: dateTime,
        updatedAt: dateTime,
        status: PATIENT_STATUS.INPROGRESS,
        name:patientData.name,
        dob:patientData.dob,
        govId:patientData.govId,
        gender:patientData.gender,
        docType: "patient"

      },
    };

    const contract = await getContractObject(
      orgName,
      user.email,
      NETWORK_ARTIFACTS_DEFAULT.CHANNEL_NAME,
      NETWORK_ARTIFACTS_DEFAULT.CHAINCODE_NAME,
      gateway,
      client
    );
      // Submit the transaction
    const result = await contract.submitTransaction(patientData.fcn, JSON.stringify(patientData.data));
    
    return patientData.data; // Assuming the result needs to be parsed
  } catch (error) {
    console.log(error);
  } finally {
    if (gateway) {
      gateway.close();
    }
    if(client){
      client.close()
    }
  }
};
const authrizedAccess = async (patientId, user) => {
  let gateway;
  let client
  try {
    let dateTime = new Date();
    let orgName = `org${user.orgId}`;

    let gpId = user.email
    let id = getUUID()

    const contract = await getContractObject(
      orgName,
      user.email,
      NETWORK_ARTIFACTS_DEFAULT.CHANNEL_NAME,
      NETWORK_ARTIFACTS_DEFAULT.CHAINCODE_NAME,
      gateway,
      client
    );

 
    let patientData = await contract.submitTransaction('getAssetByID', patientId);
    patientData = JSON.parse(utf8Decoder.decode(patientData));
      // Submit the transaction
      let shareddata = {
        docType: "SharedPatientData",
        email:user.email,
        patientData,
        department:ORG_DEPARTMENT.EMERGENCY,
        id: getUUID()
      }
      console.log("shared Data",shareddata)

    const result = await contract.submitTransaction('AuthorizeAccessToGP', JSON.stringify(shareddata) );
    
    return {patientData: shareddata, txId:result}; // Assuming the result needs to be parsed
  } catch (error) {
    console.log(error);
  } finally {
    if (gateway) {
      gateway.close();
    }
    if(client){
      client.close()
    }
  }
};

const getEmergencyPatientsService = async (user) => {
  let gateway;
  let client;
  try {
    let orgName = `org${user.orgId}`;
    const contract = await getContractObject(
      orgName,
      user.email,
      NETWORK_ARTIFACTS_DEFAULT.CHANNEL_NAME,
      NETWORK_ARTIFACTS_DEFAULT.CHAINCODE_NAME,
      gateway,
      client
    );

    // Fetch all patient data
    let response = await contract.submitTransaction('AuthorizeAccessToGP');
    let allPatientsData = JSON.parse(utf8Decoder.decode(response));

    // Filter the data to include only those marked as "SharedPatientData"
    const emergencyPatients = allPatientsData.filter(
      (record) => record.docType === "SharedPatientData"
    );
    console.log("Filtered emergency Patients", emergencyPatients)
    return emergencyPatients;
  } catch (error) {
    console.log(error);
    throw new Error('Failed to fetch emergency patients');
  } finally {
    if (gateway) gateway.close();
    if (client) client.close();
  }
};



/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<Agreement>}
 */
const approvePatient = async (approvalData, patientId, user) => {
  let gateway;
  let client;

  try {
    // Prepare the approval data
    let dateTime = new Date();
    let orgName = `org${user.orgId}`;
    approvalData = {
      fcn: 'CreatePatientData',
      data: {
        id: getUUID(),
        createBy: user.email,
        updatedBy: user.email,
        createAt: dateTime,
        updatedAt: dateTime,
        status: approvalData.status,
        action: approvalData.action,
        comment: approvalData.comment,
        name: approvalData.name,
        docType: 'Patient',
        dob: approvalData.dob,
        govId: approvalData.govId,
        gender: approvalData.gender
      },
    };

    // Get the contract object
    const contract = await getContractObject(
      orgName,
      user.email,
      NETWORK_ARTIFACTS_DEFAULT.CHANNEL_NAME,
      NETWORK_ARTIFACTS_DEFAULT.CHAINCODE_NAME,
      gateway,
      client
    );

    // Submit the initial transaction
    let result = await contract.submitTransaction(
      approvalData.fcn,
      JSON.stringify(approvalData.data)
    );

    // Debug log to check result format
    console.log('Submit Transaction Result:', result);

    // Query the patient data to check the status
    let approve = await queryPatientById(patientId, user);
    console.log('Patient Query Result:', approve);

    // Update status if necessary
    if (approve.status === PATIENT_STATUS.INPROGRESS) {
      approve.status = PATIENT_STATUS.ACTIVE;
      console.log('Updated Patient Status:', approve.status);

      // Submit updated transaction
      await contract.submitTransaction(approvalData.fcn, JSON.stringify(approve));
    }

    // Attempt to decode or directly retrieve txID
    const txID = typeof result === 'string' ? utf8Decoder.decode(result) : result.txId || result.transactionId;
    console.log('Transaction ID:', txID);

    return txID;
  } catch (error) {
    // Log any errors
    console.error('Error in approvePatient:', error);
    throw error;
  } finally {
    // Ensure connections are closed
    if (gateway) {
      gateway.close();
    }
    if (client) {
      client.close();
    }
  }
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryPatients = async (filter) => {
  try {
    
 
  let query;
  console.log("==========================filter type", filter)
  if (filter?.filterType) {
    switch (filter.filterType) {
      case FILTER_TYPE.ALL:
        query = `{\"selector\":{\"$or\":[{\"firstParty\":\"Org${filter.orgId}\"}, {\"secondParty\":\"Org${filter.orgId}\"}],\"docType\": \"${BLOCKCHAIN_DOC_TYPE.PATIENT}\"}, \"use_index\":[\"_design/indexAssetTypeOrgIdTime\", \"orgId_docType_time_index\"]}`;

        break;
      case FILTER_TYPE.ACTIVE:
        // query = `{\"selector\":{\"orgId\": ${filter.orgId},\"orgId\": ${filter.orgId},\"status\":\"${filter.filterType}\",  \"docType\": \"${BLOCKCHAIN_DOC_TYPE.AGREEMENT}\"}, \"sort\":[{\"updatedAt\":\"desc\"}], \"use_index\":[\"_design/indexAssetTypeOrgIdTime\", \"orgId_docType_time_index\"]}}`;
        query = `{\"selector\":{\"$or\":[{\"firstParty\":\"Org${filter.orgId}\"}, {\"secondParty\":\"Org${filter.orgId}\"}],\"status\":\"${filter.filterType}\",  \"docType\": \"${BLOCKCHAIN_DOC_TYPE.PATIENT}\"}, \"use_index\":[\"_design/indexAssetTypeOrgIdTime\", \"orgId_docType_time_index\"]}}`;

        break;
      case FILTER_TYPE.EXPIRING_SOON:
        // query = `{\"selector\":{{\"endDate\":{\"$lt\":${(+new Date())+THIRTY_DAYS}}}, \"docType\": \"${BLOCKCHAIN_DOC_TYPE.AGREEMENT}\"}, \"sort\":[{\"updatedAt\":\"desc\"}], \"use_index\":[\"_design/indexAssetTypeOrgIdTime\", \"orgId_docType_time_index\"]}}`;
        query = `{\"selector\":{\"endDate\":{\"$lt\":${(+new Date())+THIRTY_DAYS}}, \"docType\": \"${BLOCKCHAIN_DOC_TYPE.PATIENT}\"}, \"use_index\":[\"_design/indexAssetTypeOrgIdTime\", \"orgId_docType_time_index\"]}}`;

        break;
      case FILTER_TYPE.INPROGRESS:
        query = `{\"selector\":{\"$or\":[{\"firstParty\":\"Org${filter.orgId}\"}, {\"secondParty\":\"Org${filter.orgId}\"}],\"status\":\"${filter.filterType}\", \"docType\": \"${BLOCKCHAIN_DOC_TYPE.PATIENT}\"},  \"use_index\":[\"_design/status_doc_type_index\", \"status_doc_type_index\"]}`;
        console.log("-----------aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-------", query)
        break;

      default:
        query = `{\"selector\":{\"orgId\": ${filter.orgId},\"docType\": \"${BLOCKCHAIN_DOC_TYPE.PATIENT}\"}, \"sort\":[{\"updatedAt\":\"desc\"}], \"use_index\":[\"_design/indexAssetTypeOrgIdTime\", \"orgId_docType_time_index\"]}}`;
        break;
    }
  }else {
    query = `{\"selector\":{\"docType\": \"${BLOCKCHAIN_DOC_TYPE.PATIENT}\"}, \"sort\":[{\"updatedAt\":\"desc\"}], \"use_index\":[\"_design/indexAssetTypeOrgIdTime\", \"orgId_docType_time_index\"]}}`;
  }
  // query = `{\"selector\":{\"orgId\": ${filter.orgId},\"status\":\"${filter.filterType}\", \"docType\": \"${BLOCKCHAIN_DOC_TYPE.AGREEMENT}\"}, \"sort\":[{\"updatedAt\":\"desc\"}], \"use_index\":[\"_design/indexOrgDoc\", \"indexDoc\"]}}`;
  //  query = `{\"selector\":{\"orgId\": \"${filter.orgId}\", \"docType\": \"${BLOCKCHAIN_DOC_TYPE.AGREEMENT}\"}, \"sort\":[{\"updatedAt\":\"desc\"}], \"use_index\":[\"_design/indexAssetTypeOrgIdTime\", \"orgId_docType_time_index\"]}}`;
  //  query = `{\"selector\":{\"orgId\": ${filter.orgId}, \"docType\": \"${BLOCKCHAIN_DOC_TYPE.AGREEMENT}\"}}}`;
  console.log('filters--------------', filter, query);
  let data = await getAgreementsWithPagination(
    `{\"selector\":{\"docType\":\"patient\"}}`,
    filter.pageSize,
    filter.bookmark,
    filter.orgName,
    filter.email,
    NETWORK_ARTIFACTS_DEFAULT.CHANNEL_NAME,
    NETWORK_ARTIFACTS_DEFAULT.CHAINCODE_NAME
  );
  return data;
} catch (error) {
  console.log('error--------------', error);
}
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryApprovalsByPatientId = async (filter) => {
  console.log(filter);
  let query = `{\"selector\":{\"agreementId\":\"${filter.patientId}\", \"docType\": \"${BLOCKCHAIN_DOC_TYPE.APPROVAL}\"},  \"use_index\":[\"_design/indexDocTypeAgreementId\", \"docType_agreementId_index\"]}}`;
  // let query = `{\"selector\":{\"orgId\": ${filter.orgId}, \"agreementId\":\"${filter.agreementId}\", \"docType\": \"${BLOCKCHAIN_DOC_TYPE.APPROVAL}\"}}}`;
  let data = await getAgreementsWithPagination(
    query,
    filter.pageSize,
    filter.bookmark,
    filter.orgName,
    filter.email,
    NETWORK_ARTIFACTS_DEFAULT.CHANNEL_NAME,
    NETWORK_ARTIFACTS_DEFAULT.CHAINCODE_NAME
  );
  return data;
};

const validateApprovals = async (patientId, user) => {
  let orgName = `org${user.orgId}`;
  let filters = {
    pageSize:DEFAULT_MAX_RECORDS,
    bookmark: '',
    orgName: orgName,
    email: user.email,
    patientId
  }

  let approvals = await queryApprovalsByPatientId(filters)
  if(approvals?.data?.length){
    let orgDepartmentApproval = approvals.data.filter(elm => elm?.Record?.department == user.department && elm?.Record?.orgId == user.orgId)
    if(orgDepartmentApproval?.length){
      throw new ApiError(httpStatus.FORBIDDEN, `Your department with name: ${user.department} has already approved this ....`);
    }else if(approvals.data.length >= 3){
      return true
    }
  }
  return false
}

const queryHistoryById = async (id, user) => {
  let gateway;
  let client
  try {
    let orgName = `org${user.orgId}`;
    const contract = await getContractObject(
      orgName,
      user.email,
      NETWORK_ARTIFACTS_DEFAULT.CHANNEL_NAME,
      NETWORK_ARTIFACTS_DEFAULT.CHAINCODE_NAME,
      gateway,
      client
    );
    let result = await contract.submitTransaction('getAssetHistory', id);
    // result = JSON.parse(result.toString());
    result = JSON.parse(utf8Decoder.decode(result));
    if(result){
      result = result?.map(elm => {
        return {txId: elm?.txId, IsDelete: elm.IsDelete, ...elm.Value, timeStamp: elm?.Timestamp?.seconds?.low*1000}
      })
    }
    return result;
  } catch (error) {
    console.log(error);
  } finally {
    if (gateway) {
      gateway.close();
    }
    if(client){
      client.close()
    }
  }
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const queryPatientById = async (id, user) => {
  let gateway;
  let client;
  try {
    let orgName = `org${user.orgId}`;

    const contract = await getContractObject(
      orgName,
      user.email,
      NETWORK_ARTIFACTS_DEFAULT.CHANNEL_NAME,
      NETWORK_ARTIFACTS_DEFAULT.CHAINCODE_NAME,
      gateway,
      client
    );
    let result = await contract.submitTransaction('getAssetByID', id);
    console.timeEnd('Test');
     result = JSON.parse(utf8Decoder.decode(result));
    
    return result;
  } catch (error) {
    console.log(error);
  } finally {
    if (gateway) {
      gateway.close();
    }
    if(client){
      client.close()
    }
  }
};

const getDocSignedURL = async (docId, user) => {
  let orgName = `org${user.orgId}`;
  return getSignedUrl(docId, orgName);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.remove();
  return user;
};

module.exports = {
  createPatientdata,
  authrizedAccess,
  queryPatients,
  queryPatientById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  approvePatient,
  queryApprovalsByPatientId,
  getDocSignedURL,
  queryHistoryById,
  getEmergencyPatientsService
};

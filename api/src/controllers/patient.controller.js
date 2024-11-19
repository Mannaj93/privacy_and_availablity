const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services/user.service')
//const {patientService } = require('../services/patient.service');
const { getPagination } = require('../utils/pagination');
const { getSuccessResponse } = require('../utils/Response');
const { createPatientdata, queryPatientById, queryPatients, authrizedAccess, getEmergencyPatientsService } = require('../services/patient.service');

const createPatient = catchAsync(async (req, res, next) => {
  let { user } = req.loggerInfo;
  console.log('============user========', user);
  const result = await createPatientdata(req.body, user);
  res.status(httpStatus.CREATED).send(getSuccessResponse(httpStatus.CREATED, 'Patient created successfully', result));
});

const authorizeePatientData = catchAsync(async (req, res, next) => {
  let { user } = req.loggerInfo;
  let approvalData = req.body;
  let { patientId } = req.body;
  const result = await authrizedAccess(patientId, user);
  res.status(httpStatus.CREATED).send(getSuccessResponse(httpStatus.CREATED, 'Approval submitted successfully', result));
});


const approvePatient = catchAsync(async (req, res, next) => {
  let { user } = req.loggerInfo;
  let approvalData = req.body;
  let patientId = req.params.id;
  const result = await approvePatient(approvalData, patientId, user);
  res.status(httpStatus.CREATED).send(getSuccessResponse(httpStatus.CREATED, 'Approval submitted successfully', result));
});

const getSignedURL = catchAsync(async (req, res, next) => {
  let { user } = req.loggerInfo;
  let docId = req.params.id;
  let url = await patientService.getDocSignedURL(docId, user);
  res
    .status(httpStatus.OK)
    .send(getSuccessResponse(httpStatus.OK, 'Signed URL fetched successfully', { signedURL: url, docId }));
});

const getPatients = catchAsync(async (req, res, next) => {
  const { pageSize, bookmark, filterType } = req.query;

  let { orgId, email } = req.loggerInfo.user;
  let orgName = `org${orgId}`;

  let filter = {
    orgId: parseInt(req.loggerInfo.user.orgId),
    pageSize: pageSize || 10,
    bookmark: bookmark || '',
    orgName,
    email,
    filterType,
  };

  console.log(filter);

  let data = await queryPatients(filter);
  if (data?.data) {
    data.data = data.data.map((elm) => elm.Record);
  }

  res.status(httpStatus.OK).send(getSuccessResponse(httpStatus.OK, 'Users fetched successfully', data));
});





const getEmergencyPatients = catchAsync(async (req, res, next) => {
  const { pageSize, bookmark } = req.query;
  let { user } = req.loggerInfo;
  let { orgId, email } = req.loggerInfo.user;
  let orgName = `org${orgId}`;
  const result = await getEmergencyPatientsService(user);

  if (result && result.length > 0) {
    res.status(httpStatus.OK).send(
      getSuccessResponse(
        httpStatus.OK,
        'Emergency patients fetched successfully',
        { data: result } // Send the filtered data
      )
    );
  } else {
    res.status(httpStatus.OK).send(
      getSuccessResponse(
        httpStatus.OK,
        'No emergency patients found',
        { data: [] }
      )
    );
  }
});






const getHistoryById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  let { user } = req.loggerInfo;
  let data = await patientService.queryHistoryById(id, user);

  res.status(httpStatus.OK).send(getSuccessResponse(httpStatus.OK, 'File fetched successfully', data));
});

const getApprovalsByPatientId = catchAsync(async (req, res, next) => {
  const { pageSize, bookmark } = req.query;
  const patientId = req.params.id;
  let { orgId, email } = req.loggerInfo.user;
  let orgName = `org${orgId}`;

  let filter = {
    orgId: parseInt(req.loggerInfo.user.orgId),
    pageSize: pageSize || "10",
    bookmark: bookmark || '',
    orgName,
    email,
    patientId,
  };

  let data = await patientService.queryApprovalsByPatientId(filter);
  data = data.data.map((elm) => elm.Record);
  res.status(httpStatus.OK).send(getSuccessResponse(httpStatus.OK, 'Users fetched successfully', { approvals: data }));
});

const getPatientById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  let { user } = req.loggerInfo;
  let data = await queryPatientById(id, user);

  res.status(httpStatus.OK).send(getSuccessResponse(httpStatus.OK, 'Result  fetched successfully', data));
});


const getUser = catchAsync(async (req, res, next) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.status(httpStatus.OK).send(getSuccessResponse(httpStatus.OK, 'User fetched successfully', user));
});

const updateUser = catchAsync(async (req, res, next) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res, next) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});


module.exports = {
  createPatient,
  getPatients,
  getUser,
  updateUser,
  deleteUser,
  getPatientById,
  approvePatient,
  getApprovalsByPatientId,
  getSignedURL,
  getHistoryById,
  authorizeePatientData,
  getEmergencyPatients
};

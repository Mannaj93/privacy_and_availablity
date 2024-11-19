const Joi = require('joi');
const { USER_DEPARTMENT, APPROVAL_STATUS } = require('../utils/Constants');
const { password } = require('./custom.validation');



const approvePatient = {
  body: Joi.object().keys({
    description: Joi.string().required(),
    action: Joi.string().required(),
    comment: Joi.string().required(),
    status: Joi.string().required().valid(APPROVAL_STATUS.APPROVED, APPROVAL_STATUS.REJECTED, APPROVAL_STATUS.OTHER)
  }),
};

const getPatientById = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
}

const getSignedURL = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
}

const getPatientApprovals = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
}

const createPatient = Joi.object().keys({
  govId: Joi.string().required(),
  dob: Joi.string().required(),
  gender: Joi.string().required(),
  name: Joi.string().required(),
})


module.exports = {
  createPatient,
  approvePatient,
  getSignedURL,
  getPatientById,
  getPatientApprovals

};

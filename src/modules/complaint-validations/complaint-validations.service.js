import * as complaintRepository from "../complaints/complaints.repository.js";
import * as complaintValidationsRepository from "./complaint-validations.repository.js";
import * as usersService from "../users/users.service.js";

export const countByComplaintId = async (complaintId) => {
  await complaintRepository.getDetail(complaintId);

  const { count, validations } =
    await complaintValidationsRepository.countByComplaintId(complaintId);

  if (count === 0) {
    return {
      count: 0,
      validators: [],
    };
  }

  const userIds = [...new Set(validations.map((validation) => validation.userId))];

  const usersById = await usersService.getUsernamesByIds(userIds);

  const validators = userIds.map((userId) => usersById.get(userId)).filter(Boolean);

  return {
    count,
    validators,
  };
};

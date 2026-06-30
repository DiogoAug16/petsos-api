import * as complaintModerationsRepository from "./complaint-moderations.repository.js";
import * as complaintRepository from "../complaints/complaints.repository.js";
import * as usersService from "../users/users.service.js";
import * as mapTilesService from "../map-tiles/map-tiles.service.js";
import { publishMapTileInvalidation } from "../map-tiles/map-tiles.realtime.js";
import {
  getChangedComplaintTileKeys,
  getComplaintTileKeys,
} from "../map-tiles/map-tiles.util.js";
import logger from "../../logger/index.js";

const syncModerationVisibilityTiles = async ({
  previousComplaint,
  nextComplaint,
  complaintId,
  action,
}) => {
  await mapTilesService.syncComplaintTileStats({
    previousComplaint,
    nextComplaint,
  });

  const tileKeys =
    previousComplaint && nextComplaint
      ? getChangedComplaintTileKeys(previousComplaint, nextComplaint)
      : getComplaintTileKeys(nextComplaint || previousComplaint);

  publishMapTileInvalidation({
    tileKeys,
    complaintId,
    action,
  });
};

export const reportComplaint = async ({ complaintId, reporterId, reason }) => {
  const moderation = await complaintModerationsRepository.reportComplaint({
    complaintId,
    reporterId,
    reason,
  });

  logger.info(
    {
      event: "complaints.reported",
      complaintId,
      actorUserId: reporterId,
      reportCount: moderation.reportCount,
    },
    "Denúncia reportada para moderação",
  );

  return moderation;
};

export const getPending = async ({ limit, cursor }) => {
  const page = await complaintModerationsRepository.getPendingPage({ limit, cursor });
  const complaintIds = page.items.map((item) => item.complaintId).filter(Boolean);
  const complaints = await complaintRepository.getByIds(complaintIds);
  const enrichedComplaints = await usersService.enrichWithCreatedByUsernames(complaints);
  const complaintsById = new Map(
    enrichedComplaints.map((complaint) => [complaint.id, complaint]),
  );

  return {
    ...page,
    items: page.items.map((item) => ({
      ...item,
      complaint: complaintsById.get(item.complaintId) ?? null,
    })),
  };
};

export const applyAction = async ({ complaintId, adminId, action, reason }) => {
  const result = await complaintModerationsRepository.applyModerationAction({
    complaintId,
    adminId,
    action,
    reason,
  });

  await syncModerationVisibilityTiles({
    previousComplaint: result.previousComplaint,
    nextComplaint: result.complaint,
    complaintId,
    action: `moderation_${action}`,
  });

  logger.info(
    {
      event: "complaints.moderation.applied",
      complaintId,
      actorUserId: adminId,
      action,
      moderationStatus: result.moderation.moderationStatus,
      publicVisibility: result.complaint.publicVisibility,
    },
    "Ação administrativa de moderação aplicada",
  );

  return result.moderation;
};

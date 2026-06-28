import { StatusCodes } from "http-status-codes";
import * as complaintService from "../complaints/complaints.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import * as usersService from "../users/users.service.js";
import { success } from "../../shared/utils/response.util.js";
import { currentUserSummarySchema } from "../../schemas/user.schema.js";

export const bootstrap = async (req, res) => {
  const profile = await usersService.getPublicProfileById(req.userId);
  const [followedSummary, unreadNotifications] = await Promise.all([
    complaintService.getFollowedSummaryByUsername(profile.username),
    req.emailVerified
      ? notificationsService.countUnread(req.userId)
      : Promise.resolve({ count: 0 }),
  ]);

  const summary = currentUserSummarySchema.parse({
    profile,
    followedSummary,
    unreadNotifications: unreadNotifications.count,
  });

  return success(
    res,
    {
      user: summary.profile,
      followedSummary: summary.followedSummary,
      unreadNotifications: summary.unreadNotifications,
      config: {
        uploadCacheMaxAgeSeconds: 30 * 24 * 60 * 60,
      },
    },
    StatusCodes.OK,
  );
};

// @ts-nocheck
const moment = require("moment");
const _ = require("lodash");

function generateOTP() {
  // Declare a digits variable
  // which stores all digits
  var digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 4; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

function getWeek(date) {
  return Array(7)
    .fill(new Date(date))
    .map((el, idx) => new Date(el.setDate(el.getDate() - el.getDay() + idx)));
}

module.exports = {
  async getOtp() {
    const ctx = strapi.requestContext.get();

    const successMessage = (otp) => ({
      status: true,
      message: "Otp sent successfully.",
      otp,
    });
    try {
      const { email, isSignup } = ctx.request.body;

      if (isSignup) {
        const user = await strapi.entityService.findMany(
          "plugin::users-permissions.user",
          {
            filters: {
              email,
            },
          }
        );

        if (user?.length) {
          if (user?.[0]?.isDeleted) {
            return ctx.badRequest(
              "The account linked to this email has been deactivated. Kindly use the new email."
            );
          }
          return ctx.badRequest("User is already registered.");
        }

        const getUserOtpInfo = await strapi.entityService.findMany(
          "api::otp.otp",
          {
            filters: {
              email,
            },
          }
        );

        if (!getUserOtpInfo?.length) {
          const otp = generateOTP();
          await strapi.entityService.create("api::otp.otp", {
            data: {
              email,
              otp,
              isUsed: false,
            },
          });

          await strapi.api["custom"].services.mail.signupOtp(email, otp);

          return ctx.send(successMessage(otp));
        } else {
          const otpInfo = getUserOtpInfo?.[0];
          const otp = generateOTP();
          await strapi.entityService.update("api::otp.otp", otpInfo?.id, {
            data: {
              otp,
              isUsed: false,
            },
          });

          console.log("i am here");

          await strapi.api["custom"].services.mail.signupOtp(email, otp);

          return ctx.send(successMessage(otp));
        }
      } else {
        const getAllUsersWithEmail = await strapi.entityService.findMany(
          "plugin::users-permissions.user",
          {
            filters: {
              email,
            },
          }
        );

        if (!getAllUsersWithEmail?.length) {
          return ctx.badRequest("User not found with this email");
        }

        const user = getAllUsersWithEmail?.[0];

        const findOtpOfUser = await strapi.entityService.findMany(
          "api::otp.otp",
          {
            filters: {
              email: { $eq: user?.email },
            },
          }
        );

        if (!findOtpOfUser?.length) {
          const otp = generateOTP();
          await strapi.entityService.create("api::otp.otp", {
            data: {
              otp,
              email: email,
              isUsed: false,
            },
          });

          await strapi.api["custom"].services.mail.forgotPasswordOtp(
            email,
            otp
          );

          return ctx.send(successMessage(otp));
        } else {
          const otpInfo = findOtpOfUser?.[0];
          const otp = generateOTP();
          await strapi.entityService.update("api::otp.otp", otpInfo?.id, {
            data: {
              otp,
              isUsed: false,
            },
          });

          await strapi.api["custom"].services.mail.forgotPasswordOtp(
            email,
            otp
          );

          return ctx.send(successMessage(otp));
        }
      }
    } catch (error) {
      console.log(error, error?.details?.errors?.[0]);

      return ctx.badRequest(error);
    }
  },

  async confirmOtp() {
    const ctx = strapi.requestContext.get();

    try {
      const { otp, email } = ctx.request.body;

      const allOtpUserInfo = await strapi?.entityService?.findMany(
        "api::otp.otp",
        {
          filters: {
            email: {
              $eq: email,
            },
          },
        }
      );

      if (!allOtpUserInfo?.length) {
        return ctx.badRequest("User Otp does not exist");
      }

      const otpUserInfo = allOtpUserInfo?.[0];

      if (otpUserInfo?.otp === otp) {
        if (
          moment().isAfter(moment(otpUserInfo?.updatedAt).add(5, "minutes")) ||
          otpUserInfo?.isUsed
        ) {
          return ctx.badRequest("Otp is expired.");
        }

        await strapi.entityService.update("api::otp.otp", otpUserInfo?.id, {
          data: {
            isUsed: true,
          },
        });
        return ctx.send({
          status: true,
          message: "Otp verified successfully.",
        });
      } else {
        return ctx.badRequest("Invalid OTP");
      }
    } catch (error) {
      console.log(error);
      return ctx.badRequest(error);
    }
  },

  async resetPassword() {
    const ctx = strapi.requestContext.get();

    const { email, password } = ctx.request.body;

    try {
      const userWithSameEmail = await strapi.entityService.findMany(
        "plugin::users-permissions.user",
        {
          filters: {
            email: email,
          },
        }
      );

      if (!userWithSameEmail?.length) {
        return ctx.badRequest("Invalid email");
      }

      const user = userWithSameEmail?.[0];

      await strapi.entityService.update(
        "plugin::users-permissions.user",
        user?.id,
        {
          data: {
            password,
          },
        }
      );

      return ctx.send({
        status: true,
        message: "Password updated successfully.",
      });
    } catch (error) {
      console.log(error);
      return ctx.badRequest(error);
    }
  },

  // async updateProfile() {
  //   const ctx = strapi.requestContext.get();

  //   try {
  //     const userId = ctx.state.user.id;

  //     const {
  //       fullName,
  //       groups,
  //       photo,
  //       isNotifUpdate,
  //       notification_enabled,
  //       survey_notification,
  //     } = ctx.request.body;

  //     console.log({
  //       fullName,
  //       groups,
  //       photo,
  //       userId,
  //       survey_notification,
  //       notification_enabled,
  //     });

  //     if (isNotifUpdate) {
  //       await strapi.entityService.update(
  //         "plugin::users-permissions.user",
  //         userId,
  //         {
  //           data: {
  //             enable_notification: notification_enabled,
  //             survey_notification,
  //           },
  //         }
  //       );

  //       return ctx.send({
  //         status: true,
  //         message: notification_enabled
  //           ? "Notification enabled successfully."
  //           : "Notification disabled successfully.",
  //       });
  //     }

  //     if (!fullName) {
  //       return ctx.badRequest("Full Name is required.");
  //     }

  //     const payload = {
  //       full_name: fullName,
  //       groups,
  //     };

  //     if (photo !== null && photo !== "" && photo !== undefined) {
  //       payload.photo = photo;
  //     }

  //     console.log({ payload });

  //     const response = await strapi.entityService.update(
  //       "plugin::users-permissions.user",
  //       userId,
  //       {
  //         data: {
  //           ...payload,
  //         },
  //       }
  //     );

  //     console.log(response);

  //     return ctx.send({
  //       status: true,
  //       message: "User updated successfully.",
  //     });
  //   } catch (error) {
  //     console.log("User update custom request", error);
  //     return ctx.badRequest(error);
  //   }
  // },

  async updatePassword() {
    const ctx = strapi.requestContext.get();

    const { email, currentPassword, password, passwordConfirmation } =
      ctx.request.body;

    const user = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { email },
      });

    if (!email && !password) {
      return ctx.badRequest("noUpdateData");
    }

    if (password && !currentPassword) {
      return ctx.badRequest("currentPassword.isNull");
    }

    if (password && !passwordConfirmation) {
      return ctx.badRequest("passwordConfirmation.isNull");
    }

    if (password && password != passwordConfirmation) {
      return ctx.badRequest("passwordConfirmation.noMatch");
    }

    const validPassword = await strapi.plugins[
      "users-permissions"
    ].services.user.validatePassword(currentPassword, user?.password);

    if (password && !validPassword) {
      return ctx.badRequest("Current password is not valid");
    }

    if (_.has(ctx.request.body, "email") && !email) {
      return ctx.badRequest("email.notNull");
    }

    if (
      _.has(ctx.request.body, "password") &&
      !password &&
      user.provider === "local"
    ) {
      return ctx.badRequest("password must not null");
    }

    let updateData = {
      ...ctx.request.body,
    };

    // if (imageId) {
    //   updateData.image = imageId;
    // }

    if (_.has(ctx.request.body, "password") && password === user.password) {
      delete updateData.password;
    }

    // const data = await strapi.plugins[
    //   ("user", "users-permissions")
    // ].services.user.edit(user?.id, updateData);

    await strapi.entityService.update(
      "plugin::users-permissions.user",
      user?.id,
      {
        data: {
          ...updateData,
        },
      }
    );

    return ctx.send({
      status: true,
      data: {
        status: true,
        message: "Password Successfully updated.",
      },
    });

    // return ctx.send(sanitizeUser(data));
  },

  async checkDeletedUser() {
    const ctx = strapi.requestContext.get();

    const { email } = ctx.request.body;

    const user = await strapi.entityService.findMany(
      "plugin::users-permissions.user",
      {
        filters: {
          email: {
            $eq: email,
          },
        },
      }
    );

    let message;
    let data;
    if (user[0]?.isDeleted) {
      message = "User is deleted.";
      data = {
        isDeleted: true,
      };
    } else {
      message = "User is not deleted.";
      data = {
        isDeleted: false,
      };
    }
    return ctx.send({
      status: true,
      message,
      data,
    });
  },

  async testFunc() {
    return "Success";
  },

  // async updateToken() {
  //   const ctx = strapi.requestContext.get();
  //   const loggedInUser = ctx?.state?.user ?? {};
  //   try {
  //     const { fcm, timeOffset } = ctx.request.body;

  //     console.log({ fcm });

  //     const userWithSameToken = await strapi.entityService.findMany(
  //       "api::devices.devices",
  //       {
  //         filters: {
  //           deviceToken: {
  //             $eq: fcm,
  //           },
  //         },
  //         populate: ["user"],
  //       }
  //     );

  //     console.log({ userWithSameToken });

  //     if (userWithSameToken?.length > 0) {
  //       if (userWithSameToken?.[0]?.user?.id !== loggedInUser?.id) {
  //         await strapi.entityService.delete(
  //           "api::devices.devices",
  //           userWithSameToken?.[0]?.id
  //         );

  //         await strapi.entityService.create("api::devices.devices", {
  //           data: {
  //             deviceToken: fcm,
  //             user: loggedInUser?.id,
  //             isAllow: true,
  //           },
  //         });
  //         ``;
  //       }
  //     } else {
  //       await strapi.entityService.create("api::devices.devices", {
  //         data: {
  //           deviceToken: fcm,
  //           user: loggedInUser?.id,
  //           isAllow: true,
  //         },
  //       });
  //     }

  //     await strapi.entityService.update(
  //       "plugin::users-permissions.user",
  //       loggedInUser?.id,
  //       {
  //         data: {
  //           timeOffset: timeOffset,
  //         },
  //       }
  //     );

  //     return ctx.send({
  //       status: true,
  //       data: [fcm],
  //       message: "device token added.",
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     return ctx.badRequest(error);
  //   }
  // },

  // async deleteToken() {
  //   const ctx = strapi.requestContext.get();
  //   const loggedInUser = ctx?.state?.user ?? {};
  //   try {
  //     const { fcm } = ctx.request.body;

  //     console.log({ fcm });

  //     const userWithSameToken = await strapi.entityService.findMany(
  //       "api::devices.devices",
  //       {
  //         filters: {
  //           deviceToken: {
  //             $eq: fcm,
  //           },
  //           user: {
  //             id: {
  //               $eq: loggedInUser?.id,
  //             },
  //           },
  //         },
  //       }
  //     );

  //     console.log({ userWithSameToken });

  //     if (userWithSameToken?.length > 0) {
  //       await strapi.entityService.delete(
  //         "api::devices.devices",
  //         userWithSameToken?.[0]?.id
  //       );
  //     }
  //     return ctx.send({
  //       status: true,
  //       data: [fcm],
  //       message: "device token deleted.",
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     return ctx.badRequest(error);
  //   }
  // },

  // async getProfileInfo() {
  //   const ctx = strapi.requestContext.get();
  //   const loggedInUser = ctx?.state?.user ?? {};

  //   try {
  //     const params = ctx.request.params;

  //     const userMe = await strapi.entityService.findOne(
  //       "plugin::users-permissions.user",
  //       loggedInUser?.id,
  //       {
  //         populate: ["friends", "requests"],
  //       }
  //     );

  //     const friendProfileInfo = await strapi.entityService.findOne(
  //       "plugin::users-permissions.user",
  //       params?.id,
  //       {
  //         populate: [
  //           "requests",
  //           "friends",
  //           "user_profile",
  //           "user_profile.image",
  //         ],
  //       }
  //     );

  //     const profileInfo = {
  //       ...friendProfileInfo,
  //       request: false,
  //       friend: false,
  //     };

  //     const isUserInRequest = userMe?.requests?.findIndex(
  //       (item) => item?.id == params?.id
  //     );

  //     const isUserInFriends = userMe?.friends?.findIndex(
  //       (item) => item?.id == params?.id
  //     );

  //     if (isUserInFriends > -1) {
  //       profileInfo.friend = true;
  //     } else if (isUserInRequest > -1) {
  //       profileInfo.request = true;
  //     }

  //     return ctx.send(profileInfo);
  //   } catch (error) {
  //     console.error("getProfileInfo error ==>>", error);
  //     return ctx.badRequest(error);
  //   }
  // },

  // async deleteDeviceToken() {
  //   const ctx = strapi.requestContext.get();

  //   try {
  //     const { userId, fcm } = ctx.request?.body;
  //     console.log(ctx.body);

  //     if (!userId) {
  //       return ctx.badRequest("User is required.");
  //     }

  //     if (!fcm) {
  //       return ctx.badRequest("token is required");
  //     }

  //     const userDeviceTokens = await strapi.entityService.findMany(
  //       "api::device-token.device-token",
  //       {
  //         filters: {
  //           user: {
  //             id: {
  //               $eq: userId,
  //             },
  //           },
  //           fcm: {
  //             $eq: fcm,
  //           },
  //         },
  //       }
  //     );

  //     console.log(userDeviceTokens);

  //     if (userDeviceTokens?.length > 0) {
  //       for (let token of userDeviceTokens) {
  //         await strapi.entityService.delete(
  //           "api::device-token.device-token",
  //           token?.id
  //         );
  //       }
  //     }

  //     return ctx.send({ status: true, message: "Token deleted successfully." });
  //   } catch (error) {
  //     console.log({ error });

  //     return ctx.badRequest(error);
  //   }
  // },

  // async getNotificationCount() {
  //   const ctx = strapi.requestContext.get();

  //   try {
  //     const { userId } = ctx.params;

  //     const userInfo = await strapi.entityService.findOne(
  //       "plugin::users-permissions.user",
  //       userId
  //     );

  //     return ctx.send({
  //       status: true,
  //       message: "Notification count",
  //       data: {
  //         notificationCount: userInfo?.notification_count || 0,
  //       },
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     return ctx.badRequest(error);
  //   }
  // },

  // async clearNotificationCount() {
  //   const ctx = strapi.requestContext.get();

  //   try {
  //     const { userId } = ctx.params;

  //     const userInfo = await strapi.entityService.update(
  //       "plugin::users-permissions.user",
  //       userId,
  //       {
  //         data: {
  //           notification_count: 0,
  //         },
  //       }
  //     );

  //     return ctx.send({
  //       status: true,
  //       message: "Notification cleared successfully",
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     return ctx.badRequest(error);
  //   }
  // },

  // async readNotificationCount() {
  //   const ctx = strapi.requestContext.get();

  //   try {
  //     const { userId } = ctx.params;

  //     const getUser = await strapi.entityService.findOne(
  //       "plugin::users-permissions.user",
  //       userId
  //     );

  //     const calculateCount = getUser?.notification_count
  //       ? getUser?.notification_count - 1
  //       : getUser?.notification_count;

  //     await strapi.entityService.update(
  //       "plugin::users-permissions.user",
  //       userId,
  //       {
  //         data: {
  //           notification_count: calculateCount,
  //         },
  //       }
  //     );

  //     return ctx.send({
  //       status: true,
  //       message: "Notification read successfully",
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     return ctx.badRequest(error);
  //   }
  // },
};

module.exports = {
  routes: [
    {
      path: "/getOtp",
      handler: "custom.getOtp",
      method: "POST",
    },
    {
      path: "/confirm-otp",
      handler: "custom.confirmOtp",
      method: "POST",
    },
    {
      method: "POST",
      handler: "custom.resetPassword",
      path: "/reset-password",
    },
    // {
    //   method: "POST",
    //   handler: "custom.updateProfile",
    //   path: "/update-profile",
    // },
    {
      method: "POST",
      handler: "custom.updatePassword",
      path: "/update-password",
    },

    {
      method: "POST",
      handler: "custom.checkDeletedUser",
      path: "/check-deleted-user",
    },

    {
      method: "GET",
      handler: "custom.testFunc",
      path: "/test-func",
    },

    // {
    //   method: "POST",
    //   handler: "custom.updateToken",
    //   path: "/update-token",
    // },

    // {
    //   method: "POST",
    //   handler: "custom.deleteToken",
    //   path: "/delete-token",
    // },

    // {
    //   method: "GET",
    //   handler: "custom.getProfileInfo",
    //   path: "/profileInfo/:id",
    // },

    // {
    //   method: "GET",
    //   handler: "custom.getNotificationCount",
    //   path: "/get-notification-count/:userId",
    // },

    // {
    //   method: "GET",
    //   handler: "custom.clearNotificationCount",
    //   path: "/clear-notification-count/:userId",
    // },

    // {
    //   method: "GET",
    //   handler: "custom.readNotificationCount",
    //   path: "/read-notification-count/:userId",
    // },
  ],
};

// readNotificationCount

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = {
  attachPaymentMethod: async () => {
    const ctx = strapi.requestContext.get();
    const loggedInUser = ctx?.state?.user ?? {};

    try {
      const { paymentMethodId } = ctx.request?.body;

      console.log({ paymentMethodId });

      if (!paymentMethodId) {
        return ctx.badRequest("Payment method is required");
      }

      let customerId = loggedInUser?.customer_id ?? "";
      console.log({ customerId });
      // if Customer does not attached on user, then create new user
      if (!customerId) {
        console.log("I am inside");
        const isCustomerExist = await stripe.customers?.list({
          email: loggedInUser?.email,
        });
        console.log("isCustomerExist", isCustomerExist?.data);

        if (isCustomerExist?.data?.length > 0) {
          const customer = isCustomerExist?.data?.[0];

          customerId = customer?.id;

          await strapi.entityService.update(
            "plugin::users-permissions.user",
            loggedInUser?.id,
            {
              data: {
                customer_id: customerId,
              },
            }
          );
        } else {
          const customer = await stripe.customers?.create({
            email: loggedInUser?.email,
          });
          console.log({ customer });
          customerId = customer?.id;

          await strapi.entityService.update(
            "plugin::users-permissions.user",
            loggedInUser?.id,
            {
              data: {
                customer_id: customerId,
              },
            }
          );
        }
      }

      console.log({ customerId });

      const attachMethodResponse = await stripe.paymentMethods?.attach(
        paymentMethodId,
        { customer: customerId }
      );

      const payload = {
        brand: attachMethodResponse?.card?.brand,
        expiry_month: attachMethodResponse?.card?.exp_month,
        expiry_year: attachMethodResponse?.card?.exp_year,
        last_digit: attachMethodResponse?.card?.last4,
        method_id: attachMethodResponse?.id,
        user: { connect: [{ id: loggedInUser?.id }] },
      };

      const res = await strapi.entityService.create(
        "api::payment-method.payment-method",
        {
          data: {
            brand: attachMethodResponse?.card?.brand,
            expiry_month: `${attachMethodResponse?.card?.exp_month}`,
            expiry_year: `${attachMethodResponse?.card?.exp_year}`,
            last_digit: `${attachMethodResponse?.card?.last4}`,
            method_id: attachMethodResponse?.id,
            user: loggedInUser?.id,
          },
        }
      );

      return ctx.send({
        status: true,
        message: "Payment method added successfully.",
        data: res,
      });
    } catch (error) {
      console.log("attachPaymentMethod error ==>>", error);
      return ctx.badRequest(error);
    }
  },

  detachPaymentMethod: async () => {
    const ctx = strapi.requestContext.get();
    const loggedInUser = ctx?.state?.user ?? {};

    try {
      const { paymentMethodId } = ctx?.request?.body;
      console.log({ paymentMethodId });

      const findMethod = await strapi.entityService.findOne(
        "api::payment-method.payment-method",
        paymentMethodId
      );

      if (!findMethod?.method_id) {
        return ctx.badRequest("Payment Method not found");
      }

      const removeMethodRes = await stripe.paymentMethods.detach(
        findMethod?.method_id
      );

      const res = await strapi.entityService.delete(
        "api::payment-method.payment-method",
        findMethod?.id
      );

      return ctx.send({
        message: "Method Removed Successfully",
        data: res,
        status: true,
      });
    } catch (error) {
      console.log("detachPaymentMethod error ==>>>", error);
      return ctx.badRequest(error);
    }
  },

  // purchaseChallenge: async () => {
  //   const ctx = strapi.requestContext.get();
  //   const loggedInUser = ctx?.state?.user ?? {};

  //   try {
  //     const { challengeId } = ctx?.request?.body;

  //     if (!challengeId) {
  //       return ctx.badRequest("challenge is required");
  //     }

  //     const challengeData = await strapi.entityService.findOne(
  //       "api::challenge.challenge",
  //       challengeId,
  //       {
  //         populate: ["participants"],
  //       }
  //     );

  //     if (!challengeData) {
  //       return ctx.badRequest("Challenge not found.");
  //     }

  //     if (!challengeData?.is_paid) {
  //       const challengeUpdate = await strapi.entityService.update(
  //         "api::challenge.challenge",
  //         challengeId,
  //         {
  //           data: {
  //             participants: {
  //               connect: [{ id: loggedInUser?.id }],
  //             },
  //           },
  //         }
  //       );

  //       return ctx.send({
  //         data: challengeUpdate,
  //         status: true,
  //         message: "Challenge joined successfully.",
  //       });
  //     }

  //     const getPaymentMethod = await strapi.entityService.findMany(
  //       "api::payment-method.payment-method",
  //       {
  //         filters: {
  //           user: {
  //             id: {
  //               $eq: loggedInUser?.id,
  //             },
  //           },
  //         },
  //       }
  //     );

  //     if (getPaymentMethod?.length < 1) {
  //       return ctx.badRequest("Payment method not found.");
  //     }

  //     const paymentMethod = getPaymentMethod?.[0];

  //     const paymentIntent = await stripe.paymentIntents.create({
  //       amount: challengeData?.price * 100,
  //       currency: "usd",
  //       customer: loggedInUser?.customer_id,
  //       payment_method: paymentMethod?.method_id,
  //       automatic_payment_methods: {
  //         enabled: true,
  //         allow_redirects: "never",
  //       },
  //     });

  //     const confirmPaymentIntent = await stripe.paymentIntents?.confirm(
  //       paymentIntent?.id
  //     );

  //     console.log({
  //       confirmPaymentIntent: JSON.stringify(confirmPaymentIntent),
  //     });

  //     const challengeUpdate = await strapi.entityService.update(
  //       "api::challenge.challenge",
  //       challengeId,
  //       {
  //         data: {
  //           participants: {
  //             connect: [{ id: loggedInUser?.id }],
  //           },
  //         },
  //       }
  //     );

  //     const createTransactions = await strapi.entityService.create(
  //       "api::transaction.transaction",
  //       {
  //         data: {
  //           amount: `${challengeData?.price}`,
  //           challenge_name: challengeData?.title,
  //           transaction_id: confirmPaymentIntent?.id,
  //           user: loggedInUser?.id,
  //           challenge: challengeData?.id,
  //         },
  //       }
  //     );

  //     return ctx.send({
  //       data: challengeUpdate,
  //       status: true,
  //       message: "Challenge joined successfully.",
  //     });
  //   } catch (error) {
  //     console.error("purchaseChallenge error ==>>>", error);
  //     return ctx.badRequest(error);
  //   }
  // },
};

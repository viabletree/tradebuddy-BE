const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const unparsed = require("koa-body/unparsed.js");

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

  purchasePlan: async () => {
    const ctx = strapi.requestContext.get();
    const loggedInUser = ctx?.state?.user ?? {};
    const body = ctx?.request?.body ?? {};
    try {
      const userData = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        loggedInUser?.id,
        {
          populate: ["payment_methods", "kyc", "image"],
        }
      );

      if (!userData?.payment_methods) {
        return ctx.badRequest("Payment method is required.");
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

      const plans = await stripe.products.list({
        active: true,
      });

      const plan = plans?.data?.[0];

      console.log("::::Plan:::::", { plan });

      const price = await stripe.prices.retrieve(plan?.default_price);

      console.log("::::Price:::::", { price });
      // const paymentMethod = userData?.payment_methods?.[0];

      const isExistPlan = await stripe.subscriptions.search({
        query: `status:\'active\' AND metadata[\'email\']:\'${userData.email}\'`,
      });

      if (isExistPlan?.data?.length > 0) {
        return ctx.badRequest("You already have a plan.");
      }
      if (!userData?.is_subscribed) {
        // const currentTime = new Date().getTime();
        // const expiryDate = new Date(userData?.plan_expiry).getTime();
        // if (currentTime >= expiryDate) {
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: plan?.default_price }],
          metadata: {
            user: userData.id,
            email: userData.email,
          },
          // default_payment_method: body?.paymentMethodId,
        });

        console.log("::::Subscription:::::", { subscription });

        const updateUserData = await strapi.entityService.update(
          "plugin::users-permissions.user",
          loggedInUser?.id,
          {
            data: {
              is_subscribed: true,
              plan_expiry: subscription?.current_period_end,
            },
          }
        );

        console.log("::::Updated User Data:::::", { updateUserData });

        const amount = +price?.unit_amount_decimal / 100;
        const createTransactions = await strapi.entityService.create(
          "api::transaction.transaction",
          {
            data: {
              amount: `${amount}`,
              subscription_id: subscription?.id,
              package_name: plan?.name,
              user: loggedInUser?.id,
            },
          }
        );

        console.log("::::Create Transaction:::::", { createTransactions });

        return ctx.send({
          status: true,
          message: "Plan purchased successfully.",
          data: updateUserData,
        });

        // } else {
        //   const find = await stripe.subscriptions.search({
        //     query: `status:\'active\' AND metadata[\'email\']:\'${userData.email}\'`,
        //   });
        //   const findId = find.data[0].id
        // }
      } else {
        return ctx.badRequest("You already have a plan.");
      }
    } catch (error) {
      console.log("getPlans error ==>>>", error);
      return ctx.badRequest(error);
    }
  },

  handleWebhook: async (ctx) => {
    try {
      const header = ctx.request.headers;
      const sig = header["stripe-signature"];
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          ctx.request.body[unparsed],
          sig,
          endpointSecret
        );
      } catch (err) {
        console.error(err);
        ctx.badRequest(`Webhook Error: ${err.message}`);
        return;
      }
      // Handle the event
      switch (event.type) {
        case "customer.subscription.deleted":
          const subscriptionDeleted = event.data.object;
          // Then define and call a function to handle the event subscription_schedule.aborted
          console.log("subscriptionDeleted", subscriptionDeleted);

          const updateUserData = await strapi.entityService.update(
            "plugin::users-permissions.user",
            subscriptionDeleted?.metadata?.user,
            {
              data: {
                is_subscribed: false,
              },
            }
          );
          console.log("::::Updated User From Webhook:::::", { updateUserData });
          break;
        case "customer.subscription.updated":
          const subscriptionUpdated = event.data.object;
          // Then define and call a function to handle the event subscription_schedule.canceled
          console.log("subscriptionUpdated", subscriptionUpdated);

          if (!subscriptionUpdated?.metadata?.isCancel) {
            const plans = await stripe.products.list({
              active: true,
            });

            const plan = plans?.data?.[0];

            const price = await stripe.prices.retrieve(plan?.default_price);

            const amount = +price?.unit_amount_decimal / 100;

            const createTransaction = await strapi.entityService.create(
              "api::transaction.transaction",
              {
                data: {
                  amount: `${amount}`,
                  subscription_id: subscriptionUpdated?.id,
                  package_name: plan?.name,
                  user: subscriptionUpdated?.metadata?.user,
                },
              }
            );
            console.log("::::Create Transaction From Webhook:::::", {
              createTransaction,
            });
          }
          break;
        // ... handle other event types
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      ctx.send({ received: true });
    } catch (error) {
      console.log("handleWebhook error ==>>>", error);
    }
  },

  cancelPlan: async (ctx) => {
    try {
      const transactions = await strapi.entityService.findMany(
        "api::transaction.transaction",
        {
          filters: {
            subscription_id: {
              $ne: null,
            },
          },
          sort: "createdAt:desc",
          limit: 1,
        }
      );
      if (transactions?.length < 1) {
        return ctx.badRequest("No subscription found.");
      }

      const subscriptionId = transactions?.[0]?.subscription_id;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const data = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          ...subscription?.metadata,
          isCancel: true,
        },
      });

      return ctx.send({
        status: true,
        message: "Plan canceled successfully.",
        data: data?.status,
      });
    } catch (error) {
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

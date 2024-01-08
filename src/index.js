"use strict";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({}) {
    strapi.db.lifecycles.subscribe({
      models: ["plugin::users-permissions.user"],
      afterCreate: async (event) => {
        try {
          const { result } = event;
          const user = await strapi.entityService.findOne(
            "plugin::users-permissions.user",
            result?.id,
            {
              populate: ["*"],
            }
          );
          const isCustomerExist = await stripe.customers?.list({
            email: user?.email,
          });

          if (isCustomerExist?.data?.length > 0) {
            const customerId = isCustomerExist?.data?.[0]?.id;

            await strapi.entityService.update(
              "plugin::users-permissions.user",
              user?.id,
              {
                data: {
                  customer_id: customerId,
                },
              }
            );
          } else {
            const newCustomer = await stripe.customers.create({
              email: user?.email,
            });

            const updateUser = await strapi.entityService.update(
              "plugin::users-permissions.user",
              user?.id,
              {
                data: {
                  customer_id: newCustomer?.id,
                },
              }
            );
          }
        } catch (error) {
          console.error("User After Create error --->>", error);
        }
      },
    });
  },
};

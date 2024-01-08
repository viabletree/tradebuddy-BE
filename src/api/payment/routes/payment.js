module.exports = {
  routes: [
    {
      method: "POST",
      path: "/payment/attach-payment-method",
      handler: "payment.attachPaymentMethod",
    },
    {
      method: "POST",
      path: "/payment/detach-payment-method",
      handler: "payment.detachPaymentMethod",
    },
    // {
    //   method: "POST",
    //   path: "/payment/purchase",
    //   handler: "payment.purchaseChallenge",
    // },
  ],
};

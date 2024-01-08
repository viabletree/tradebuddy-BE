let sendEmail = function (sendTo, subject, body) {
  // EMAIL CONFIG
  const sendFrom = "devnav105@gmail.com"; // Change to your verified sender
  const msg = {
    to: sendTo,
    // to: process.env.TO_EMAIL_ADDRESS,
    from: process.env.SEND_EMAIL_ADDRESS,
    subject: subject,
    html: body,
  };

  console.log("sending otp request.");

  return strapi.plugins["email"].services.email.send(msg);
};

let forgotPasswordOtp = (email, otp) => {
  const body = `<p style={color: "#000"}> Hi, <br /> <br />
    
  Forget your password? <br />
  We received a request to reset the password for your account. <br /> <br />
  
  To reset your password, Enter the code below:</p>

  <p><b>${otp}</b></p>
  `;

  return sendEmail(email, "Reset Password Otp", body);
};

let signupOtp = (email, otp) => {
  const body = `<p style={color: "#000"}> Hi, <br /> <br />
    
  Thanks for joining RX Life Challenge.<br />
  
  To confirm your account, Enter the code below:</p>

  <p><b>${otp}</b></p>
  `;

  return sendEmail(email, "Account Confirmation Request", body);
};

module.exports = {
  forgotPasswordOtp,
  signupOtp,
};

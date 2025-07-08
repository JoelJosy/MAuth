export const generateEmailTemplate = (
  magicLink,
  clientName = "MAuth",
  userEmail
) => {
  return {
    subject: `Sign in to ${clientName}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to ${clientName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: #4f46e5;
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        
        .message {
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.7;
            color: #555;
        }
        
        .button-container {
            text-align: center;
            margin: 35px 0;
        }
        
        .magic-button {
            display: inline-block;
            background: #4f46e5;
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
        }
        
        .magic-button:hover {
            background: #3730a3;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
        
        .alternative-link {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        
        .alternative-link p {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .alternative-link a {
            color: #4f46e5;
            text-decoration: none;
            word-break: break-all;
            font-size: 14px;
        }
        
        .security-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .security-notice h3 {
            color: #856404;
            font-size: 16px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        
        .security-notice p {
            color: #856404;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer p {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .footer a {
            color: #4f46e5;
            text-decoration: none;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .magic-button {
                padding: 14px 28px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 ${clientName}</h1>
            <p>Secure authentication made simple</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello there! 👋
            </div>
            
            <div class="message">
                You requested to sign in to <strong>${clientName}</strong> using your email address <strong>${userEmail}</strong>.
                <br><br>
                Click the button below to complete your sign-in process. This link will expire in <strong>10 minutes</strong> for your security.
            </div>
            
            <div class="button-container">
                <a href="${magicLink}" class="magic-button">
                    ✨ Sign In Securely
                </a>
            </div>
            
            <div class="alternative-link">
                <p>Button not working? Copy and paste this link into your browser:</p>
                <a href="${magicLink}">${magicLink}</a>
            </div>
            
            <div class="security-notice">
                <h3>🛡️ Security Notice</h3>
                <p>• This link will expire in 10 minutes</p>
                <p>• The link can only be used once</p>
                <p>• If you didn't request this, please ignore this email</p>
                <p>• Never share this link with anyone</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This email was sent to <strong>${userEmail}</strong></p>
            <p>If you have any questions, please contact our support team.</p>
            <p style="margin-top: 15px; font-size: 12px; color: #999;">
                Powered by <a href="#">MAuth Service</a> - Secure Authentication Platform
            </p>
        </div>
    </div>
</body>
</html>`,
    text: `Sign in to ${clientName}

Hello!

You requested to sign in to ${clientName} using your email address ${userEmail}.

Click the link below to complete your sign-in process:
${magicLink}

This link will expire in 10 minutes for your security.

Security Notice:
- This link will expire in 10 minutes
- The link can only be used once
- If you didn't request this, please ignore this email
- Never share this link with anyone

This email was sent to ${userEmail}

If you have any questions, please contact our support team.

Powered by MAuth Service - Secure Authentication Platform`,
  };
};

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="@supabase/supabase-js" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Resend SDK is not available for Deno/Supabase Edge Functions. Use fetch to call the REST API.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { name, email, subject, message } = await req.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: name, email, subject, and message are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get Resend API key from environment
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing RESEND_API_KEY environment variable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create HTML content for the email
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission - FutureCast</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin:0; padding:0; background:#f7f8f6; font-family: 'Inter', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f8f6;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff; margin:40px 0; border-radius:8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="padding:40px 30px; background:#232323; text-align:center;">
                    <h1 style="color:#fff; font-family:'Inter',sans-serif; font-size:28px; font-weight:700; margin:0;">FUTURECAST AI</h1>
                    <p style="color:#cecab9; font-size:14px; margin:10px 0 0 0; font-family:'Inter',sans-serif;">NEW CONTACT FORM SUBMISSION</p>
                  </td>
                </tr>
                
                <!-- Main content -->
                <tr>
                  <td style="padding:40px 30px;">
                    <h2 style="font-size:1.5rem; font-weight:600; color:#232323; margin:0 0 24px 0; font-family:'Inter',sans-serif;">
                      New Contact Form Submission
                    </h2>
                    
                    <div style="background:#f8f9fa; border-radius:8px; padding:24px; margin-bottom:24px;">
                      <h3 style="margin:0 0 16px 0; font-size:1.1rem; color:#232323; font-weight:600; font-family:'Inter',sans-serif;">
                        Contact Details
                      </h3>
                      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                        <tr>
                          <td style="padding:8px 0; font-weight:600; color:#666; font-family:'Inter',sans-serif; width:80px;">Name:</td>
                          <td style="padding:8px 0; color:#232323; font-family:'Inter',sans-serif;">${name}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0; font-weight:600; color:#666; font-family:'Inter',sans-serif;">Email:</td>
                          <td style="padding:8px 0; color:#232323; font-family:'Inter',sans-serif;">
                            <a href="mailto:${email}" style="color:#232323; text-decoration:none;">${email}</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0; font-weight:600; color:#666; font-family:'Inter',sans-serif;">Subject:</td>
                          <td style="padding:8px 0; color:#232323; font-family:'Inter',sans-serif;">${subject}</td>
                        </tr>
                      </table>
                    </div>
                    
                    <div style="background:#f8f9fa; border-radius:8px; padding:24px;">
                      <h3 style="margin:0 0 16px 0; font-size:1.1rem; color:#232323; font-weight:600; font-family:'Inter',sans-serif;">
                        Message
                      </h3>
                      <div style="color:#232323; line-height:1.6; font-family:'Inter',sans-serif; white-space:pre-wrap;">
                        ${message}
                      </div>
                    </div>
                    
                    <div style="margin-top:32px; padding-top:24px; border-top:1px solid #e5e5e5;">
                      <p style="margin:0; color:#666; font-size:0.9rem; font-family:'Inter',sans-serif;">
                        This message was sent from the FutureCast contact form at ${new Date().toLocaleString()}.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding:24px 30px; text-align:center; background:#f8f9fa;">
                    <p style="color:#666; font-size:0.9rem; margin:0; font-family:'Inter',sans-serif;">
                      © ${new Date().getFullYear()} FutureCast AI. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send the email to support@futurecast.pro using Resend REST API
    const supportRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FutureCast Contact Form <noreply@futurecast.pro>',
        to: 'support@futurecast.pro',
        subject: `Contact Form: ${subject}`,
        html: htmlContent,
        reply_to: email
      })
    });
    if (!supportRes.ok) {
      const err = await supportRes.text();
      throw new Error(`Failed to send to support: ${err}`);
    }

    // Send confirmation email to user
    const userConfirmationHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Message Received - FutureCast</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin:0; padding:0; background:#f7f8f6; font-family: 'Inter', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f8f6;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff; margin:40px 0; border-radius:8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="padding:40px 30px; background:#232323; text-align:center;">
                    <h1 style="color:#fff; font-family:'Inter',sans-serif; font-size:28px; font-weight:700; margin:0;">FUTURECAST AI</h1>
                    <p style="color:#cecab9; font-size:14px; margin:10px 0 0 0; font-family:'Inter',sans-serif;">MESSAGE RECEIVED</p>
                  </td>
                </tr>
                
                <!-- Main content -->
                <tr>
                  <td style="padding:40px 30px;">
                    <h2 style="font-size:1.5rem; font-weight:600; color:#232323; margin:0 0 16px 0; font-family:'Inter',sans-serif;">
                      Hi ${name},
                    </h2>
                    
                    <p style="color:#232323; line-height:1.6; font-family:'Inter',sans-serif; margin:0 0 16px 0;">
                      Thank you for reaching out to FutureCast! We've received your message and our team will get back to you as soon as possible.
                    </p>
                    
                    <div style="background:#f8f9fa; border-radius:8px; padding:24px; margin:24px 0;">
                      <h3 style="margin:0 0 12px 0; font-size:1.1rem; color:#232323; font-weight:600; font-family:'Inter',sans-serif;">
                        Your Message Details
                      </h3>
                      <p style="margin:0 0 8px 0; color:#666; font-family:'Inter',sans-serif;"><strong>Subject:</strong> ${subject}</p>
                      <p style="margin:0; color:#666; font-family:'Inter',sans-serif;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    
                    <p style="color:#232323; line-height:1.6; font-family:'Inter',sans-serif; margin:16px 0;">
                      We typically respond within 24 hours during business hours (Monday - Friday, 9AM - 6PM EST).
                    </p>
                    
                    <p style="color:#232323; line-height:1.6; font-family:'Inter',sans-serif; margin:16px 0;">
                      In the meantime, you might find answers to common questions in our <a href="https://futurecast.pro/faq" style="color:#232323; text-decoration:underline;">FAQ section</a>.
                    </p>
                    
                    <p style="color:#232323; line-height:1.6; font-family:'Inter',sans-serif; margin:24px 0 0 0;">
                      Best regards,<br>
                      <strong>The FutureCast Team</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding:24px 30px; text-align:center; background:#f8f9fa;">
                    <p style="color:#666; font-size:0.9rem; margin:0; font-family:'Inter',sans-serif;">
                      © ${new Date().getFullYear()} FutureCast AI. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send confirmation email to user
    const userRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FutureCast <noreply@futurecast.pro>',
        to: email,
        subject: 'Message Received - FutureCast Support',
        html: userConfirmationHtml
      })
    });
    if (!userRes.ok) {
      const err = await userRes.text();
      throw new Error(`Failed to send confirmation to user: ${err}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Contact form submitted successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Error sending contact email:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to send contact form',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}); 
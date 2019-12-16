import * as crypto from "crypto";
import { APIGatewayProxyEvent, Context, Callback } from "aws-lambda";
const axios = require("axios");

// enum to map state from the event body
// to a notification type in netlify
enum NetlifyEvents {
  "Deploy Started" = "building",
  "Deploy Succeeded" = "ready",
  "Deploy Failed" = "error"
}

interface NetlifyEventBody {
  id: string;
  site_id: string;
  build_id: string;
  state: string;
  name: string;
  url: string;
  ssl_url: string;
  admin_url: string;
  deploy_url: string;
  deploy_ssl_url: string;
  error_message?: string;
  branch: string;
}

// always want to send a 200 back to Netlify so they
// know the webhook is healthy and doesn't get disabled
const sendResponse = (callback: Callback) => {
  const response = {
    statusCode: 200
  };
  callback(null, response);
};

// lookup a NetlifyNotificationEvent by event state
const getEventByState = (state: string): string | null => {
  let keys = Object.keys(NetlifyEvents).filter(x => NetlifyEvents[x] == state);
  return keys.length > 0 ? keys[0] : null;
};

const generateMessage = (body: NetlifyEventBody): string => {
  return `
    **Site Name:** ${body.name}\n**Status:** ${getEventByState(
    body.state
  )}\n**Link:** [Build Logs](${body.admin_url}/deploys/${
    body.id
  })\n-------------------------------------------------------------------------------------
  `;
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const { WEBHOOK_SECRET, DISCORD_WEBHOOK_URL } = process.env;
  const sigHeaderName = event.headers["x-webhook-signature"];
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = "sha256=" + hmac.update(event.body).digest("hex");
  const checksum = event.headers["x-webhook-signature"];

  if (!checksum || !digest || checksum !== digest) {
    try {
      await axios.post(DISCORD_WEBHOOK_URL, {
        content: generateMessage(JSON.parse(event.body))
      });
      sendResponse(callback);
    } catch (err) {
      console.error(err);
      sendResponse(callback);
    }
  } else {
    console.error(
      `Authentication Failed: Request body digest (${digest}) did not match ${sigHeaderName} (${checksum})`
    );
    sendResponse(callback);
  }
};

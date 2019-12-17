import * as crypto from "crypto";
import { APIGatewayProxyEvent, Context, Callback } from "aws-lambda";
import { Hook } from "hookcord";

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

enum Colors {
  GREEN = 0x238823,
  YELLOW = 0xffbf00,
  RED = 0xd2222d,
  BLUE = 0x008ce4
}

// maps a build state to messaging above
// the embedded message
enum ContentMapping {
  "building" = "There is a new deploy in process for",
  "ready" = "Successful deploy of",
  "error" = "Deploy did not complete for"
}

// maps a build state to a color for the sidebar
// styling of the embedded message
enum ColorMapping {
  "building" = Colors.YELLOW,
  "ready" = Colors.GREEN,
  "error" = Colors.RED
}

// always want to send a 200 back to Netlify so they
// know the webhook is healthy and doesn't get disabled
const sendResponse = (callback: Callback) => {
  const response = {
    statusCode: 200
  };
  callback(null, response);
};

// lookup a NetlifynEvent by event state
const getEventByState = (state: string): string | null => {
  const keys = Object.keys(NetlifyEvents).filter(x => NetlifyEvents[x] == state);
  return keys.length > 0 ? keys[0] : null;
};

const generateMessage = (body?: NetlifyEventBody) => {
  const message = {
    content: 'Content?',
    embeds: [{
      color: Colors.YELLOW,
      title: 'Visit the build log',
      url: 'https://discord.js.org',
      description: 'Some description here',
      timestamp: new Date(),
      footer: {
        text: 'Some info about which branch it came from',
      },
    }]
  };
  return message;
}

// const generateMessage = (body: NetlifyEventBody): string => {
//   return `
//     **Site Name:** ${body.name}\n**Status:** ${getEventByState(
//     body.state
//   )}\n**Link:** [Build Logs](${body.admin_url}/deploys/${
//     body.id
//   })\n-------------------------------------------------------------------------------------
//   `;
// };

// export const handler = async (
//   event: APIGatewayProxyEvent,
//   context: Context,
//   callback: Callback
// ) => {
//   const { WEBHOOK_SECRET, DISCORD_WEBHOOK_URL } = process.env;
//   const sigHeaderName = "x-webhook-signature";
//   const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
//   const digest = "sha256=" + hmac.update(event.body).digest("hex");
//   const checksum = event.headers["x-webhook-signature"];

//   if (!checksum || !digest || checksum !== digest) {
//     try {
//       const discordAuthParts = DISCORD_WEBHOOK_URL.split('/');
//       const id = discordAuthParts[discordAuthParts.length - 2];
//       const secret = discordAuthParts[discordAuthParts.length - 1];

//       new hookcord.Hook()
//         .login(id, secret)
//         .setPayload({'embeds': [{
//           'title': 'Hookcord',
//           'description': 'description',
//           'fields': [{
//             'name': 'Version',
//             'value': '1.0.0',
//             'inline': true
//           }],
//           'timestamp': new Date()
//         }]})
//         .fire()
//         .then(function(response) {
//           console.log('response ', response);
//         })
//         .catch(function(e) {
//           console.log('error ', e);
//         })
//       sendResponse(callback);
//     } catch (err) {
//       console.error(err);
//       sendResponse(callback);
//     }
//   } else {
//     console.error(
//       `Authentication Failed: Request body digest (${digest}) did not match ${sigHeaderName} (${checksum})`
//     );
//     sendResponse(callback);
//   }
// };
const DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/647274762946609156/5w4x1Mq4OkIzPuMLdd1zovHqOP5TZhnvR8gEPUAUmKLKeGh_y39KpE613RSsvMyoS3o2";
try {
  const discordAuthParts = DISCORD_WEBHOOK_URL.split('/');
  const id = discordAuthParts[discordAuthParts.length - 2];
  const secret = discordAuthParts[discordAuthParts.length - 1];

  new Hook()
    .login(id, secret)
    .setPayload(generateMessage())
    .fire()
    .then((response) => {
      console.log('response ', response);
    })
    .catch((e) => {
      console.log('error ', e);
    })
} catch (err) {
  console.error(err);
}

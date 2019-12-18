import { APIGatewayProxyEvent, Context, Callback } from "aws-lambda";
import { Hook } from "hookcord";
import { verify } from "jsonwebtoken";

interface NetlifyEventBody {
  id: string;
  site_id: string;
  build_id: string;
  state: NetlifyStates;
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

// enum to reference netlify states consistently
enum NetlifyStates {
  BUILDING = "building",
  READY = "ready",
  ERROR = "error"
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

// maps a build state to some verbiage
enum TitleMapping {
  "building" = "Visit the build log",
  "ready" = "Visit the changes live",
  "error" = "Visit the build log"
}

// always want to send a 200 back to Netlify so they
// know the webhook is healthy and doesn't get disabled
const sendResponse = (callback: Callback) => {
  const response = {
    statusCode: 200
  };
  callback(null, response);
};

// utility function to get value from enum
// avoiding runtime errors
const getValueByKey = (
  enumerated: any,
  key: string
): string | number | null => {
  return enumerated[key] ?? null;
};

const generateMessage = (body: NetlifyEventBody) => {
  const buildLogUrl = `${body.admin_url}/deploys/${body.id}`;
  const buildLogDescription = `Or check out the [build log](${buildLogUrl})`;
  return {
    content: `${getValueByKey(ContentMapping, body.state)} *${body.name}*`,
    embeds: [
      {
        color: getValueByKey(ColorMapping, body.state),
        title: getValueByKey(TitleMapping, body.state),
        url: body.state === NetlifyStates.READY ? body.url : buildLogUrl,
        description:
          body.state === NetlifyStates.READY ? buildLogDescription : "",
        timestamp: new Date(),
        footer: {
          text: `Using git branch ${body.branch}`
        }
      }
    ]
  };
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const { WEBHOOK_SECRET, DISCORD_WEBHOOK_URL } = process.env;
  try {
    await verify(event.headers["x-webhook-signature"], WEBHOOK_SECRET, {
      algorithm: "SHA256"
    });
  } catch (err) {
    console.error("Webhook JWT failed verification", err);
    sendResponse(callback);
  }
  try {
    const discordAuthParts = DISCORD_WEBHOOK_URL.split("/");
    const id = discordAuthParts[discordAuthParts.length - 2];
    const secret = discordAuthParts[discordAuthParts.length - 1];

    new Hook()
      .login(id, secret)
      .setPayload(generateMessage(JSON.parse(event.body)))
      .fire();
    sendResponse(callback);
  } catch (err) {
    console.error(err);
    sendResponse(callback);
  }
};

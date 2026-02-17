import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// Create MCP server instance
const server = new Server(
  {
    name: "telegram-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ask_blocking_question",
        description: "Send a blocking question to user via Telegram and wait for response",
        inputSchema: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The question to send to the user"
            },
            choices: {
              type: "array",
              items: { type: "string" },
              description: "Optional multiple choice options"
            },
            timeout_minutes: {
              type: "number",
              description: "Timeout in minutes (default: 60)"
            }
          },
          required: ["question"]
        }
      },
      {
        name: "check_question_answers",
        description: "Poll for answers to pending blocking questions",
        inputSchema: {
          type: "object",
          properties: {
            question_ids: {
              type: "array",
              items: { type: "string" },
              description: "Specific question IDs to check, or all if not provided"
            }
          }
        }
      },
      {
        name: "mark_question_answered",
        description: "Archive an answered question and remove from pending list",
        inputSchema: {
          type: "object",
          properties: {
            question_id: {
              type: "string",
              description: "The question ID to mark as answered"
            }
          },
          required: ["question_id"]
        }
      }
    ]
  };
});

// Register tool call handler (placeholder implementations)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "ask_blocking_question":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              questionId: `q_${Date.now()}`,
              status: "pending",
              message: "Placeholder: Tool implementation pending in Plan 02"
            })
          }
        ]
      };

    case "check_question_answers":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify([])
          }
        ]
      };

    case "mark_question_answered":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              message: "Placeholder: Tool implementation pending in Plan 02"
            })
          }
        ]
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Register resource list handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "telegram://requirements/new",
        name: "New Requirements",
        description: "JSONL stream of new requirements submitted via Telegram",
        mimeType: "application/x-ndjson"
      }
    ]
  };
});

// Register resource read handler (placeholder implementation)
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "telegram://requirements/new") {
    return {
      contents: [
        {
          uri,
          mimeType: "application/x-ndjson",
          text: JSON.stringify({
            requirements: [],
            message: "Placeholder: Resource implementation pending in Plan 02"
          })
        }
      ]
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Server lifecycle management
async function main() {
  console.error("[MCP] Starting Telegram MCP server...");

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[MCP] Server ready on stdio transport");
  console.error("[MCP] Tools: ask_blocking_question, check_question_answers, mark_question_answered");
  console.error("[MCP] Resources: telegram://requirements/new");
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.error("[MCP] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.error("[MCP] Shutting down...");
  process.exit(0);
});

// Error handling
main().catch((err) => {
  console.error("[MCP] Fatal error:", err);
  process.exit(1);
});

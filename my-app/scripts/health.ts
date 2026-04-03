#!/usr/bin/env bun
// Health check script - tests LLM provider connectivity
import { readFileSync } from "fs";
import { join } from "path";

interface Config {
  architecture: string;
  llm: {
    provider: string;
    model: string;
  };
}

function loadConfig(): Config {
  const configPath = join(process.cwd(), ".phoenix", "config.json");
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as Config;
}

async function pingZai(model: string): Promise<{ ok: boolean; latency: number; error?: string; content?: string }> {
  const start = Date.now();
  try {
    const response = await fetch("https://api.z.ai/api/coding/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ZAI_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Say 'pong' and nothing else." }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    const latency = Date.now() - start;

    if (!response.ok) {
      const error = await response.text();
      return { ok: false, latency, error: `HTTP ${response.status}: ${error}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const reasoning = data.choices?.[0]?.message?.reasoning_content || "";
    
    if (response.ok && (content.length > 0 || reasoning.length > 0)) {
      return { ok: true, latency, content: content.substring(0, 50) || reasoning.substring(0, 50) + "..." };
    } else {
      return { ok: false, latency, error: `Unexpected response: ${content}` };
    }
  } catch (e) {
    return { ok: false, latency: Date.now() - start, error: String(e) };
  }
}

async function main() {
  console.log("🔥 Phoenix Provider Health Check\n");

  const config = loadConfig();
  console.log(`Provider: ${config.llm.provider}`);
  console.log(`Model: ${config.llm.model}\n`);

  if (config.llm.provider !== "zai") {
    console.log("⚠️  This health check only supports 'zai' provider");
    process.exit(1);
  }

  if (!process.env.ZAI_API_KEY) {
    console.log("❌ ZAI_API_KEY environment variable not set");
    process.exit(1);
  }

  process.stdout.write("Pinging... ");
  const result = await pingZai(config.llm.model);

  if (result.ok) {
    console.log(`✅ OK (${result.latency}ms)`);
    if (result.content) console.log(`   Response: ${result.content}`);
    process.exit(0);
  } else {
    console.log(`❌ Failed (${result.latency}ms)`);
    console.log(`   Error: ${result.error}`);
    process.exit(1);
  }
}

main();

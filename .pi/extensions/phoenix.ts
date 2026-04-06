/**
 * Phoenix Skills Extension
 *
 * Adds a `/phoenix` command that discovers and runs Phoenix project skills.
 * Phoenix skills are located in `.pi/skills/` or `.agents/skills/` directories.
 *
 * Usage:
 * 1. Copy this file to `.pi/extensions/phoenix.ts` in your project
 * 2. Type `/phoenix` to browse and run available phoenix skills
 * 3. Type `/phoenix:skill-name` to run a specific skill directly
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, dirname, basename } from "node:path";

interface PhoenixSkill {
  name: string;
  description: string;
  path: string;
  content: string;
  scope: "project" | "global";
  sourceDir: string;
}

/**
 * Parse frontmatter from skill markdown content
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const frontmatter: Record<string, string> = {};
  let body = content;

  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (match) {
    const fmText = match[1];
    body = match[2];

    for (const line of fmText.split("\n")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        // Remove quotes if present
        frontmatter[key] = value.replace(/^["'](.*)["']$/, "$1");
      }
    }
  }

  return { frontmatter, body };
}

/**
 * Discover skills in a directory
 */
async function discoverSkillsInDir(dir: string, scope: PhoenixSkill["scope"]): Promise<PhoenixSkill[]> {
  const skills: PhoenixSkill[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Look for SKILL.md in subdirectory
        const skillPath = join(dir, entry.name, "SKILL.md");
        try {
          const content = await readFile(skillPath, "utf-8");
          const { frontmatter } = parseFrontmatter(content);

          if (frontmatter.name && frontmatter.description) {
            skills.push({
              name: frontmatter.name,
              description: frontmatter.description,
              path: skillPath,
              content,
              scope,
              sourceDir: dir,
            });
          }
        } catch {
          // No SKILL.md or couldn't read it
        }
      } else if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith(".")) {
        // Direct .md files (for .pi/skills/ style)
        const skillPath = join(dir, entry.name);
        try {
          const content = await readFile(skillPath, "utf-8");
          const { frontmatter } = parseFrontmatter(content);

          if (frontmatter.name && frontmatter.description) {
            skills.push({
              name: frontmatter.name,
              description: frontmatter.description,
              path: skillPath,
              content,
              scope,
              sourceDir: dir,
            });
          }
        } catch {
          // Couldn't read or parse
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return skills;
}

/**
 * Find all phoenix project skills by walking up from cwd
 */
async function discoverProjectSkills(cwd: string): Promise<PhoenixSkill[]> {
  const skills: PhoenixSkill[] = [];

  // Walk up from cwd looking for .pi/skills/ and .agents/skills/
  let currentDir = cwd;
  while (true) {
    // Check .pi/skills/
    const piSkillsDir = join(currentDir, ".pi", "skills");
    const piSkills = await discoverSkillsInDir(piSkillsDir, "project");
    skills.push(...piSkills);

    // Check .agents/skills/
    const agentsSkillsDir = join(currentDir, ".agents", "skills");
    const agentsSkills = await discoverSkillsInDir(agentsSkillsDir, "project");
    skills.push(...agentsSkills);

    // Stop at git root or filesystem root
    const gitDir = join(currentDir, ".git");
    try {
      await stat(gitDir);
      break; // Found git root
    } catch {
      // Not a git root, continue up
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Filesystem root
    }
    currentDir = parentDir;
  }

  return skills;
}

/**
 * Discover global skills from ~/.pi/agent/skills/ and ~/.agents/skills/
 */
async function discoverGlobalSkills(): Promise<PhoenixSkill[]> {
  const skills: PhoenixSkill[] = [];

  const homeDir = process.env.HOME || process.env.USERPROFILE || "/";

  // ~/.pi/agent/skills/
  const agentSkillsDir = join(homeDir, ".pi", "agent", "skills");
  const agentSkills = await discoverSkillsInDir(agentSkillsDir, "global");
  skills.push(...agentSkills);

  // ~/.agents/skills/
  const agentsSkillsDir = join(homeDir, ".agents", "skills");
  const agentsSkills = await discoverSkillsInDir(agentsSkillsDir, "global");
  skills.push(...agentsSkills);

  return skills;
}

export default function phoenixSkillsExtension(pi: ExtensionAPI) {
  // Cache for discovered skills
  let cachedSkills: PhoenixSkill[] | null = null;
  let cachedCwd: string | null = null;

  /**
   * Get all available phoenix skills (project + global)
   */
  async function getAllSkills(cwd: string): Promise<PhoenixSkill[]> {
    // Use cache if cwd hasn't changed
    if (cachedSkills && cachedCwd === cwd) {
      return cachedSkills;
    }

    const [projectSkills, globalSkills] = await Promise.all([
      discoverProjectSkills(cwd),
      discoverGlobalSkills(),
    ]);

    // Merge: project skills take precedence over global
    const seenNames = new Set<string>();
    const allSkills: PhoenixSkill[] = [];

    for (const skill of projectSkills) {
      if (!seenNames.has(skill.name)) {
        seenNames.add(skill.name);
        allSkills.push(skill);
      }
    }

    for (const skill of globalSkills) {
      if (!seenNames.has(skill.name)) {
        seenNames.add(skill.name);
        allSkills.push(skill);
      }
    }

    cachedSkills = allSkills;
    cachedCwd = cwd;
    return allSkills;
  }

  /**
   * Get skill status for display
   */
  function getSkillBadge(skill: PhoenixSkill): string {
    return skill.scope === "project" ? "📁" : "🌐";
  }

  /**
   * Clear cache on reload
   */
  pi.on("session_start", () => {
    cachedSkills = null;
    cachedCwd = null;
  });

  /**
   * Register the /phoenix command
   */
  pi.registerCommand("phoenix", {
    description: "Browse and run Phoenix project skills",
    getArgumentCompletions: async (prefix, ctx) => {
      const skills = await getAllSkills(ctx.cwd);
      const matching = skills.filter((s) => s.name.startsWith(prefix));
      if (matching.length === 0) return null;
      return matching.map((s) => ({
        value: s.name,
        label: `${getSkillBadge(s)} ${s.name} - ${s.description.slice(0, 40)}${s.description.length > 40 ? "..." : ""}`,
      }));
    },
    handler: async (args, ctx) => {
      const skills = await getAllSkills(ctx.cwd);

      if (skills.length === 0) {
        ctx.ui.notify("No Phoenix skills found. Create skills in .pi/skills/ or .agents/skills/", "warning");
        return;
      }

      // If skill name provided, run it directly
      const skillName = args.trim();
      if (skillName) {
        const skill = skills.find((s) => s.name === skillName);
        if (!skill) {
          ctx.ui.notify(`Phoenix skill not found: ${skillName}`, "error");
          return;
        }

        // Send skill content as user message
        pi.sendUserMessage(skill.content);
        ctx.ui.notify(`🚀 Running Phoenix skill: ${skill.name}`, "info");
        return;
      }

      // Group skills by scope
      const projectSkills = skills.filter((s) => s.scope === "project");
      const globalSkills = skills.filter((s) => s.scope === "global");

      // Build selector items
      const items: Array<{ value: string; label: string }> = [];

      // Project skills section
      if (projectSkills.length > 0) {
        items.push({ value: "__header_project__", label: "📁 Project Skills (from .pi/skills/)" });
        for (const skill of projectSkills) {
          items.push({
            value: skill.name,
            label: `  ${skill.name} - ${skill.description.slice(0, 50)}${skill.description.length > 50 ? "..." : ""}`,
          });
        }
      }

      // Global skills section
      if (globalSkills.length > 0) {
        items.push({ value: "__header_global__", label: "🌐 Global Skills (from ~/.pi/agent/skills/)" });
        for (const skill of globalSkills) {
          items.push({
            value: skill.name,
            label: `  ${skill.name} - ${skill.description.slice(0, 50)}${skill.description.length > 50 ? "..." : ""}`,
          });
        }
      }

      // Add utility options
      items.push({ value: "__header_utils__", label: "⚙️ Options" });
      items.push({ value: "__refresh__", label: "  🔄 Refresh skill list" });
      items.push({ value: "__list_all__", label: "  📋 List all skills in chat" });

      const selected = await ctx.ui.select("🐦 Phoenix Skills", items);

      if (!selected) {
        return; // Cancelled
      }

      // Handle header clicks - just re-show the selector
      if (selected.startsWith("__header_")) {
        pi.sendUserMessage("/phoenix");
        return;
      }

      if (selected === "__refresh__") {
        cachedSkills = null;
        ctx.ui.notify("Phoenix skill cache cleared. Run /phoenix again to reload.", "info");
        return;
      }

      if (selected === "__list_all__") {
        let output = "# 🐦 Phoenix Skills\n\n";
        if (projectSkills.length > 0) {
          output += "## 📁 Project Skills\n\n";
          for (const skill of projectSkills) {
            output += `- **${skill.name}**: ${skill.description}\n`;
          }
          output += "\n";
        }
        if (globalSkills.length > 0) {
          output += "## 🌐 Global Skills\n\n";
          for (const skill of globalSkills) {
            output += `- **${skill.name}**: ${skill.description}\n`;
          }
        }
        pi.sendMessage({
          customType: "phoenix-skill-list",
          content: output,
          display: true,
        });
        return;
      }

      const skill = skills.find((s) => s.name === selected);
      if (!skill) {
        ctx.ui.notify(`Skill not found: ${selected}`, "error");
        return;
      }

      // Send skill content as user message to trigger the agent
      pi.sendUserMessage(skill.content);
      ctx.ui.notify(`🚀 Running Phoenix skill: ${skill.name}`, "info");
    },
  });

  /**
   * Register /phoenix:list as a shortcut to list all skills
   */
  pi.registerCommand("phoenix:list", {
    description: "List all Phoenix skills in chat",
    handler: async (_args, ctx) => {
      const skills = await getAllSkills(ctx.cwd);

      if (skills.length === 0) {
        ctx.ui.notify("No Phoenix skills found.", "warning");
        return;
      }

      const projectSkills = skills.filter((s) => s.scope === "project");
      const globalSkills = skills.filter((s) => s.scope === "global");

      let output = "# 🐦 Available Phoenix Skills\n\n";

      if (projectSkills.length > 0) {
        output += "## 📁 Project Skills (from .pi/skills/)\n\n";
        for (const skill of projectSkills) {
          output += `### ${skill.name}\n${skill.description}\n\n`;
          output += `Path: \`${skill.path}\`\n\n`;
        }
      }

      if (globalSkills.length > 0) {
        output += "## 🌐 Global Skills (from ~/.pi/agent/skills/)\n\n";
        for (const skill of globalSkills) {
          output += `### ${skill.name}\n${skill.description}\n\n`;
          output += `Path: \`${skill.path}\`\n\n`;
        }
      }

      output += "---\n\nRun `/phoenix:skill-name` to execute a specific skill, or `/phoenix` to browse.";

      pi.sendMessage({
        customType: "phoenix-skill-list",
        content: output,
        display: true,
      });
    },
  });
}

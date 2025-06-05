#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const config_js_1 = require("./config.js");
const dependencyInjection_js_1 = require("./dependencyInjection.js");
const repl_js_1 = require("./repl/repl.js");
const security_js_1 = require("./core/security.js");
const errors_js_1 = require("./core/errors.js");
function mergeCliWithEnv(cliArgs, env = process.env) {
    const merged = { ...env };
    if (cliArgs.model !== undefined) {
        merged["GEMINI_MODEL"] = cliArgs.model;
    }
    if (cliArgs.temp !== undefined) {
        merged["GEMINI_TEMPERATURE"] = cliArgs.temp.toString();
    }
    if (cliArgs.stream !== undefined) {
        merged["OUTPUT_STREAMING"] = cliArgs.stream.toString();
    }
    if (cliArgs.raw !== undefined) {
        merged["OUTPUT_RAW"] = cliArgs.raw.toString();
    }
    return merged;
}
function createProgram() {
    const program = new commander_1.Command();
    program
        .name("prompt-elevator")
        .description("A lightweight CLI that continuously accepts natural-language prompts and returns richer, more technical articulations using Google Gemini 2.5 Flash")
        .version("0.1.0");
    program
        .option("--model <model>", "Gemini model to use (gemini-2.5-flash-preview-05-20, gemini-2.0-flash-exp, gemini-1.5-flash, gemini-1.5-flash-8b, gemini-1.5-pro)")
        .option("--temp <temperature>", "Temperature for response generation (0.0 to 2.0)", parseFloat);
    program
        .option("--stream", "Enable streaming output (default: true)")
        .option("--no-stream", "Disable streaming output")
        .option("--raw", "Enable raw output mode (no formatting)")
        .option("--no-raw", "Disable raw output mode (default)");
    return program;
}
async function main() {
    try {
        const program = createProgram();
        program.parse();
        const options = program.opts();
        const mergedEnv = mergeCliWithEnv(options);
        const config = (0, config_js_1.createAppConfig)(mergedEnv);
        console.log("🔐 Validating API key and security settings...");
        const securityResult = await (0, security_js_1.validateStartupSecurity)(config);
        if (securityResult.success === false) {
            const userFriendlyError = (0, errors_js_1.toUserFriendlyError)(securityResult.error);
            console.error(`\n❌ ${userFriendlyError.title}: ${userFriendlyError.message}`);
            if (userFriendlyError.suggestions &&
                userFriendlyError.suggestions.length > 0) {
                console.error("\n💡 Suggestions:");
                userFriendlyError.suggestions.forEach((suggestion) => {
                    console.error(`   • ${suggestion}`);
                });
            }
            process.exit(1);
        }
        console.log("✅ API key validated successfully");
        const services = (0, dependencyInjection_js_1.createValidatedServiceContainer)(config);
        const logger = services.loggerFactory.createRootLogger({
            component: "cli",
            operation: "startup",
        });
        logger.info("Application startup initiated", {
            config: {
                model: config.api.modelId,
                temperature: config.api.temperature,
                streaming: config.output.streaming,
                rawMode: config.output.raw,
                logLevel: config.logging.level,
            },
        });
        console.log("✅ Configuration and security validation complete");
        console.log(`   Model: ${config.api.modelId}`);
        console.log(`   Temperature: ${config.api.temperature}`);
        console.log(`   Streaming: ${config.output.streaming}`);
        console.log(`   Raw mode: ${config.output.raw}`);
        console.log("\n🔧 Services initialized:");
        console.log("   ✓ Prompt processing pipeline");
        console.log("   ✓ Gemini API client");
        console.log("   ✓ Console formatter");
        console.log("   ✓ Structured logging");
        logger.info("Services initialized successfully", {
            correlationId: logger.getCorrelationId(),
        });
        console.log("\n🚀 Starting interactive REPL...");
        console.log();
        const replOptions = {
            formatOptions: {
                mode: config.output.raw ? "raw" : "formatted",
                streaming: config.output.streaming,
            },
            loggerFactory: services.loggerFactory,
        };
        const repl = new repl_js_1.InteractiveREPL(services, replOptions);
        await repl.start();
    }
    catch (error) {
        if (error instanceof config_js_1.ConfigurationError) {
            console.error(`Configuration Error: ${error.message}`);
            process.exit(1);
        }
        else {
            console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    }
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map
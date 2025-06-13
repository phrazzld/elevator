# elevator

A lightweight CLI that transforms natural-language prompts into expert-level, domain-specific articulations using Google Gemini 2.5 Flash. Produces natural, professional language without corporate jargon or rigid templates.

## Features

- ⚡ **Direct API Integration**: Simple, fast prompt elevation using native fetch
- 🎯 **Expert-Level Enhancement**: Transforms casual prompts into sophisticated, domain-specific articulations
- 📝 **Multiline Input Support**: Interactive mode with Ctrl+D termination for complex prompts
- 🔄 **Flexible Input Methods**: Command-line arguments, piped input, file input, and interactive mode
- 🔒 **Security First**: Environment-based API key management
- 📊 **Debug Logging**: Optional JSON-formatted logs (--debug flag)
- 🚀 **Minimal Dependencies**: Lightweight with only essential dependencies

## Installation

### Prerequisites

- **Node.js** >=18.0.0
- **pnpm** (recommended) or **npm**

### From Source (Development)

This project is currently in development. To use it:

```bash
# Clone the repository
git clone <repository-url>
cd elevator

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Quick Start

### 1. Get Your API Key

Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to get your free Gemini API key.

### 2. Set Your API Key

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export GEMINI_API_KEY="your-api-key-here"
```

### 3. Start Using

```bash
# Single-line prompt (classic usage)
node dist/cli.js "make a todo app"

# Multiline interactive mode
node dist/cli.js
# Enter your prompt (press Ctrl+D when done):
# Create a web application that:
# - Has user authentication
# - Supports file uploads
# - Uses a modern framework
# ^D

# Piped input
echo "build a REST API" | node dist/cli.js

# Raw output (no formatting)
node dist/cli.js --raw "explain microservices"

# Enable debug logging to see operational details
node dist/cli.js --debug "build a web app"
```

## Usage

elevator supports multiple input methods to fit different workflows:

### Single-Line Arguments (Classic Mode)

Process a single prompt directly from the command line:

```bash
node dist/cli.js "Your prompt here"
```

### Multiline Interactive Mode

For complex prompts that span multiple lines, run elevator without arguments:

```bash
node dist/cli.js
```

This enters interactive mode where you can:

- Type multiple lines
- Include code blocks and formatting
- Press **Ctrl+D** (Unix/Linux/macOS) or **Ctrl+Z** (Windows) to submit

### Piped Input

Perfect for automation and scripting:

```bash
# From echo
echo "Create a microservice architecture" | node dist/cli.js

# From heredoc
node dist/cli.js << 'EOF'
Build a React component that:
- Accepts props for configuration
- Has proper TypeScript types
- Includes comprehensive tests
EOF

# From file
node dist/cli.js < prompt.txt

# In a pipeline
cat requirements.txt | node dist/cli.js --raw > technical-specs.txt
```

### Examples by Input Method

**Single-Line:**

```bash
node dist/cli.js "make a website"
node dist/cli.js --raw "build a calculator app"
node dist/cli.js --debug "analyze this code"
node dist/cli.js --debug --raw "create microservice" > output.txt 2> logs.json
```

**Multiline Interactive:**

````bash
node dist/cli.js
# Enter your prompt (press Ctrl+D when done):
#
# There's a bug in our authentication system:
# ```
# Error: Invalid token signature
# ```
#
# Please investigate and provide a solution.
# ^D
````

**Piped/File Input:**

```bash
echo "refactor this legacy code" | node dist/cli.js
node dist/cli.js < complex-prompt.txt
```

### CLI Options

| Option       | Description                                           | Default |
| ------------ | ----------------------------------------------------- | ------- |
| `[prompt]`   | Optional prompt (if omitted, enters interactive mode) | -       |
| `--raw`      | Output raw response (no formatting)                   | `false` |
| `--debug`    | Enable debug logging (shows JSON logs to stderr)      | `false` |
| `-h, --help` | Show help information with usage examples             | -       |

### Input Methods Summary

| Method          | When to Use                      | Example                           |
| --------------- | -------------------------------- | --------------------------------- |
| **Arguments**   | Quick, single-line prompts       | `elevator "build an API"`         |
| **Interactive** | Complex, multiline prompts       | `elevator` → type → Ctrl+D        |
| **Piped**       | Automation, files, preprocessing | `echo "..." \| elevator`          |
| **Raw Mode**    | Scripting, saving to files       | `elevator --raw "..." > file.txt` |

## Pipe Compatibility & Scripting

elevator is designed to work seamlessly in shell pipelines and automation scripts. Debug logs (when enabled with `--debug`) go to `stderr`, keeping `stdout` clean for piping.

### Raw Output Mode

Use `--raw` flag for script-friendly output without formatting:

```bash
# Clean output perfect for piping
echo "create REST API endpoints" | elevator --raw > specifications.txt

# Chain with other tools
cat requirements.txt | elevator --raw | grep -i "database" > db-requirements.txt

# Save to files without formatting
elevator --raw "implement authentication" > auth-specs.md
```

### Shell Integration Examples

**Batch Processing:**

```bash
# Process multiple prompts from a file
while IFS= read -r line; do
    echo "$line" | elevator --raw >> enhanced-prompts.txt
done < prompts.txt
```

**Error Handling in Scripts:**

```bash
#!/bin/bash
if echo "build microservice" | elevator --raw > /dev/null 2>&1; then
    echo "Success: Prompt processed"
else
    echo "Error: Failed to process prompt" >&2
    exit 1
fi
```

**Integration with CI/CD:**

```bash
# Generate technical specs from user stories
find stories/ -name "*.txt" -exec sh -c '
    echo "Processing: $1"
    elevator --raw < "$1" > "specs/$(basename "$1" .txt)-technical.md"
' _ {} \;
```

### Debug Logging

Operational logs are JSON-formatted and sent to `stderr` when `--debug` is enabled:

```bash
# Run with debug logging
node dist/cli.js --debug "test prompt"

# Capture only the enhanced prompt (no debug)
node dist/cli.js "test prompt" > output.txt

# Capture debug logs for monitoring
node dist/cli.js --debug "test prompt" >/dev/null 2> logs.json

# Capture both output and debug logs separately
node dist/cli.js --debug "test prompt" > output.txt 2> logs.json
```

## Configuration

### Environment Variables

| Variable         | Required | Default | Description         |
| ---------------- | -------- | ------- | ------------------- |
| `GEMINI_API_KEY` | ✅ Yes   | -       | Your Gemini API key |

### Limits & Constraints

| Constraint           | Value | Description                                  |
| -------------------- | ----- | -------------------------------------------- |
| **Input Size Limit** | 1MB   | Maximum size for prompt input (all modes)    |
| **Model**            | Fixed | Gemini 2.5 Flash (optimized for performance) |

The CLI uses structured JSON logging for operational events when `--debug` is enabled.

### Exit Codes

elevator follows standard Unix exit code conventions for reliable scripting:

| Exit Code | Name        | Description                         | When It Occurs                |
| --------- | ----------- | ----------------------------------- | ----------------------------- |
| `0`       | SUCCESS     | Operation completed successfully    | Prompt processed successfully |
| `1`       | ERROR       | General error occurred              | API errors, invalid input     |
| `130`     | INTERRUPTED | Process terminated by user (Ctrl+C) | User cancellation (SIGINT)    |

**Script Usage Examples:**

```bash
# Check if command succeeded
if elevator "test prompt" >/dev/null 2>&1; then
    echo "Processing successful"
fi

# Handle different exit codes
elevator "process this"
case $? in
    0) echo "Success" ;;
    1) echo "Error occurred" >&2 ;;
    130) echo "Cancelled by user" >&2 ;;
esac

# Use in conditional chains
elevator "input" && echo "Processed" || echo "Failed"
```

## API Key Setup

### Getting Your API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Copy your new API key

### Setting Your API Key

```bash
# Add to your shell profile
echo 'export GEMINI_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

## Examples

### Single-Line Prompt Elevation

```bash
node dist/cli.js "make a todo app"
```

**Output:**

```
Develop a comprehensive task management application with full CRUD operations, user authentication, persistent data storage, and an intuitive user interface for creating, organizing, and tracking personal productivity tasks.
```

### Multiline Interactive Example

```bash
node dist/cli.js
```

**Input:**

```
Enter your prompt (press Ctrl+D when done):

Our React app has performance issues:
- Slow initial load times
- Laggy user interactions
- High memory usage

Please analyze and optimize the codebase.
^D
```

**Output:**

```
Conduct a comprehensive performance audit and optimization of the React application, focusing on bundle size reduction, code splitting implementation, memory leak identification, component rendering optimization, lazy loading strategies, and implementation of performance monitoring tools to address slow initial load times, laggy user interactions, and excessive memory consumption.
```

### Piped Input Examples

```bash
# Simple piping
echo "write unit tests" | node dist/cli.js

# From a file
node dist/cli.js < requirements.txt

# Complex pipeline
cat user-story.md | node dist/cli.js --raw | tee technical-requirements.txt
```

### Raw Output for Scripting

```bash
node dist/cli.js --raw "implement OAuth" > enhanced-prompt.txt
```

### Real-World Workflow Examples

**Bug Report Enhancement:**

```bash
node dist/cli.js << 'EOF'
There's a memory leak in our Node.js service:
- Memory usage grows over time
- Eventually crashes with OOM
- Happens under high load
- Started after the recent deployment
EOF
```

**Feature Request Processing:**

```bash
echo "Add dark mode to the dashboard" | node dist/cli.js --raw
```

**Documentation Generation:**

```bash
cat api-endpoints.txt | node dist/cli.js > technical-documentation.md
```

## Troubleshooting

### Common Issues

**API Key Not Found**

When you run elevator without setting your API key, you'll see helpful guidance:

```
❌ Error: GEMINI_API_KEY environment variable is required

💡 To get started:
   1. Get your API key from: https://aistudio.google.com/app/apikey
   2. Set the environment variable:
      export GEMINI_API_KEY="your-key-here"

📖 For more help, see: https://github.com/phrazzld/elevator#setup
```

**API Key Invalid**

```
❌ API error: 401 Unauthorized - Invalid API key. Verify your GEMINI_API_KEY

💡 Check your API key:
   1. Verify your GEMINI_API_KEY is correct
   2. Get a new key from: https://aistudio.google.com/app/apikey
```

- **Solution**: Copy your API key exactly from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Solution**: Ensure no extra spaces or characters in your API key
- **Solution**: Re-export the environment variable in your current shell session

**No Input Provided**

```
❌ Error: No input provided
```

- **Solution**: Provide a prompt as an argument or enter text in interactive mode
- **Solution**: When using piped input, ensure the input isn't empty

**Input Size Limit Exceeded**

```
❌ Error: Input size limit exceeded: Maximum input size is 1MB
```

- **Solution**: Reduce the size of your input prompt or file
- **Solution**: Split large inputs into smaller chunks for processing
- **Note**: This limit ensures optimal performance and prevents memory issues

**Network Issues**

If you experience network-related errors:

- **Solution**: Check your internet connection
- **Solution**: Verify that you can access Google services
- **Solution**: Try again after a moment

**Rate Limiting**

```
API error: 429 Too Many Requests - Rate limit exceeded. Please try again later
```

- **Solution**: Wait a moment and try again

### Multiline Input Tips

**Submitting Your Prompt:**

- **Unix/Linux/macOS**: Press `Ctrl+D` to submit
- **Windows**: Press `Ctrl+Z` then Enter to submit

**Canceling Input:**

- Press `Ctrl+C` to cancel and exit

**Working with Code Blocks:**

````bash
node dist/cli.js
# Enter your prompt (press Ctrl+D when done):
#
# Fix this TypeScript error:
# ```typescript
# function example(data: any) {
#   return data.someProperty;
# }
# ```
# ^D
````

**Best Practices:**

- Use multiline mode for complex prompts with code, lists, or detailed requirements
- Use piped input for automation and file processing
- Use raw mode (`--raw`) when saving output to files or using in scripts

### Getting Help

- **CLI Help**: `node dist/cli.js --help`
- **Issues**: Report bugs on [GitHub Issues](https://github.com/your-org/elevator/issues)

## Development

### Development Setup

```bash
# Clone and install
git clone <repository-url>
cd elevator
pnpm install

# Set up environment
export GEMINI_API_KEY="your-api-key-here"

# Development commands
pnpm build        # Build TypeScript to JavaScript
pnpm test         # Run tests
pnpm typecheck    # Check TypeScript types
```

### Project Architecture

This project follows a radically simplified architecture focusing on directness and maintainability. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed information about the design decisions.

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**A simple tool for elevating prompts with technical precision**

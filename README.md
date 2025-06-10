# elevator

A lightweight CLI that transforms natural-language prompts into more sophisticated, technically precise articulations using Google Gemini 2.5 Flash.

## Features

- ⚡ **Direct API Integration**: Simple, fast prompt elevation using native fetch
- 🎯 **Technical Enhancement**: Converts casual prompts into professional technical language
- 📝 **Multiline Input Support**: Interactive mode with Ctrl+D termination for complex prompts
- 🔄 **Flexible Input Methods**: Command-line arguments, piped input, file input, and interactive mode
- 🔒 **Security First**: Environment-based API key management
- 📊 **Structured Logging**: JSON-formatted logs with correlation IDs
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
| `-h, --help` | Show help information with usage examples             | -       |

### Input Methods Summary

| Method          | When to Use                      | Example                           |
| --------------- | -------------------------------- | --------------------------------- |
| **Arguments**   | Quick, single-line prompts       | `elevator "build an API"`         |
| **Interactive** | Complex, multiline prompts       | `elevator` → type → Ctrl+D        |
| **Piped**       | Automation, files, preprocessing | `echo "..." \| elevator`          |
| **Raw Mode**    | Scripting, saving to files       | `elevator --raw "..." > file.txt` |

## Configuration

### Environment Variables

| Variable         | Required | Default | Description         |
| ---------------- | -------- | ------- | ------------------- |
| `GEMINI_API_KEY` | ✅ Yes   | -       | Your Gemini API key |

The CLI uses the fixed Gemini 2.5 Flash model with a 30-second timeout and structured JSON logging.

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
✨ Enhanced prompt:
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
✨ Enhanced prompt:
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

```
Error: GEMINI_API_KEY required
```

- **Solution**: Set your `GEMINI_API_KEY` environment variable

**API Key Invalid**

```
API error: 401 Unauthorized - Invalid API key. Verify your GEMINI_API_KEY
```

- **Solution**: Verify your API key at [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Solution**: Ensure no extra spaces or characters in your API key

**No Input Provided**

```
Error: No input provided
```

- **Solution**: Provide a prompt as an argument or enter text in interactive mode
- **Solution**: When using piped input, ensure the input isn't empty

**Network Timeout**

```
Request timeout - API call exceeded 30 seconds
```

- **Solution**: Check your internet connection
- **Solution**: Try again with a shorter prompt

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

# elevator

A lightweight CLI that transforms natural-language prompts into more sophisticated, technically precise articulations using Google Gemini 2.5 Flash.

## Features

- ⚡ **Direct API Integration**: Simple, fast prompt elevation using native fetch
- 🎯 **Technical Enhancement**: Converts casual prompts into professional technical language
- 🔒 **Security First**: Environment-based API key management
- 📝 **Structured Logging**: JSON-formatted logs with correlation IDs
- 🚀 **Minimal Dependencies**: Lightweight with only essential dependencies

## Installation

### Prerequisites

- **Node.js** >=18.0.0
- **pnpm** (recommended) or **npm**

### Global Installation (Recommended)

```bash
npm install -g prompt-elevator
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
# Run a prompt through the CLI
prompt-elevator "make a todo app"

# Or with raw output (no formatting)
prompt-elevator --raw "explain REST APIs"
```

## Usage

### Basic Usage

Process a single prompt and get an elevated, technical version:

```bash
prompt-elevator "Your prompt here"
```

**Examples:**

```bash
# Basic prompt elevation
prompt-elevator "make a website"

# Raw output (no formatting)
prompt-elevator --raw "build a calculator app"
```

### CLI Options

| Option       | Description                         | Default |
| ------------ | ----------------------------------- | ------- |
| `--raw`      | Output raw response (no formatting) | `false` |
| `-h, --help` | Show help information               | -       |

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

### Basic Prompt Elevation

```bash
node dist/cli.js "make a todo app"
```

**Output:**

```
Develop a comprehensive task management application with full CRUD operations, user authentication, persistent data storage, and an intuitive user interface for creating, organizing, and tracking personal productivity tasks.
```

### Technical Enhancement

```bash
node dist/cli.js "build an API"
```

**Output:**

```
Design and implement a RESTful API architecture with proper HTTP methods, status codes, authentication middleware, data validation, error handling, and comprehensive documentation following OpenAPI specifications.
```

### Raw Output for Scripting

```bash
node dist/cli.js --raw "write tests" > enhanced-prompt.txt
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

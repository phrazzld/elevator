# prompt-elevator

A lightweight CLI that continuously accepts natural-language prompts and returns richer, more technical articulations using Google Gemini 2.5 Flash.

## Features

- 🚀 **Interactive REPL Mode**: Continuous prompt processing with persistent session
- ⚡ **Single Prompt Mode**: Process individual prompts directly from command line
- 🎛️ **Multiple Gemini Models**: Support for latest Gemini models including 2.5 Flash and 2.0 Flash
- 🌊 **Streaming Output**: Real-time response streaming (configurable)
- 🎨 **Formatted Output**: Enhanced console formatting with progress indicators
- ⚙️ **Flexible Configuration**: Environment variables and CLI flags
- 🔒 **Security First**: API key validation and secure credential handling
- 📝 **Structured Logging**: JSON-formatted logs with correlation IDs

## Installation

### Prerequisites

- **Node.js** >=18.0.0
- **npm**, **pnpm** >=10.0.0, or **yarn**

### Global Installation

```bash
# Using npm
npm install -g prompt-elevator

# Using pnpm (recommended)
pnpm add -g prompt-elevator

# Using yarn
yarn global add prompt-elevator
```

### Local Installation

```bash
# Using npm
npm install prompt-elevator

# Using pnpm
pnpm add prompt-elevator

# Using yarn
yarn add prompt-elevator
```

## Quick Start

### 1. Get Your API Key

Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to get your free Gemini API key.

### 2. Set Your API Key

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export GEMINI_API_KEY="your-api-key-here"

# Or create a .env file in your project
echo "GEMINI_API_KEY=your-api-key-here" > .env
```

### 3. Start Using

```bash
# Interactive mode
prompt-elevator

# Single prompt mode
prompt-elevator "Explain quantum computing in simple terms"
```

## Usage

### Interactive Mode (Default)

Start the interactive REPL by running the command without arguments:

```bash
prompt-elevator
```

```
🚀 Welcome to prompt-elevator! Enter your prompts below. Type 'help' for commands or 'exit' to quit.

prompt> Write a function to calculate fibonacci numbers
✨ Enhanced prompt:
[Enhanced response appears here...]

prompt> exit
👋 Goodbye!
```

**Interactive Commands:**

- `help` - Show available commands
- `exit`, `quit` - Exit the REPL
- `Ctrl+C` - Graceful exit

### Single Prompt Mode

Process a single prompt and exit:

```bash
prompt-elevator "Your prompt here"
```

**Examples:**

```bash
# Basic usage
prompt-elevator "Explain REST APIs"

# With model selection
prompt-elevator --model gemini-1.5-pro "Write a Python script to parse CSV files"

# With custom temperature
prompt-elevator --temp 0.9 "Generate creative story ideas"

# Raw output (no formatting)
prompt-elevator --raw "List the top 5 programming languages"
```

### CLI Options

| Option                 | Description                               | Default                          |
| ---------------------- | ----------------------------------------- | -------------------------------- |
| `--model <model>`      | Gemini model to use                       | `gemini-2.5-flash-preview-05-20` |
| `--temp <temperature>` | Response generation temperature (0.0-2.0) | `0.7`                            |
| `--stream`             | Enable streaming output                   | `true`                           |
| `--no-stream`          | Disable streaming output                  | -                                |
| `--raw`                | Enable raw output mode (no formatting)    | `false`                          |
| `--no-raw`             | Disable raw output mode                   | -                                |
| `-V, --version`        | Show version number                       | -                                |
| `-h, --help`           | Show help information                     | -                                |

### Available Models

- `gemini-2.5-flash-preview-05-20` (default)
- `gemini-2.0-flash-exp`
- `gemini-1.5-flash`
- `gemini-1.5-flash-8b`
- `gemini-1.5-pro`

## Configuration

### Environment Variables

| Variable               | Required | Default                          | Description                                      |
| ---------------------- | -------- | -------------------------------- | ------------------------------------------------ |
| `GEMINI_API_KEY`       | ✅ Yes   | -                                | Your Gemini API key                              |
| `GEMINI_MODEL`         | No       | `gemini-2.5-flash-preview-05-20` | Gemini model to use                              |
| `GEMINI_TEMPERATURE`   | No       | `0.7`                            | Temperature for response generation (0.0-2.0)    |
| `GEMINI_TIMEOUT_MS`    | No       | `30000`                          | Request timeout in milliseconds (1000-300000)    |
| `GEMINI_MAX_RETRIES`   | No       | `3`                              | Maximum retry attempts (0-10)                    |
| `OUTPUT_RAW`           | No       | `false`                          | Enable raw output mode                           |
| `OUTPUT_STREAMING`     | No       | `true`                           | Enable streaming output                          |
| `OUTPUT_SHOW_PROGRESS` | No       | `true`                           | Show progress indicators                         |
| `LOG_LEVEL`            | No       | `info`                           | Logging level (`debug`, `info`, `warn`, `error`) |
| `SERVICE_NAME`         | No       | `prompt-elevator`                | Service name for logs                            |
| `LOG_JSON_FORMAT`      | No       | `true`                           | Use JSON format for logs                         |

### Configuration Examples

**Basic Configuration:**

```bash
export GEMINI_API_KEY="your-api-key"
export GEMINI_MODEL="gemini-1.5-pro"
export GEMINI_TEMPERATURE="0.9"
```

**Development Configuration:**

```bash
export GEMINI_API_KEY="your-api-key"
export LOG_LEVEL="debug"
export OUTPUT_STREAMING="false"
export LOG_JSON_FORMAT="false"
```

**Production Configuration:**

```bash
export GEMINI_API_KEY="your-api-key"
export GEMINI_TIMEOUT_MS="60000"
export GEMINI_MAX_RETRIES="5"
export LOG_LEVEL="warn"
export SERVICE_NAME="my-app-prompt-elevator"
```

## API Key Setup

### Getting Your API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Copy your new API key

### Setting Your API Key

**Option 1: Environment Variable (Recommended)**

```bash
# Add to your shell profile
echo 'export GEMINI_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

**Option 2: Project .env File**

```bash
# In your project directory
echo "GEMINI_API_KEY=your-api-key-here" > .env
```

**Option 3: One-time Usage**

```bash
GEMINI_API_KEY="your-api-key-here" prompt-elevator "Your prompt"
```

## Examples

### Writing Code

```bash
prompt-elevator "Write a TypeScript function that validates email addresses with detailed error messages"
```

### Technical Explanations

```bash
prompt-elevator --model gemini-1.5-pro "Explain the differences between SQL and NoSQL databases with use cases"
```

### Creative Writing

```bash
prompt-elevator --temp 1.2 "Generate 5 unique story prompts for science fiction novels"
```

### Code Review

```bash
prompt-elevator "Review this Python function for potential improvements: [paste your code here]"
```

### Documentation

```bash
prompt-elevator --raw "Generate API documentation for a REST endpoint that creates user accounts" > api-docs.md
```

## Troubleshooting

### Common Issues

**API Key Not Found**

```
❌ Configuration Error: Environment variable GEMINI_API_KEY is required but not set
```

- **Solution**: Set your `GEMINI_API_KEY` environment variable or create a `.env` file

**API Key Invalid**

```
❌ API Error: Invalid API key provided
```

- **Solution**: Verify your API key at [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Solution**: Ensure no extra spaces or characters in your API key

**Network Timeout**

```
❌ Network Error: Request timeout after 30000ms
```

- **Solution**: Check your internet connection
- **Solution**: Increase timeout with `GEMINI_TIMEOUT_MS=60000`

**Rate Limiting**

```
❌ API Error: Rate limit exceeded
```

- **Solution**: Wait a moment and try again
- **Solution**: Reduce request frequency

**Model Not Available**

```
❌ Configuration Error: Environment variable GEMINI_MODEL must be one of: ...
```

- **Solution**: Use one of the supported models listed above
- **Solution**: Check for typos in the model name

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
LOG_LEVEL=debug prompt-elevator "test prompt"
```

### Getting Help

- **CLI Help**: `prompt-elevator --help`
- **Interactive Help**: Type `help` in the REPL
- **Issues**: Report bugs on [GitHub Issues](https://github.com/your-org/prompt-elevator/issues)

## Contributing

This project follows strict development standards. Please see:

- [Development Philosophy](docs/DEVELOPMENT_PHILOSOPHY.md)
- [TypeScript Guidelines](docs/DEVELOPMENT_PHILOSOPHY_APPENDIX_TYPESCRIPT.md)

### Development Setup

```bash
# Clone and install
git clone https://github.com/your-org/prompt-elevator.git
cd prompt-elevator
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# Development commands
pnpm dev          # Watch mode
pnpm test         # Run tests
pnpm test:coverage # Coverage report
pnpm lint         # Lint code
pnpm format       # Format code
pnpm build        # Production build
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for developers who want better prompts**

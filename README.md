# AI Text Extractor

An Obsidian plugin that uses OpenAI's API to extract text from images.

## Configuration

The plugin reads its configuration from a file called `ai-text-extractor-config.md` in your Obsidian vault. This file should contain the following settings:

```markdown
api-key: your-openai-api-key-here
model: gpt-4o-mini
```

### Configuration Options

- `api-key`: Your OpenAI API key. You can get this from [OpenAI's platform](https://platform.openai.com/api-keys)
- `model`: The OpenAI model to use for text extraction. Default is `gpt-4o-mini`

### Setting Up

1. Create a new file in your Obsidian vault called `ai-text-extractor-config.md`
2. Add your OpenAI API key and preferred model using the format shown above
3. Save the file

The plugin will automatically detect this file and use the settings for text extraction.

## Usage

1. Use the command palette (Ctrl/Cmd + P) and search for "Capture Image and Extract Text"
2. Select an image to process
3. The extracted text will be saved as a new markdown file in your vault

## Security Note

Keep your API key secure and never share it. The configuration file is stored in your local vault and is not shared with anyone else.

## Features
- Capture image via camera (mobile) or file picker (desktop)
- Extract text using any OpenAI chat model (default: `gpt-4o-mini`)
- Save OCR output to `OCR-<timestamp>.md` in your vault
- Securely store your OpenAI API key in plugin settings

## Installation

```bash
# Assuming you're inside your vault folder
mkdir -p .obsidian/plugins/image-ocr-plugin
cd .obsidian/plugins/image-ocr-plugin
# Clone this repo
git clone https://github.com/<your-username>/image-ocr-plugin.git .
# Install dependencies
npm install
# Build the plugin
npm run build       # production
# or for dev mode
npm run dev         # watch + rebuild
```

Then in Obsidian: **Settings → Community Plugins**, disable Safe Mode, find **Image OCR Plugin** and enable it.

## Manual Installation

If you already have a built plugin, copy the following files into your vault:
```
main.js
manifest.json
styles.css
```
into
```
<Your Vault>/.obsidian/plugins/image-ocr-plugin/
```
Then reload Obsidian and enable the plugin.

## Development

- **Node.js v16+**
- `npm run dev`: Build in watch mode
- `npm run build`: Create production bundle

## License

MIT

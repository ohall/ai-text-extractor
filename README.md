# AI Text Extractor for Obsidian

A lightweight Obsidian plugin that uses OpenAI's GPT-4 Vision API to extract text from images with high accuracy.

## Key Features

- 🔍 **High Accuracy**: Uses OpenAI's GPT-4 Vision API for superior text extraction quality
- 🚀 **Simple Interface**: One-click toolbar button for quick access
- 📝 **Direct Integration**: Automatically appends extracted text to your current note
- 🔒 **Privacy**: Processes images locally before sending to API
- 🎯 **Focused Functionality**: Streamlined for image-to-text conversion

## Configuration

1. Create a file named `ai-text-extractor-config.md` in your vault
2. Add your OpenAI API key:
```json
{
  "apiKey": "your-api-key-here",
  "model": "gpt-4-vision-preview"
}
```

## Usage

1. Click the scan icon in the left sidebar
2. Select an image file
3. The extracted text will be automatically appended to your current note

## Requirements

- OpenAI API key
- Internet connection


## Limitations

- Requires OpenAI API key
- Internet connection needed
- Currently supports images only (no PDF or document support)
- API usage may incur costs depending on your OpenAI plan

## License

MIT License

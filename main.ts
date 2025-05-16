import { App, Modal, normalizePath, Notice, Plugin, TFile, Vault } from 'obsidian';
import OpenAI from 'openai';

const CONFIG_FILE = 'ai-text-extractor-config.md';

interface ImageOCRSettings {
 	apiKey: string;
 	model: string;
}

const DEFAULT_SETTINGS: ImageOCRSettings = {
 	apiKey: '',
 	model: 'gpt-4o-mini',
};

export default class ImageOCR extends Plugin {
	settings: ImageOCRSettings;

  async onload() {
		// Wait until the UI and metadata caches are ready
		this.app.workspace.onLayoutReady(async () => {
			await this.loadSettings();		
		});

		this.addCommand({
			id: 'capture-image-extract-text',
			name: 'Capture Image and Extract Text',
			callback: () => {
				new ImageOCRModal(this.app, this).open();
			}
 		});
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS };

		const readFileByName = async (vault: Vault, relativePath: string): Promise<string | null> => {
			const path = normalizePath(relativePath);
			const file = vault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				return await vault.read(file);
			}
			return null;
		};

		try {
			const configContent = await readFileByName(this.app.vault, CONFIG_FILE);
			if (configContent) {
				this.settings = JSON.parse(configContent);
			} else {
				// Create config file with defaults if it doesn't exist
				const defaultConfig = JSON.stringify(DEFAULT_SETTINGS, null, 2);
				await this.app.vault.create(CONFIG_FILE, defaultConfig);
			}
		} catch (error) {
			console.warn('Error loading settings:', error);
			console.warn('Using default settings');
		}
	}

  	async saveSettings() {
 		// No need to save settings as they are read from file
 	}

  	arrayBufferToBase64(buffer: ArrayBuffer): string {
 		let binary = '';
 		const bytes = new Uint8Array(buffer);
 		for (const b of bytes) {
 			binary += String.fromCharCode(b);
 		}
 		return btoa(binary);
 	}

  	/**
 	 * Extracts text from a base64-encoded image using the OpenAI API and saves the result to a file.
 	 */
  	async extractTextFromImage(base64: string) {
 		if (!this.settings.apiKey) {
 			new Notice(`Please set your OpenAI API key in plugin settings ${this.settings}`);
 			return;
 		}
 		new Notice('Extracting text from image...');
 		const openai = new OpenAI({ 
 			apiKey: this.settings.apiKey,
 			dangerouslyAllowBrowser: true 
 		});
 
 		try {
 			const response = await openai.chat.completions.create({
 				model: this.settings.model,
 				messages: [
 					{
 						role: 'user',
 						content: [
 							{
 								type: 'text',
 								text: 'Extract all text from the following image. Provide only the extracted text.'
 							},
 							{
 								type: 'image_url',
 								image_url: {
 									url: `data:image/png;base64,${base64}`
 								}
 							}
 						]
 					}
 				]
 			});
 			const extracted = response.choices?.[0]?.message?.content ?? '';
 			
 			// Get the active file
 			const activeFile = this.app.workspace.getActiveFile();
 			if (!activeFile) {
 				new Notice('No active file found. Please open a file first.');
 				return;
 			}

 			// Read current content
 			const currentContent = await this.app.vault.read(activeFile);
 			
 			// Append the extracted text with a separator
 			const separator = '\n\n---\n\n';
 			const newContent = currentContent + separator + extracted;
 			
 			// Save the updated content
 			await this.app.vault.modify(activeFile, newContent);
 			new Notice('Text extracted and appended to current file');
 		} catch (error: any) {
 			console.error(error);
 			new Notice(`Error extracting text: ${error.message ?? error}`);
 		}
	}
}
class ImageOCRModal extends Modal {
	plugin: ImageOCR;

	constructor(app: App, plugin: ImageOCR) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();

		const container = contentEl.createDiv('image-ocr-container');
		
		// Camera button
		const cameraButton = container.createEl('button', { text: 'Take Photo' });
		cameraButton.addEventListener('click', async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ video: true });
				const video = document.createElement('video');
				video.srcObject = stream;
				await video.play();
				
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				canvas.getContext('2d')?.drawImage(video, 0, 0);
				
				stream.getTracks().forEach(track => track.stop());
				const base64 = canvas.toDataURL('image/png').split(',')[1];
				this.close();
				await this.plugin.extractTextFromImage(base64);
			} catch (error) {
				new Notice('Error accessing camera: ' + error);
			}
		});

		// File picker button
		const fileButton = container.createEl('button', { text: 'Choose File' });
		fileButton.addEventListener('click', async () => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.onchange = async (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (file) {
					const reader = new FileReader();
					reader.onload = async (e) => {
						const base64 = (e.target?.result as string).split(',')[1];
						this.close();
						await this.plugin.extractTextFromImage(base64);
					};
					reader.readAsDataURL(file);
				}
			};
			input.click();
		});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}


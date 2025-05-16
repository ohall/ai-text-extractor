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
		
		// Check if device is mobile
		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
		
		// Camera button - only show on mobile
		if (isMobile) {
			const cameraButton = container.createEl('button', { text: 'Take Photo' });
			cameraButton.addEventListener('click', async () => {
				try {
					console.log('Requesting camera access...');
					const stream = await navigator.mediaDevices.getUserMedia({ 
						video: { 
							facingMode: 'environment', // Use back camera by default
							width: { ideal: 1280 }, // Lower resolution for mobile
							height: { ideal: 720 }
						} 
					});
					console.log('Camera access granted');

					const video = document.createElement('video');
					video.srcObject = stream;
					video.setAttribute('playsinline', ''); // Required for iOS
					video.setAttribute('autoplay', '');
					
					// Wait for video to be ready
					await new Promise((resolve) => {
						video.onloadedmetadata = () => {
							video.play();
							resolve(null);
						};
					});

					console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
					
					const canvas = document.createElement('canvas');
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					
					const context = canvas.getContext('2d');
					if (!context) {
						throw new Error('Could not get canvas context');
					}
					
					context.drawImage(video, 0, 0);
					console.log('Image captured');
					
					// Stop all tracks
					stream.getTracks().forEach(track => {
						track.stop();
						console.log('Stopped track:', track.kind);
					});
					
					const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]; // Use JPEG with compression for mobile
					this.close();
					await this.plugin.extractTextFromImage(base64);
				} catch (error: any) {
					console.error('Camera error:', error);
					new Notice(`Camera error: ${error.message || error}`);
				}
			});
		}

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


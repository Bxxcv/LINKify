export class UploadService {
  constructor(cloudinaryConfig) {
    this.config = cloudinaryConfig;
  }

  validate(file) {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];

    if (!allowed.includes(file.type)) {
      throw new Error('Unsupported file type');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large');
    }

    return true;
  }

  async upload(file) {
    this.validate(file);

    return {
      success: true,
      file
    };
  }
}